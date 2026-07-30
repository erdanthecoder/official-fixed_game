import { useMemo, useState } from 'react';
import { isDue, reviewCard } from '../../lib/templates/vocab.js';
import { useT } from '../../i18n/index.jsx';

const GRADES = [
  { id: 'again', labelKey: 'languages.again', className: 'again' },
  { id: 'hard', labelKey: 'languages.hard', className: 'hard' },
  { id: 'good', labelKey: 'languages.good', className: 'good' },
  { id: 'easy', labelKey: 'languages.easy', className: 'easy' },
];

/**
 * Flashcard review session.
 *
 * The queue is fixed when the session starts (cards due now, or everything if
 * nothing is due) so a card graded "again" comes back at the end of this
 * session rather than immediately looping forever.
 */
export default function FlashcardTrainer({ deck, onGrade }) {
  const { t } = useT();

  const [queue, setQueue] = useState(() => {
    const cards = deck.cards ?? [];
    const due = cards.filter((card) => isDue(card));
    return (due.length > 0 ? due : cards).map((card) => card.id);
  });
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const cardsById = useMemo(
    () => new Map((deck.cards ?? []).map((card) => [card.id, card])),
    [deck.cards],
  );

  const currentId = queue[0];
  const card = currentId ? cardsById.get(currentId) : null;

  const restart = () => {
    const cards = deck.cards ?? [];
    const due = cards.filter((c) => isDue(c));
    setQueue((due.length > 0 ? due : cards).map((c) => c.id));
    setRevealed(false);
    setReviewed(0);
  };

  if (!card) {
    return (
      <div className="trainer-done">
        <p className="empty-emoji" aria-hidden="true">
          🎉
        </p>
        <h2>{t('languages.sessionDone')}</h2>
        <p>{t('languages.sessionSummary', { count: reviewed })}</p>
        <button type="button" className="button primary" onClick={restart}>
          {t('languages.studyAgain')}
        </button>
      </div>
    );
  }

  const grade = (gradeId) => {
    onGrade(reviewCard(card, gradeId));
    setReviewed((count) => count + 1);
    setRevealed(false);
    setQueue((current) => {
      const [head, ...rest] = current;
      // "Again" sends the card to the back of this session's queue.
      return gradeId === 'again' ? [...rest, head] : rest;
    });
  };

  return (
    <div className="trainer">
      <p className="trainer-progress">
        {queue.length} · {t('languages.cards', { count: queue.length })}
      </p>

      <button
        type="button"
        className={`flashcard ${revealed ? 'is-revealed' : ''}`}
        onClick={() => setRevealed(true)}
        aria-live="polite"
      >
        <span className="flashcard-front">{card.front}</span>
        {revealed ? (
          <>
            <span className="flashcard-divider" aria-hidden="true" />
            <span className="flashcard-back">{card.back}</span>
            {card.example ? <span className="flashcard-example">{card.example}</span> : null}
          </>
        ) : (
          <span className="flashcard-hint">{t('languages.showAnswer')}</span>
        )}
      </button>

      {revealed ? (
        <div className="grade-row">
          {GRADES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`grade-button ${option.className}`}
              onClick={() => grade(option.id)}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="button primary reveal" onClick={() => setRevealed(true)}>
          {t('languages.showAnswer')}
        </button>
      )}
    </div>
  );
}
