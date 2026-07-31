/**
 * The Firebase Admin app, initialised exactly once.
 *
 * Both function files import `db` from here rather than calling
 * `initializeApp()` themselves. That matters because ES module imports are
 * hoisted: a file that calls `getFirestore()` at module scope runs before the
 * importing file's own statements, so initialising in index.js and importing
 * sharing.js from it would throw "default Firebase app does not exist". Making
 * initialisation a dependency puts it first, deterministically.
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

export const db = getFirestore();
