import { useMemo, useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import ItemCard, { EditedMeta } from '../shared/ItemCard.jsx';
import ModuleHeader, { sortItems } from '../shared/ModuleHeader.jsx';
import PromptDialog from '../ui/PromptDialog.jsx';
import SlideView from './SlideView.jsx';
import TemplateStrip from '../shared/TemplateStrip.jsx';
import { SLIDE_TEMPLATES, blankDeck } from '../../lib/templates/slides.js';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

export default function SlidesDashboard({ onOpen }) {
  const { t } = useT();
  const { presentations, create, update, remove, duplicate } = useData();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = presentations.filter((deck) => {
      if (!needle) return true;
      if (String(deck.title ?? '').toLowerCase().includes(needle)) return true;
      return (deck.slides ?? []).some((slide) =>
        ['title', 'body', 'quote', 'left', 'right', 'notes'].some((key) =>
          String(slide[key] ?? '').toLowerCase().includes(needle),
        ),
      );
    });
    return sortItems(filtered, sort);
  }, [presentations, query, sort]);

  const startDeck = (title, data) => {
    const deck = create('presentations', { title, ...data }, { idPrefix: 'deck' });
    onOpen(deck.id);
  };

  const startBlank = () => startDeck(t('common.untitled'), blankDeck());
  const startFromTemplate = (template) => {
    const built = template.build();
    // The template's first slide carries a generic English title; use the
    // translated template name so the deck reads correctly from the start.
    const title = t(template.labelKey);
    const slides = built.slides.map((slide, index) =>
      index === 0 ? { ...slide, title } : slide,
    );
    startDeck(title, { ...built, slides });
  };

  return (
    <div className="dashboard">
      <ModuleHeader
        slot="slides"
        title={t('slides.title')}
        subtitle={t('slides.subtitle')}
        count={`${visible.length} · ${t('slides.title')}`}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        searchPlaceholder={t('slides.searchPlaceholder')}
        actions={
          <button type="button" className="button primary on-scenery" onClick={startBlank}>
            ＋ {t('slides.newDeck')}
          </button>
        }
      />

      <TemplateStrip
        templates={SLIDE_TEMPLATES}
        onPick={startFromTemplate}
        onBlank={startBlank}
        blankLabelKey="slides.blankDeck"
        blankHintKey="slides.blankHint"
        ariaLabel={t('slides.newDeck')}
      />

      {visible.length === 0 ? (
        <EmptyState
          emoji="🖼️"
          title={query ? t('notes.noMatches') : t('slides.emptyState')}
          body={query ? t('notes.noMatchesBody', { query }) : t('slides.emptyBody')}
          action={
            query ? null : (
              <button type="button" className="button primary" onClick={startBlank}>
                {t('slides.newDeck')}
              </button>
            )
          }
        />
      ) : (
        <div className="doc-grid">
          {visible.map((deck) => (
            <ItemCard
              key={deck.id}
              title={deck.title || t('common.untitled')}
              accent="#8430ce"
              thumb={
                deck.slides?.[0] ? (
                  <span className="deck-card-thumb">
                    <SlideView slide={deck.slides[0]} theme={deck.theme} scale="thumb" />
                  </span>
                ) : null
              }
              meta={
                <EditedMeta
                  timestamp={deck.updatedAt}
                  extra={`${deck.slides?.length ?? 0} · ${t('slides.slide')}`}
                />
              }
              onOpen={() => onOpen(deck.id)}
              actions={[
                { label: t('common.open'), run: () => onOpen(deck.id) },
                { label: t('common.rename'), run: () => setRenaming(deck) },
                { label: t('common.copy'), run: () => duplicate('presentations', deck.id) },
                { label: t('common.delete'), run: () => setDeleting(deck), danger: true },
              ]}
            />
          ))}
        </div>
      )}

      {renaming ? (
        <PromptDialog
          title={t('slides.renameDeck')}
          label={t('slides.deckTitle')}
          initialValue={renaming.title}
          confirmLabel={t('common.save')}
          cancelLabel={t('common.cancel')}
          onConfirm={(title) =>
            update(
              'presentations',
              renaming.id,
              { title: title.trim() || t('common.untitled') },
              { immediate: true },
            )
          }
          onClose={() => setRenaming(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('slides.deleteDeckTitle', { name: deleting.title })}
          message={t('common.deleteForeverWarning')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => remove('presentations', deleting.id)}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
