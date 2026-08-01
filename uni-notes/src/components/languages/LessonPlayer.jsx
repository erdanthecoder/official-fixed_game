/**
 * One lesson: five exercises, hearts, and a result screen.
 *
 * The rule the whole screen is built around: **you never move on from something
 * you got wrong.** A wrong answer shows the right one, costs a heart, and puts
 * the exercise back at the end of the queue. Getting it right the second time
 * still counts as wrong for scoring, but you leave having seen it correctly at
 * least once — which is the only version of this that teaches anything.
 *
 * Progress is written once, at the end. Writing per exercise would be five
 * round trips for thirty seconds of work, and a lesson abandoned halfway is not
 * a lesson.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { MAX_HEARTS, buildLesson, checkTyped } from '../../lib/course.js';
import { useT } from '../../i18n/index.jsx';

function Hearts({ count }) {
  return (
    <span className="lesson-hearts" aria-label={`${count} hearts`}>
      {Array.from({ length: MAX_HEARTS }, (_, i) => (
        <Icon
          key={i}
          name="heart"
          size={17}
          className={i < count ? 'heart is-full' : 'heart is-spent'}
        />
      ))}
    </span>
  );
}

export default function LessonPlayer({ deck, lesson, hearts, onLoseHeart, onFinish, onQuit }) {
  const { t } = useT();

  // Built once. Rebuilding on re-render would reshuffle the options underneath
  // whoever is mid-answer.
  const exercises = useMemo(
    () => buildLesson({ cards: lesson.cards, pool: deck.cards ?? [] }),
    [lesson, deck.cards],
  );

  const [queue, setQueue] = useState(exercises);
  const [at, setAt] = useState(0);
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState(null);
  const [verdict, setVerdict] = useState(null); // null | 'right' | 'wrong'
  const [wrongIds, setWrongIds] = useState(() => new Set());
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  const current = queue[at];
  const total = exercises.length;
  const correct = total - wrongIds.size;

  useEffect(() => {
    if (current?.kind === 'type') inputRef.current?.focus();
  }, [current]);

  const answer = useCallback(
    (given) => {
      if (verdict || !current) return;

      const right =
        current.kind === 'type' ? checkTyped(given, current.answer) : given === current.answer;

      setPicked(given);
      setVerdict(right ? 'right' : 'wrong');

      if (!right) {
        setWrongIds((set) => new Set(set).add(current.id));
        onLoseHeart();
      }
    },
    [verdict, current, onLoseHeart],
  );

  const next = useCallback(() => {
    const wasWrong = verdict === 'wrong';
    setVerdict(null);
    setPicked(null);
    setTyped('');

    // Wrong answers come back at the end, so nothing is left unseen.
    const rest = wasWrong ? [...queue, current] : queue;
    if (at + 1 >= rest.length) {
      setDone(true);
      return;
    }
    setQueue(rest);
    setAt(at + 1);
  }, [verdict, queue, current, at]);

  // Enter submits, then advances. Two taps for a whole exercise.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Enter') return;
      if (done) return;
      event.preventDefault();
      if (verdict) next();
      else if (current?.kind === 'type' && typed.trim()) answer(typed);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [verdict, next, current, typed, answer, done]);

  if (hearts <= 0 && !done) {
    return (
      <div className="lesson-page">
        <div className="lesson-out">
          <Icon name="heart" size={44} className="heart is-spent" />
          <h1>{t('course.outOfHearts')}</h1>
          <p>{t('course.outOfHeartsBody')}</p>
          <button type="button" className="button primary" onClick={onQuit}>
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    const perfect = wrongIds.size === 0;
    return (
      <div className="lesson-page">
        <div className={`lesson-result ${perfect ? 'is-perfect' : ''}`}>
          <Icon name={perfect ? 'trophy' : 'circleCheck'} size={52} />
          <h1>{perfect ? t('course.perfect') : t('course.lessonDone')}</h1>
          <p className="lesson-score">
            {t('course.gotRight', { correct, total })}
          </p>
          <button
            type="button"
            className="button primary big"
            onClick={() => onFinish({ correct, total })}
          >
            {t('course.continue')}
          </button>
        </div>
      </div>
    );
  }

  const progress = Math.round((at / queue.length) * 100);

  return (
    <div className="lesson-page">
      <header className="lesson-top">
        <button
          type="button"
          className="icon-button"
          onClick={onQuit}
          aria-label={t('common.close')}
        >
          <Icon name="close" size={20} />
        </button>
        <div className="lesson-bar" role="progressbar" aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <Hearts count={hearts} />
      </header>

      <div className="lesson-body">
        <p className="lesson-kind">{t(`course.kind_${current.kind}`)}</p>
        <h1 className="lesson-prompt">{current.prompt}</h1>

        {current.kind === 'type' ? (
          <input
            ref={inputRef}
            className="lesson-input"
            value={typed}
            readOnly={Boolean(verdict)}
            placeholder={t('course.typePlaceholder')}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            onChange={(event) => setTyped(event.target.value)}
          />
        ) : (
          <div className="lesson-options">
            {current.options.map((option) => (
              <button
                key={option}
                type="button"
                className={`lesson-option ${
                  verdict && option === current.answer
                    ? 'is-right'
                    : verdict && option === picked
                      ? 'is-wrong'
                      : ''
                }`}
                disabled={Boolean(verdict)}
                onClick={() => answer(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      <footer className={`lesson-foot ${verdict ? `is-${verdict}` : ''}`}>
        {verdict ? (
          <div className="lesson-verdict">
            <Icon name={verdict === 'right' ? 'circleCheck' : 'warning'} size={22} />
            <div>
              <strong>{verdict === 'right' ? t('course.right') : t('course.wrong')}</strong>
              {verdict === 'wrong' ? <small>{current.answer}</small> : null}
              {current.card.example ? <em>{current.card.example}</em> : null}
            </div>
            <button type="button" className="button primary" onClick={next}>
              {t('course.continue')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="button primary block"
            disabled={current.kind === 'type' && !typed.trim()}
            onClick={() => current.kind === 'type' && answer(typed)}
          >
            {t('course.check')}
          </button>
        )}
      </footer>
    </div>
  );
}
