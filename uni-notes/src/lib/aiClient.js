/**
 * Client side of Uni AI.
 *
 * Calls the `askUniAi` callable function, which holds the API key. The browser
 * never sees a key, and Firebase attaches the user's ID token automatically so
 * the function knows who is asking.
 */

import { httpsCallable } from 'firebase/functions';
import { functions, isFirebaseConfigured } from './firebase.js';

export const AI_ERROR = {
  notConfigured: 'not-configured',
  needSignIn: 'need-sign-in',
  rateLimited: 'rate-limited',
  failed: 'failed',
};

export const isAiAvailable = isFirebaseConfigured;

/** How much of the conversation to send. Keeps requests bounded and cheap. */
const MAX_HISTORY = 20;

export async function askUniAi(messages) {
  if (!isFirebaseConfigured || !functions) {
    throw Object.assign(new Error('Uni AI is not configured.'), { code: AI_ERROR.notConfigured });
  }

  const trimmed = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-MAX_HISTORY)
    .map((message) => ({ role: message.role, content: message.content }));

  try {
    const call = httpsCallable(functions, 'askUniAi', { timeout: 120000 });
    const result = await call({ messages: trimmed });
    return result.data;
  } catch (error) {
    const code = mapErrorCode(error);
    throw Object.assign(new Error(error?.message ?? 'Uni AI failed.'), { code });
  }
}

function mapErrorCode(error) {
  switch (error?.code) {
    case 'functions/unauthenticated':
      return AI_ERROR.needSignIn;
    case 'functions/resource-exhausted':
      return AI_ERROR.rateLimited;
    case 'functions/failed-precondition':
      return AI_ERROR.notConfigured;
    // A function that was never deployed comes back as not-found.
    case 'functions/not-found':
      return AI_ERROR.notConfigured;
    default:
      return AI_ERROR.failed;
  }
}
