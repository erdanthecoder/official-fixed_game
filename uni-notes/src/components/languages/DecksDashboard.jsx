import { useMemo, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import ItemCard, { EditedMeta } from '../shared/ItemCard.jsx';
import ModuleHeader, { sortItems } from '../shared/ModuleHeader.jsx';
import PromptDialog from '../ui/PromptDialog.jsx';
import TemplateStrip from '../shared/TemplateStrip.jsx';
import { VOCAB_TEMPLATES, deckStats } from '../../lib/templates/vocab.js';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';
import { useView } from '../../hooks/useView.js';

/** Progress bar showing new / learning / known proportions. */
function DeckProgress({ stats }) {
  const total = Math.max(1, stats.total);
  const segments = [
    { key: 'known', value: stats.known },
    { key: 'learning', value: stats.learning },
    { key: 'fresh', value: stats.fresh },
  ];
  return (
    <span className="deck-progress" aria-hidden="true">
      {segments.map((segment) => (
        <span
          key={segment.key}
          className={`deck-progress-bar is-${segment.key}`}
          style={{ width: `${(segment.value / total) * 100}%` }}
        />
      ))}
    </span>
  );
}

export default function DecksDashboard({ onOpen }) {
  const { t } = useT();
  const [view, setView] = useView();
  const { vocabDecks, create, update, remove, duplicate } = useData();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = vocabDecks.filter((deck) => {
      if (!needle) return true;
      if (String(deck.name ?? '').toLowerCase().includes(needle)) return true;
      return (deck.cards ?? []).some((card) =>
        `${card.front} ${card.back}`.toLowerCase().includes(needle),
      );
    });
    return sortItems(filtered, sort, 'name');
  }, [vocabDecks, query, sort]);

  const startFromTemplate = (template) => {
    const deck = create(
      'decks',
      { name: t(template.labelKey), ...template.build() },
      { idPrefix: 'deck' },
    );
    onOpen(deck.id);
  };

  return (
    <div className="dashboard">
      <ModuleHeader
        product="languages"
        title={t('languages.title')}
        subtitle={t('languages.subtitle')}
        count={`${visible.length} · ${t('languages.title')}`}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
        searchPlaceholder={t('languages.searchPlaceholder')}
        actions={
          <button
            type="button"
            className="button primary"
            onClick={() => setCreating(true)}
          >
            <Icon name="plus" size={17} />
            {t('languages.newDeck')}
          </button>
        }
      />

      <TemplateStrip
        templates={VOCAB_TEMPLATES}
        onPick={startFromTemplate}
        onBlank={() => setCreating(true)}
        blankLabelKey="languages.newDeck"
        blankHintKey="languages.deckName"
        ariaLabel={t('languages.newDeck')}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon="cards"
          title={query ? t('notes.noMatches') : t('languages.emptyState')}
          body={query ? t('notes.noMatchesBody', { query }) : t('languages.emptyBody')}
          action={
            query ? null : (
              <button type="button" className="button primary" onClick={() => setCreating(true)}>
                {t('languages.newDeck')}
              </button>
            )
          }
        />
      ) : (
        <div className={view === 'list' ? 'doc-rows' : 'doc-grid'}>
          {visible.map((deck) => {
            const stats = deckStats(deck);
            return (
              <ItemCard
                view={view}
                product="languages"
                key={deck.id}
                title={deck.name || t('common.untitled')}
                accent="#e8710a"
                thumb={
                  <span className="deck-stats-thumb">
                    <strong>{stats.total}</strong>
                    <small>{t('languages.cards', { count: stats.total })}</small>
                    <DeckProgress stats={stats} />
                  </span>
                }
                meta={
                  <EditedMeta
                    timestamp={deck.updatedAt}
                    extra={
                      stats.due > 0
                        ? t('languages.dueNow', { count: stats.due })
                        : t('languages.allCaughtUp')
                    }
                  />
                }
                onOpen={() => onOpen(deck.id)}
                actions={[
                  { label: t('languages.study'), run: () => onOpen(deck.id) },
                  { label: t('common.rename'), run: () => setRenaming(deck) },
                  { label: t('common.copy'), run: () => duplicate('decks', deck.id, { titleKey: 'name' }) },
                  { label: t('common.delete'), run: () => setDeleting(deck), danger: true },
                ]}
              />
            );
          })}
        </div>
      )}

      {creating ? (
        <PromptDialog
          title={t('languages.newDeck')}
          label={t('languages.deckName')}
          confirmLabel={t('common.create')}
          cancelLabel={t('common.cancel')}
          onConfirm={(name) => {
            if (!name.trim()) return;
            const deck = create('decks', { name: name.trim(), cards: [] }, { idPrefix: 'deck' });
            onOpen(deck.id);
          }}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {renaming ? (
        <PromptDialog
          title={t('languages.renameDeck')}
          label={t('languages.deckName')}
          initialValue={renaming.name}
          confirmLabel={t('common.save')}
          cancelLabel={t('common.cancel')}
          onConfirm={(name) =>
            update('decks', renaming.id, { name: name.trim() || t('common.untitled') }, { immediate: true })
          }
          onClose={() => setRenaming(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('languages.deleteDeckTitle', { name: deleting.name })}
          message={t('common.deleteForeverWarning')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => remove('decks', deleting.id)}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
