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
import { areLinksAvailable, createInviteLink, linkOn, revokeInviteLink } from '../../lib/inviteLinks.js';
import { ROLE, titleOf } from '../../lib/model.js';
import { assignColours } from '../../lib/presence.js';
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
 * Two ways in, and they are not interchangeable.
 *
 * By email is precise — it names an account, so access can be granted before
 * that person has even signed up. It needs a Cloud Function, because turning an
 * address into an account id needs privileges the browser must never hold, and
 * Cloud Functions need a billing plan.
 *
 * By link is immediate and needs no server at all: the code is the credential,
 * and the security rules check it. It is also weaker by construction — whoever
 * holds the link can use it — so the dialog says that plainly rather than
 * letting someone assume otherwise.
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
  const [link, setLink] = useState(() => linkOn(doc));
  const [linkRole, setLinkRole] = useState(doc.joinRole || ROLE.editor);
  const [linkBusy, setLinkBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = doc.ownerUid === uid || !doc.ownerUid;
  const members = Object.entries(doc.members ?? {});
  const colours = assignColours(members.map(([memberUid]) => memberUid));

  // Invitations live on the document itself now, so this re-reads rather than
  // re-fetches, and stays correct when someone accepts while the dialog is open.
  useEffect(() => {
    if (!isSharingAvailable || !isOwner) return undefined;
    let live = true;
    listInvites({ document: doc })
      .then((result) => {
        if (live) setInvites(result.invites ?? []);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [doc, isOwner]);

  const report = (error) => setErrorKey(ERROR_KEYS[error?.code] ?? 'share.errorFailed');

  const makeLink = async () => {
    setErrorKey(null);
    setLinkBusy(true);
    try {
      const created = await createInviteLink({
        docId: doc.id,
        ownerUid: uid,
        role: linkRole,
        previousCode: link?.code ?? null,
      });
      setLink({ ...created, expired: false });
    } catch {
      setErrorKey('share.errorLink');
    } finally {
      setLinkBusy(false);
    }
  };

  const dropLink = async () => {
    setErrorKey(null);
    setLinkBusy(true);
    try {
      await revokeInviteLink({ docId: doc.id, code: link?.code });
      setLink(null);
    } catch {
      setErrorKey('share.errorLink');
    } finally {
      setLinkBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
    } catch {
      // Clipboard access can be refused (insecure origin, or a browser that
      // wants a user gesture it didn't see). The input is selectable, so
      // there's still a way through — just don't claim success.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

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
            <form className="share-invite share-card" onSubmit={invite}>
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
                  <select
                    className="share-role"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                  >
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

          {isOwner && areLinksAvailable ? (
            <section className="share-link share-card">
              <h3 className="share-section">{t('share.linkTitle')}</h3>

              {link && !link.expired ? (
                <>
                  <div className="share-link-row">
                    <input
                      readOnly
                      value={link.url}
                      aria-label={t('share.linkTitle')}
                      onFocus={(event) => event.target.select()}
                    />
                    <button type="button" className="button ghost" onClick={copy}>
                      <Icon name={copied ? 'check' : 'copy'} size={15} />
                      {copied ? t('share.copied') : t('common.copy')}
                    </button>
                  </div>
                  <p className="share-hint">
                    {t(
                      link.role === ROLE.viewer ? 'share.linkHintViewer' : 'share.linkHintEditor',
                    )}
                  </p>
                  <div className="share-link-actions">
                    <button
                      type="button"
                      className="link-button"
                      onClick={makeLink}
                      disabled={linkBusy}
                    >
                      {t('share.linkNew')}
                    </button>
                    <button
                      type="button"
                      className="link-button is-danger"
                      onClick={dropLink}
                      disabled={linkBusy}
                    >
                      {t('share.linkRevoke')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="share-link-row">
                  <select
                    className="share-role"
                    value={linkRole}
                    onChange={(event) => setLinkRole(event.target.value)}
                  >
                    <option value={ROLE.editor}>{t('share.roleEditor')}</option>
                    <option value={ROLE.viewer}>{t('share.roleViewer')}</option>
                  </select>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={makeLink}
                    disabled={linkBusy}
                  >
                    <Icon name="link" size={15} />
                    {link?.expired ? t('share.linkRenew') : t('share.linkCreate')}
                  </button>
                </div>
              )}
            </section>
          ) : null}

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
                  <span className="share-avatar" style={{ '--face': colours.get(memberUid) }}>
                    {initialOf(member.name || member.email)}
                  </span>
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
              <p className="share-hint">{t('share.pendingHint')}</p>
              <ul className="share-members">
                {invites.map((item) => (
                  <li key={item.email}>
                    <span className="share-avatar is-pending">
                      <Icon name="inbox" size={16} />
                    </span>
                    <span className="share-who">
                      <strong>{item.email}</strong>
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
