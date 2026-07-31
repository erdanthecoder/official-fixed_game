import { useEffect, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import Modal from '../ui/Modal.jsx';
import {
  SHARE_ERROR,
  isSharingAvailable,
  listInvites,
  revokeAccess,
  shareDocument,
  updateMemberRole,
} from '../../lib/sharing.js';
import { ROLE, titleOf } from '../../lib/model.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useT } from '../../i18n/index.jsx';

const ERROR_KEYS = {
  [SHARE_ERROR.notConfigured]: 'share.errorNotSetUp',
  [SHARE_ERROR.needSignIn]: 'share.errorSignIn',
  [SHARE_ERROR.notFound]: 'share.errorNoAccount',
  [SHARE_ERROR.notOwner]: 'share.errorNotOwner',
  [SHARE_ERROR.self]: 'share.errorSelf',
  [SHARE_ERROR.invalidEmail]: 'share.errorEmail',
  [SHARE_ERROR.failed]: 'share.errorFailed',
};

function initialOf(text) {
  return (text ?? '?').trim().charAt(0).toUpperCase() || '?';
}

/**
 * Who can open this document, and what they can do with it.
 *
 * Every change here goes through a Cloud Function — the client can't resolve an
 * email to an account, and shouldn't be able to write someone else's access.
 */
export default function ShareDialog({ document: doc, onClose }) {
  const { t } = useT();
  const { uid } = useAuth();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLE.editor);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const [noticeKey, setNoticeKey] = useState(null);
  const [noticeValue, setNoticeValue] = useState('');
  const [invites, setInvites] = useState([]);

  const isOwner = doc.ownerUid === uid || !doc.ownerUid;
  const members = Object.entries(doc.members ?? {});

  // Pending invitations live server-side; fetch them when the dialog opens.
  useEffect(() => {
    if (!isSharingAvailable || !isOwner) return;
    let live = true;
    listInvites({ docId: doc.id })
      .then((result) => {
        if (live) setInvites(result.invites ?? []);
      })
      .catch(() => {
        // Not deployed yet, most likely. The invite form reports that clearly
        // when it's actually used, so stay quiet here.
      });
    return () => {
      live = false;
    };
  }, [doc.id, isOwner]);

  const report = (error) => setErrorKey(ERROR_KEYS[error?.code] ?? 'share.errorFailed');

  const invite = async (event) => {
    event.preventDefault();
    setErrorKey(null);
    setNoticeKey(null);
    if (!email.trim()) return;

    setBusy(true);
    try {
      const result = await shareDocument({ docId: doc.id, email, role });
      setEmail('');
      if (result.status === 'invited') {
        setInvites((current) => [...current, { email: result.email, role }]);
        setNoticeKey('share.invited');
        setNoticeValue(result.email);
      } else if (result.status === 'already-a-member') {
        setNoticeKey('share.alreadyMember');
        setNoticeValue(result.email);
      } else {
        setNoticeKey('share.added');
        setNoticeValue(result.name || result.email);
      }
    } catch (error) {
      report(error);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (memberUid, nextRole) => {
    setErrorKey(null);
    try {
      await updateMemberRole({ docId: doc.id, memberUid, role: nextRole });
    } catch (error) {
      report(error);
    }
  };

  const remove = async (memberUid) => {
    setErrorKey(null);
    try {
      await revokeAccess({ docId: doc.id, memberUid });
    } catch (error) {
      report(error);
    }
  };

  const withdraw = async (address) => {
    setErrorKey(null);
    try {
      await revokeAccess({ docId: doc.id, email: address });
      setInvites((current) => current.filter((item) => item.email !== address));
    } catch (error) {
      report(error);
    }
  };

  return (
    <Modal
      title={`${t('share.title')} — ${titleOf(doc, t('common.untitled'))}`}
      onClose={onClose}
      width={520}
      footer={
        <button type="button" className="button primary" onClick={onClose}>
          {t('common.done')}
        </button>
      }
    >
      {!isSharingAvailable ? (
        <p className="share-unavailable">{t('share.localOnly')}</p>
      ) : (
        <>
          {isOwner ? (
            <form className="share-invite" onSubmit={invite}>
              <label className="field">
                <span>{t('share.inviteLabel')}</span>
                <div className="share-invite-row">
                  <input
                    type="email"
                    value={email}
                    placeholder="classmate@example.com"
                    inputMode="email"
                    autoComplete="off"
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <select value={role} onChange={(event) => setRole(event.target.value)}>
                    <option value={ROLE.editor}>{t('share.roleEditor')}</option>
                    <option value={ROLE.viewer}>{t('share.roleViewer')}</option>
                  </select>
                  <button type="submit" className="button primary" disabled={busy}>
                    {busy ? t('share.sending') : t('share.send')}
                  </button>
                </div>
              </label>
              <p className="share-hint">{t('share.inviteHint')}</p>
            </form>
          ) : (
            <p className="share-hint">{t('share.notOwnerHint')}</p>
          )}

          {errorKey ? (
            <p className="share-error" role="alert">
              {t(errorKey)}
            </p>
          ) : null}
          {noticeKey ? <p className="share-notice">{t(noticeKey, { who: noticeValue })}</p> : null}

          <h3 className="share-section">{t('share.peopleWithAccess')}</h3>
          <ul className="share-members">
            {members.length === 0 ? (
              <li className="share-empty">{t('share.justYou')}</li>
            ) : (
              members.map(([memberUid, member]) => (
                <li key={memberUid}>
                  <span className="share-avatar">{initialOf(member.name || member.email)}</span>
                  <span className="share-who">
                    <strong>
                      {member.name || member.email}
                      {memberUid === uid ? ` ${t('share.you')}` : ''}
                    </strong>
                    <small>{member.email}</small>
                  </span>

                  {member.role === ROLE.owner ? (
                    <span className="share-role-fixed">{t('share.roleOwner')}</span>
                  ) : isOwner ? (
                    <>
                      <select
                        className="share-role"
                        value={member.role}
                        onChange={(event) => changeRole(memberUid, event.target.value)}
                      >
                        <option value={ROLE.editor}>{t('share.roleEditor')}</option>
                        <option value={ROLE.viewer}>{t('share.roleViewer')}</option>
                      </select>
                      <button
                        type="button"
                        className="icon-button small"
                        title={t('share.remove')}
                        aria-label={`${t('share.remove')} — ${member.email}`}
                        onClick={() => remove(memberUid)}
                      >
                        <Icon name="close" size={15} />
                      </button>
                    </>
                  ) : (
                    <span className="share-role-fixed">
                      {member.role === ROLE.viewer ? t('share.roleViewer') : t('share.roleEditor')}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>

          {invites.length > 0 ? (
            <>
              <h3 className="share-section">{t('share.pending')}</h3>
              <ul className="share-members">
                {invites.map((item) => (
                  <li key={item.email}>
                    <span className="share-avatar is-pending">
                      <Icon name="inbox" size={16} />
                    </span>
                    <span className="share-who">
                      <strong>{item.email}</strong>
                      <small>{t('share.pendingHint')}</small>
                    </span>
                    <span className="share-role-fixed">
                      {item.role === ROLE.viewer ? t('share.roleViewer') : t('share.roleEditor')}
                    </span>
                    <button
                      type="button"
                      className="icon-button small"
                      title={t('share.withdraw')}
                      aria-label={`${t('share.withdraw')} — ${item.email}`}
                      onClick={() => withdraw(item.email)}
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </Modal>
  );
}
