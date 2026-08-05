/**
 * What a document is, and who may do what to it.
 *
 * Notes, sheets, decks and vocab sets are *shareable*: they live in one
 * top-level collection so two accounts can hold the same document. Folders,
 * AI chats and preferences are personal and stay under the owner's uid — a
 * shared folder tree and a shared chat history are not things anyone asked for,
 * and keeping them private keeps the security rules simple.
 */

/** UI collection name → the `kind` stored on the document. */
export const SHARED_KINDS = {
  notes: 'note',
  sheets: 'sheet',
  presentations: 'deck',
  decks: 'vocab',
  boards: 'board',
  plans: 'plan',
  shortlists: 'shortlist',
};

/** Reverse of the above, for splitting one query result into per-module lists. */
export const KIND_TO_COLLECTION = Object.fromEntries(
  Object.entries(SHARED_KINDS).map(([collection, kind]) => [kind, collection]),
);

export const PRIVATE_COLLECTIONS = ['folders'];

export const ALL_COLLECTIONS = [...Object.keys(SHARED_KINDS), ...PRIVATE_COLLECTIONS];

export function isShared(collection) {
  return collection in SHARED_KINDS;
}

export const ROLE = {
  owner: 'owner',
  editor: 'editor',
  viewer: 'viewer',
};

/** Which module a document belongs to, e.g. 'note' → 'notes'. */
export function collectionOf(document) {
  return KIND_TO_COLLECTION[document?.kind] ?? null;
}

export function roleOf(document, uid) {
  if (!document || !uid) return null;
  if (document.ownerUid === uid) return ROLE.owner;
  return document.roles?.[uid] ?? null;
}

export function canEdit(document, uid) {
  // A document with no owner is local-mode data: the only user can edit it.
  if (!document?.ownerUid) return true;
  const role = roleOf(document, uid);
  return role === ROLE.owner || role === ROLE.editor;
}

export function canShare(document, uid) {
  return !document?.ownerUid || roleOf(document, uid) === ROLE.owner;
}

export function isSharedWithOthers(document) {
  return (document?.memberUids?.length ?? 0) > 1;
}

/** The display title, whichever field this kind of document keeps it in. */
export function titleOf(document, fallback = 'Untitled') {
  return document?.title || document?.name || fallback;
}

/** Ownership fields stamped onto every new shareable document. */
export function ownershipFor(user) {
  if (!user?.uid) return {};
  return {
    ownerUid: user.uid,
    memberUids: [user.uid],
    roles: { [user.uid]: ROLE.owner },
    members: {
      [user.uid]: {
        role: ROLE.owner,
        email: user.email ?? '',
        name: user.name ?? '',
      },
    },
  };
}
