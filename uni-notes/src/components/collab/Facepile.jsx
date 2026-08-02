/**
 * The people bar that sits in every editor header.
 *
 * Two facts, shown as one object, because they answer the same question — who
 * is this document with?
 *
 *   · everyone who has access, from the document itself, costing nothing;
 *   · who is looking at it this second, from lib/presence.js.
 *
 * Someone present gets their colour and a ring; someone merely invited is
 * drawn flat and quiet. When a second person is in the document the bar says
 * so in words, because a ring is a subtlety and "2 here now" is not.
 *
 * It is always visible, even alone. Google Docs hides its facepile until a
 * second person arrives, which is tidy and means most people never learn the
 * feature exists. Showing your own face is how the next person understands
 * what will happen when they press Share.
 */

import { useEffect, useState } from 'react';
import { assignColours, initialOf, joinDocument } from '../../lib/presence.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useT } from '../../i18n/index.jsx';

/** How many faces before the rest become "+3". */
const MAX_FACES = 4;

export default function Facepile({ document: doc, onShare }) {
  const { t } = useT();
  const { user, uid } = useAuth();
  const [live, setLive] = useState([]);

  useEffect(() => {
    if (!doc?.id || !uid) return undefined;
    return joinDocument(doc.id, { uid, name: user?.name ?? user?.email ?? '' }, setLive);
  }, [doc?.id, uid, user?.name, user?.email]);

  if (!doc) return null;

  const liveUids = new Set(live.map((row) => row.uid));

  /*
   * Everyone with access, present first. A person can be live without being in
   * `members` for one moment — they joined by link and the document snapshot
   * has not arrived yet — so the live rows are merged in rather than filtered
   * against membership.
   */
  const byUid = new Map();
  for (const [memberUid, member] of Object.entries(doc.members ?? {})) {
    byUid.set(memberUid, {
      uid: memberUid,
      name: member.name || member.email || '',
      role: member.role,
    });
  }
  for (const row of live) {
    const existing = byUid.get(row.uid);
    byUid.set(row.uid, { uid: row.uid, name: existing?.name || row.name || '', role: existing?.role });
  }
  if (uid && !byUid.has(uid)) {
    byUid.set(uid, { uid, name: user?.name ?? user?.email ?? '' });
  }

  const people = [...byUid.values()].sort((a, b) => {
    if (a.uid === uid) return -1;
    if (b.uid === uid) return 1;
    const aLive = liveUids.has(a.uid);
    const bLive = liveUids.has(b.uid);
    if (aLive !== bLive) return aLive ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Signed out — a local-only document has no people, and an empty pill in the
  // header would be a control that says nothing.
  if (!people.length) return null;

  const colours = assignColours(people.map((person) => person.uid));
  const shown = people.slice(0, MAX_FACES);
  const extra = people.length - shown.length;
  const others = live.filter((row) => row.uid !== uid).length;

  return (
    <button
      type="button"
      className={`facepile${others ? ' has-others' : ''}`}
      onClick={onShare}
      title={t('collab.manageAccess')}
      aria-label={
        others
          ? t('collab.hereNow', { count: others + 1 })
          : t('collab.people', { count: people.length })
      }
    >
      <span className="facepile-faces" aria-hidden="true">
        {shown.map((person) => {
          const here = liveUids.has(person.uid);
          return (
            <span
              key={person.uid}
              className={`face${here ? ' is-here' : ''}`}
              style={{ '--face': colours.get(person.uid) }}
              title={person.name || t('common.untitled')}
            >
              {initialOf(person.name)}
            </span>
          );
        })}
        {extra > 0 ? <span className="face is-more">+{extra}</span> : null}
      </span>
      {others ? <span className="facepile-label">{t('collab.hereNow', { count: others + 1 })}</span> : null}
    </button>
  );
}
