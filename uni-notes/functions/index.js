/**
 * Cloud Functions for Uni.
 *
 * Only the sharing functions live here now — the ones that need to look at a
 * document the caller does not own yet, or at an account that may not exist,
 * which is exactly the work Firestore rules cannot do from the browser.
 *
 * Sharing by invite link needs none of this and works on the free plan. These
 * four are only for inviting someone by their email address.
 *
 * Deploying them is a button: Actions -> "Deploy Cloud Functions" -> Run
 * workflow. Setup notes are at the top of .github/workflows/functions.yml.
 */

export { claimInvites, listInvites, revokeAccess, shareDocument } from './sharing.js';
