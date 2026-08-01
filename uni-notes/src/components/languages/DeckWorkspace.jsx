import { useCallback, useMemo, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import CoursePath from './CoursePath.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import FlashcardTrainer from './FlashcardTrainer.jsx';
import LessonPlayer from './LessonPlayer.jsx';
import Modal from '../ui/Modal.jsx';
import QuizMode from './QuizMode.jsx';
import SaveIndicator from '../SaveIndicator.jsx';
import { completeLesson, courseState, loseHeart } from '../../lib/course.js';
import { deckStats, makeCard } from '../../lib/templates/vocab.js';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

/*
  Learn is the front door now. Flashcards and the quiz stay because they are
  genuinely better for cramming the night before something — the course is for
  learning a deck, they are for revising one you already know.
*/
const TABS = [
  { id: 'learn', labelKey: 'course.learn', icon: 'star' },
  { id: 'study', labelKey: 'languages.study', icon: 'cards' },
  { id: 'quiz', labelKey: 'languages.quiz', icon: 'quiz' },
  { id: 'cards', labelKey: 'languages.manage', icon: 'list' },
];

/** Add / edit one card. */
function CardDialog({ card, onSave, onClose }) {
  const { t } = useT();
  const [front, setFront] = useState(card?.front ?? '');
  const [back, setBack] = useState(card?.back ?? '');
  const [example, setExample] = useState(card?.example ?? '');

  const submit = (event) => {
    event.preventDefault();
    if (!front.trim() || !back.trim()) return;
    onSave({ front: front.trim(), back: back.trim(), example: example.trim() });
    onClose();
  };

  return (
    <Modal
      title={card ? t('languages.editCard') : t('languages.addCard')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="card-form" className="button primary">
            {t('common.save')}
          </button>
        </>
      }
    >
      <form id="card-form" onSubmit={submit} className="card-form">
        <label className="field">
          <span>{t('languages.front')}</span>
          <input type="text" value={front} onChange={(event) => setFront(event.target.value)} />
        </label>
        <label className="field">
          <span>{t('languages.back')}</span>
          <input type="text" value={back} onChange={(event) => setBack(event.target.value)} />
        </label>
        <label className="field">
          <span>{t('languages.example')}</span>
          <textarea rows={2} value={example} onChange={(event) => setExample(event.target.value)} />
        </label>
      </form>
    </Modal>
  );
}

export default function DeckWorkspace({ deckId, onBack }) {
  const { t } = useT();
  const { vocabDecks, update } = useData();

  const deck = vocabDecks.find((item) => item.id === deckId);
  const [tab, setTab] = useState('learn');
  const [lessonAt, setLessonAt] = useState(null);
  const [editingCard, setEditingCard] = useState(null); // card object or 'new'
  const [deletingCard, setDeletingCard] = useState(null);

  const writeCards = useCallback(
    (cards, options) => update('decks', deckId, { cards }, options),
    [deckId, update],
  );

  const course = useMemo(() => (deck ? courseState(deck) : null), [deck]);

  const writeProgress = useCallback(
    (progress) => update('decks', deckId, { progress }, { immediate: true }),
    [deckId, update],
  );

  const handleGrade = useCallback(
    (updatedCard) => {
      writeCards((deck?.cards ?? []).map((card) => (card.id === updatedCard.id ? updatedCard : card)));
    },
    [deck?.cards, writeCards],
  );

  if (!deck) {
    return (
      <div className="editor-missing">
        <h1>{t('notes.missingTitle')}</h1>
        <p>{t('notes.missingBody')}</p>
        <button type="button" className="button primary" onClick={onBack}>
          {t('common.back')}
        </button>
      </div>
    );
  }

  const cards = deck.cards ?? [];
  const stats = deckStats(deck);

  const saveCard = (values) => {
    if (editingCard === 'new') {
      writeCards([...cards, makeCard(values)], { immediate: true });
    } else {
      writeCards(
        cards.map((card) => (card.id === editingCard.id ? { ...card, ...values } : card)),
        { immediate: true },
      );
    }
  };

  if (lessonAt !== null && course?.lessons[lessonAt]) {
    return (
      <LessonPlayer
        key={lessonAt}
        deck={deck}
        lesson={course.lessons[lessonAt]}
        hearts={course.hearts}
        onLoseHeart={() => writeProgress(loseHeart(deck))}
        onFinish={({ correct, total }) => {
          writeProgress(completeLesson({ deck, index: lessonAt, correct, total }).progress);
          setLessonAt(null);
        }}
        onQuit={() => setLessonAt(null)}
      />
    );
  }

  return (
    <div className="deck-workspace">
      <header className="editor-header">
        <button
          type="button"
          className="icon-button back"
          onClick={onBack}
          title={t('common.back')}
          aria-label={t('common.back')}
        >
          <Icon name="back" size={19} />
        </button>

        <div className="editor-title-block">
          <input
            className="editor-title-input"
            value={deck.name ?? ''}
            aria-label={t('languages.deckName')}
            onChange={(event) => update('decks', deckId, { name: event.target.value })}
            onBlur={(event) =>
              update(
                'decks',
                deckId,
                { name: event.target.value.trim() || t('common.untitled') },
                { immediate: true },
              )
            }
          />
          <div className="editor-title-meta">
            <SaveIndicator />
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span>{t('languages.cards', { count: stats.total })}</span>
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span>
              {stats.due > 0
                ? t('languages.dueNow', { count: stats.due })
                : t('languages.allCaughtUp')}
            </span>
          </div>
        </div>

        <div className="editor-header-actions">
          <button type="button" className="button primary" onClick={() => setEditingCard('new')}>
            <Icon name="plus" size={17} />
            {t('languages.addCard')}
          </button>
        </div>
      </header>

      <div className="deck-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`deck-tab ${tab === item.id ? 'is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <Icon name={item.icon} size={16} /> {t(item.labelKey)}
          </button>
        ))}
        <div className="deck-legend">
          <span className="legend-dot is-fresh" /> {t('languages.newCards')} {stats.fresh}
          <span className="legend-dot is-learning" /> {t('languages.learning')} {stats.learning}
          <span className="legend-dot is-known" /> {t('languages.known')} {stats.known}
        </div>
      </div>

      <div className="deck-content">
        {cards.length === 0 ? (
          <EmptyState
            icon="cards"
            title={t('languages.noCards')}
            action={
              <button type="button" className="button primary" onClick={() => setEditingCard('new')}>
                {t('languages.addFirstCard')}
              </button>
            }
          />
        ) : tab === 'learn' ? (
          <CoursePath
            deck={deck}
            state={course}
            onStart={setLessonAt}
            onSetGoal={(goal) => writeProgress({ ...course.progress, goal })}
            onPractise={() => setTab('study')}
          />
        ) : tab === 'study' ? (
          <FlashcardTrainer key={deck.id} deck={deck} onGrade={handleGrade} />
        ) : tab === 'quiz' ? (
          <QuizMode key={deck.id} deck={deck} />
        ) : (
          <ul className="card-list">
            {cards.map((card) => (
              <li key={card.id} className="card-row">
                <span className={`card-box box-${card.box ?? 0}`} aria-hidden="true">
                  {card.box ?? 0}
                </span>
                <div className="card-text">
                  <strong>{card.front}</strong>
                  <span>{card.back}</span>
                  {card.example ? <small>{card.example}</small> : null}
                </div>
                <div className="card-row-actions">
                  <button
                    type="button"
                    className="icon-button small"
                    title={t('languages.editCard')}
                    aria-label={`${t('languages.editCard')} — ${card.front}`}
                    onClick={() => setEditingCard(card)}
                  >
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button small"
                    title={t('languages.deleteCard')}
                    aria-label={`${t('languages.deleteCard')} — ${card.front}`}
                    onClick={() => setDeletingCard(card)}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editingCard ? (
        <CardDialog
          card={editingCard === 'new' ? null : editingCard}
          onSave={saveCard}
          onClose={() => setEditingCard(null)}
        />
      ) : null}

      {deletingCard ? (
        <ConfirmDialog
          title={t('languages.deleteCard')}
          message={deletingCard.front}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() =>
            writeCards(
              cards.filter((card) => card.id !== deletingCard.id),
              { immediate: true },
            )
          }
          onClose={() => setDeletingCard(null)}
        />
      ) : null}
    </div>
  );
}
