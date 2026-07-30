import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import Scenery from '../Scenery.jsx';
import { AI_ERROR, askUniAi, isAiAvailable } from '../../lib/aiClient.js';
import { formatRelativeDate } from '../../lib/text.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

const PRESETS = [
  { id: 'brainstorm', icon: '💡', labelKey: 'ai.presetBrainstorm', promptKey: 'ai.presetBrainstormPrompt' },
  { id: 'improve', icon: '✍️', labelKey: 'ai.presetImprove', promptKey: 'ai.presetImprovePrompt' },
  { id: 'explain', icon: '📖', labelKey: 'ai.presetExplain', promptKey: 'ai.presetExplainPrompt' },
  { id: 'compare', icon: '⚖️', labelKey: 'ai.presetCompare', promptKey: 'ai.presetComparePrompt' },
  { id: 'quiz', icon: '🎴', labelKey: 'ai.presetQuiz', promptKey: 'ai.presetQuizPrompt' },
];

/** Turn the first user message into a chat title for the history list. */
function titleFor(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || 'Chat';
}

export default function AiWorkspace({ chatId, onOpenChat }) {
  const { t } = useT();
  const { chats, create, update, remove } = useData();
  const { user, isCloud, isFirebaseConfigured } = useAuth();

  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const inputRef = useRef(null);
  const transcriptRef = useRef(null);

  const chat = chats.find((item) => item.id === chatId) ?? null;
  const messages = useMemo(() => chat?.messages ?? [], [chat]);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    const node = transcriptRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, pending]);

  const canUse = isAiAvailable && (isCloud || !isFirebaseConfigured);

  const send = useCallback(
    async (text) => {
      const content = text.trim();
      if (!content || pending) return;

      setError(null);
      setDraft('');

      const userMessage = { role: 'user', content, at: Date.now() };
      let targetId = chatId;

      // A brand-new conversation gets its own document, named after the question.
      if (!chat) {
        const created = create(
          'chats',
          { title: titleFor(content), messages: [userMessage] },
          { idPrefix: 'chat' },
        );
        targetId = created.id;
        onOpenChat(created.id);
      } else {
        update('chats', chatId, { messages: [...messages, userMessage] }, { immediate: true });
      }

      const history = chat ? [...messages, userMessage] : [userMessage];

      setPending(true);
      try {
        const result = await askUniAi(history);
        update(
          'chats',
          targetId,
          {
            messages: [
              ...history,
              { role: 'assistant', content: result.text, at: Date.now(), refused: result.refused },
            ],
          },
          { immediate: true },
        );
      } catch (requestError) {
        setError(requestError.code ?? AI_ERROR.failed);
        // Put the text back so a failed request doesn't lose what they typed.
        setDraft(content);
        update('chats', targetId, { messages: history }, { immediate: true });
      } finally {
        setPending(false);
        inputRef.current?.focus();
      }
    },
    [chat, chatId, create, messages, onOpenChat, pending, update],
  );

  const startPreset = (preset) => {
    const prompt = t(preset.promptKey);
    // "Explain a term" ends mid-sentence on purpose — let them finish it.
    if (preset.id === 'explain') {
      setDraft(prompt);
      inputRef.current?.focus();
      return;
    }
    send(prompt);
  };

  const errorMessage =
    error === AI_ERROR.rateLimited
      ? t('ai.rateLimited')
      : error === AI_ERROR.needSignIn
        ? t('ai.needSignIn')
        : error === AI_ERROR.notConfigured
          ? t('ai.notConfiguredBody')
          : error
            ? t('ai.error')
            : null;

  return (
    <div className="ai-page">
      <Scenery slot="ai" className="ai-banner">
        <div className="ai-banner-text">
          <h1>{t('ai.title')}</h1>
          <p>{t('ai.subtitle')}</p>
        </div>
        <button
          type="button"
          className="button primary on-scenery"
          onClick={() => onOpenChat('')}
          disabled={!chatId}
        >
          ＋ {t('ai.newChat')}
        </button>
      </Scenery>

      <div className="ai-body">
        <aside className="ai-history" aria-label={t('ai.history')}>
          <p className="sidebar-heading">{t('ai.history')}</p>
          {chats.length === 0 ? (
            <p className="ai-history-empty">{t('common.empty')}</p>
          ) : (
            chats.map((item) => (
              <div key={item.id} className="ai-history-row">
                <button
                  type="button"
                  className={`ai-history-item ${item.id === chatId ? 'is-active' : ''}`}
                  onClick={() => onOpenChat(item.id)}
                >
                  <strong>{item.title}</strong>
                  <small>{formatRelativeDate(item.updatedAt, t)}</small>
                </button>
                <button
                  type="button"
                  className="icon-button small"
                  aria-label={`${t('common.delete')} — ${item.title}`}
                  onClick={() => setDeleting(item)}
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </aside>

        <div className="ai-main">
          {!canUse ? (
            <div className="ai-notice">
              <p className="empty-emoji" aria-hidden="true">
                🔌
              </p>
              <h2>{t('ai.notConfiguredTitle')}</h2>
              <p>{t('ai.notConfiguredBody')}</p>
            </div>
          ) : (
            <>
              <div className="ai-transcript" ref={transcriptRef}>
                {messages.length === 0 ? (
                  <div className="ai-empty">
                    <h2>{t('ai.emptyTitle')}</h2>
                    <p>{t('ai.emptyBody')}</p>
                    <div className="ai-presets" aria-label={t('ai.presetsTitle')}>
                      {PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className="ai-preset"
                          onClick={() => startPreset(preset)}
                        >
                          <span aria-hidden="true">{preset.icon}</span>
                          {t(preset.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <article
                      key={`${message.at}-${index}`}
                      className={`ai-message is-${message.role}`}
                    >
                      <span className="ai-message-who">
                        {message.role === 'user'
                          ? (user?.name ?? t('ai.you'))
                          : t('ai.assistant')}
                      </span>
                      <div className="ai-message-body">
                        {message.content.split('\n').map((line, lineIndex) =>
                          line.trim() === '' ? (
                            <br key={lineIndex} />
                          ) : (
                            <p key={lineIndex}>{line}</p>
                          ),
                        )}
                      </div>
                    </article>
                  ))
                )}

                {pending ? (
                  <article className="ai-message is-assistant is-pending" aria-live="polite">
                    <span className="ai-message-who">{t('ai.assistant')}</span>
                    <div className="ai-message-body">
                      <span className="typing" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      {t('ai.thinking')}
                    </div>
                  </article>
                ) : null}
              </div>

              {errorMessage ? <p className="ai-error">{errorMessage}</p> : null}

              <form
                className="ai-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  send(draft);
                }}
              >
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={draft}
                  placeholder={t('ai.placeholder')}
                  aria-label={t('ai.placeholder')}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter sends; Shift+Enter makes a new line.
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      send(draft);
                    }
                  }}
                />
                <button
                  type="submit"
                  className="button primary"
                  disabled={pending || draft.trim() === ''}
                >
                  {pending ? t('ai.thinking') : t('ai.send')}
                </button>
              </form>

              <p className="ai-disclaimer">{t('ai.disclaimer')}</p>
            </>
          )}
        </div>
      </div>

      {deleting ? (
        <ConfirmDialog
          title={t('ai.deleteChatTitle')}
          message={deleting.title}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            remove('chats', deleting.id);
            if (deleting.id === chatId) onOpenChat('');
          }}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
