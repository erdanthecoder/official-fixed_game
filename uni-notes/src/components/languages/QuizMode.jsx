import { useMemo, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import { useT } from '../../i18n/index.jsx';

/** Fisher–Yates, so option order isn't predictable. */
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQuestions(cards) {
  return shuffle(cards).map((card) => {
    const distractors = shuffle(cards.filter((other) => other.id !== card.id))
      .slice(0, 3)
      .map((other) => other.back);
    return {
      card,
      options: shuffle([card.back, ...distractors]),
    };
  });
}

/** Multiple-choice self-test over a deck. Four options, drawn from the deck itself. */
export default function QuizMode({ deck }) {
  const { t } = useT();
  const cards = deck.cards ?? [];

  const [questions, setQuestions] = useState(() => buildQuestions(cards));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correct, setCorrect] = useState(0);

  const question = questions[index];
  const finished = index >= questions.length;

  const restart = () => {
    setQuestions(buildQuestions(cards));
    setIndex(0);
    setPicked(null);
    setCorrect(0);
  };

  const total = useMemo(() => questions.length, [questions]);

  if (cards.length < 4) {
    return <EmptyState icon="quiz" title={t('languages.needFourCards')} />;
  }

  if (finished) {
    return (
      <div className="trainer-done">
        <Icon name={correct === total ? 'target' : 'circleCheck'} size={34} className="done-icon" />
        <h2>{t('languages.quizDone', { correct, total })}</h2>
        <button type="button" className="button primary" onClick={restart}>
          {t('languages.studyAgain')}
        </button>
      </div>
    );
  }

  const answer = (option) => {
    if (picked !== null) return;
    setPicked(option);
    if (option === question.card.back) setCorrect((count) => count + 1);
  };

  const next = () => {
    setPicked(null);
    setIndex((current) => current + 1);
  };

  return (
    <div className="quiz">
      <div className="quiz-head">
        <p className="quiz-count">
          {index + 1} / {total}
        </p>
        <p className="quiz-score">{t('languages.quizScore', { correct, total })}</p>
      </div>

      <p className="quiz-question-label">{t('languages.quizQuestion')}</p>
      <p className="quiz-term">{question.card.front}</p>

      <div className="quiz-options">
        {question.options.map((option) => {
          const isAnswer = option === question.card.back;
          const state =
            picked === null ? '' : isAnswer ? 'is-correct' : option === picked ? 'is-wrong' : '';
          return (
            <button
              key={option}
              type="button"
              className={`quiz-option ${state}`}
              onClick={() => answer(option)}
              disabled={picked !== null}
            >
              {option}
            </button>
          );
        })}
      </div>

      {picked !== null ? (
        <div className="quiz-feedback">
          <p className={picked === question.card.back ? 'is-correct' : 'is-wrong'}>
            {picked === question.card.back ? t('languages.correct') : t('languages.incorrect')}
          </p>
          {picked !== question.card.back ? (
            <p className="quiz-answer">{t('languages.answerWas', { answer: question.card.back })}</p>
          ) : null}
          <button type="button" className="button primary" onClick={next}>
            {t('common.next')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
