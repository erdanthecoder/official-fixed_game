/**
 * Uni AI — Cloud Function proxy to the Claude API.
 *
 * Why a function at all: the API key must never reach the browser. This is a
 * callable function, so Firebase verifies the caller's ID token before our code
 * runs — an unauthenticated request is rejected by the platform, and every
 * request is attributable to a signed-in user.
 *
 * Deploy notes are in FIREBASE_SETUP.md. Short version:
 *   firebase functions:secrets:set ANTHROPIC_API_KEY
 *   firebase deploy --only functions
 */

import Anthropic from '@anthropic-ai/sdk';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './admin.js';

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

/** Model + generation settings. See the note on cost in FIREBASE_SETUP.md. */
const MODEL = 'claude-opus-5';
const MAX_TOKENS = 8000;
const EFFORT = 'medium';

/** Per-user limits — protects the API bill from a stuck loop or a bored teenager. */
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 8;
const MAX_REQUESTS_PER_DAY = 200;

/** Input limits, enforced before we spend a token. */
const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 8000;
const MAX_TOTAL_CHARS = 60000;

const SYSTEM_PROMPT = `You are Uni AI, a study helper inside a university-application workspace used by teenagers (roughly ages 13-17).

How to help:
- Be warm, direct and practical. Short paragraphs. No lecturing.
- Explain your reasoning so they learn the skill, not just the answer.
- For essays: ask about their actual experiences, then help them shape their own words. Give specific feedback on what they wrote. Never write an application essay for them to submit as their own work — say so plainly if asked, then offer to help them draft it themselves.
- For research questions about universities, deadlines, tuition or scholarships: give your best answer, but say clearly when a number or date needs checking on the university's own website. Requirements change every year and getting one wrong is expensive.
- If you don't know, say so.

Keep responses focused and brief unless they ask for depth. When you explain something, lead with the short answer, then the detail.`;

function assertValidMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new HttpsError('invalid-argument', 'A non-empty messages array is required.');
  }
  if (messages.length > MAX_MESSAGES) {
    throw new HttpsError('invalid-argument', `Conversations are limited to ${MAX_MESSAGES} messages.`);
  }

  let totalChars = 0;
  const cleaned = messages.map((message, index) => {
    const role = message?.role;
    const content = message?.content;

    if (role !== 'user' && role !== 'assistant') {
      throw new HttpsError('invalid-argument', `Message ${index} has an unsupported role.`);
    }
    if (typeof content !== 'string' || content.trim() === '') {
      throw new HttpsError('invalid-argument', `Message ${index} has no text.`);
    }
    if (content.length > MAX_CHARS_PER_MESSAGE) {
      throw new HttpsError('invalid-argument', `Message ${index} is too long.`);
    }

    totalChars += content.length;
    return { role, content };
  });

  if (totalChars > MAX_TOTAL_CHARS) {
    throw new HttpsError('invalid-argument', 'This conversation is too long — start a new chat.');
  }
  if (cleaned[cleaned.length - 1].role !== 'user') {
    throw new HttpsError('invalid-argument', 'The last message must come from the user.');
  }
  return cleaned;
}

/**
 * Fixed-window rate limit held in the user's own document.
 *
 * A transaction keeps two tabs from both slipping through on the same window.
 * Fixed windows can allow a short burst across a boundary; that's an accepted
 * trade for something this simple, since the daily cap is the real backstop.
 */
async function enforceRateLimit(uid) {
  const ref = db.doc(`users/${uid}/meta/aiUsage`);
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? snapshot.data() : {};

    const windowStart = data.windowStart ?? 0;
    const inWindow = now - windowStart < WINDOW_MS;
    const windowCount = inWindow ? (data.windowCount ?? 0) : 0;

    if (windowCount >= MAX_REQUESTS_PER_WINDOW) {
      throw new HttpsError('resource-exhausted', 'Too many questions at once — wait a moment.');
    }

    const dayCount = data.day === today ? (data.dayCount ?? 0) : 0;
    if (dayCount >= MAX_REQUESTS_PER_DAY) {
      throw new HttpsError('resource-exhausted', "That's the daily limit for Uni AI. Try again tomorrow.");
    }

    transaction.set(
      ref,
      {
        windowStart: inWindow ? windowStart : now,
        windowCount: windowCount + 1,
        day: today,
        dayCount: dayCount + 1,
        lastRequestAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export const askUniAi = onCall(
  {
    secrets: [ANTHROPIC_API_KEY],
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '512MiB',
    // Keeps one instance warm-ish without paying for idle capacity.
    maxInstances: 10,
    cors: true,
    enforceAppCheck: false,
  },
  async (request) => {
    // Callable functions verify the ID token for us; this catches the
    // unauthenticated case explicitly so the client gets a clear error.
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Sign in to use Uni AI.');
    }

    const uid = request.auth.uid;
    const messages = assertValidMessages(request.data?.messages);

    await enforceRateLimit(uid);

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    let response;
    try {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        output_config: { effort: EFFORT },
        // If safety classifiers decline the request, the API re-runs it on the
        // recommended fallback model instead of failing the call.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages,
      });
    } catch (error) {
      console.error('[uni-ai] Claude API request failed.', {
        uid,
        status: error?.status,
        type: error?.type,
        message: error?.message,
      });

      if (error?.status === 429) {
        throw new HttpsError('resource-exhausted', 'Uni AI is busy right now — try again shortly.');
      }
      if (error?.status === 401 || error?.status === 403) {
        // Almost always a missing or wrong ANTHROPIC_API_KEY secret.
        throw new HttpsError('failed-precondition', 'Uni AI is not configured correctly.');
      }
      throw new HttpsError('internal', 'Uni AI could not answer that. Please try again.');
    }

    // Check the stop reason before touching content — a refused request returns
    // HTTP 200 with empty or partial content.
    if (response.stop_reason === 'refusal') {
      console.warn('[uni-ai] Request declined by safety classifiers.', {
        uid,
        category: response.stop_details?.category ?? null,
      });
      return {
        text: "I can't help with that one. If it's schoolwork, try asking it a different way and I'll have another go.",
        refused: true,
      };
    }

    const text = (response.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    if (!text) {
      throw new HttpsError('internal', 'Uni AI returned an empty answer. Please try again.');
    }

    return {
      text,
      refused: false,
      model: response.model,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  },
);

// Collaboration functions live in their own file; they share this app instance,
// which is why the re-export sits after initializeApp() above.
export { claimInvites, listInvites, revokeAccess, shareDocument } from './sharing.js';
