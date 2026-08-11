import { useCallback, useMemo, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import PresentMode from './PresentMode.jsx';
import SaveIndicator from '../SaveIndicator.jsx';
import SlideView from './SlideView.jsx';
import ShareDialog from '../unisave/ShareDialog.jsx';
import Facepile from '../collab/Facepile.jsx';
import DownloadMenu from '../ui/DownloadMenu.jsx';
import { deckToDocx, deckToText } from '../../lib/export/formats.js';
import { safeName, saveFile } from '../../lib/export/download.js';
import { LAYOUTS, THEMES, makeSlide } from '../../lib/templates/slides.js';
import { useData } from '../../context/DataContext.jsx';
import { useMorphTarget } from '../../lib/morph.js';
import { useT } from '../../i18n/index.jsx';

/** Which text fields each layout actually shows, so the editor matches the slide. */
const LAYOUT_FIELDS = {
  title: [
    { key: 'title', placeholderKey: 'slides.slideTitlePlaceholder', big: true },
    { key: 'body', placeholderKey: 'slides.bodyPlaceholder', rows: 2 },
  ],
  section: [{ key: 'title', placeholderKey: 'slides.slideTitlePlaceholder', big: true }],
  bullets: [
    { key: 'title', placeholderKey: 'slides.slideTitlePlaceholder', big: true },
    { key: 'body', placeholderKey: 'slides.bodyPlaceholder', rows: 6 },
  ],
  quote: [
    { key: 'quote', placeholderKey: 'slides.quotePlaceholder', rows: 4 },
    { key: 'attribution', placeholderKey: 'slides.attributionPlaceholder' },
  ],
  'two-column': [
    { key: 'title', placeholderKey: 'slides.slideTitlePlaceholder', big: true },
    { key: 'left', placeholderKey: 'slides.leftPlaceholder', rows: 4 },
    { key: 'right', placeholderKey: 'slides.rightPlaceholder', rows: 4 },
  ],
};

export default function DeckEditor({ deckId, onBack }) {
  const { t } = useT();
  const { presentations, update, remove } = useData();

  const deck = presentations.find((item) => item.id === deckId);
  const slides = deck?.slides ?? [];

  // The card the reader tapped grows into this page.
  const stageRef = useRef(null);
  useMorphTarget(stageRef);
  const [index, setIndex] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);

  const current = slides[Math.min(index, Math.max(0, slides.length - 1))];

  const patchDeck = useCallback(
    (patch, options) => update('presentations', deckId, patch, options),
    [deckId, update],
  );

  const writeSlides = useCallback(
    (nextSlides, options) => patchDeck({ slides: nextSlides }, options),
    [patchDeck],
  );

  const patchSlide = useCallback(
    (patch) => {
      if (!current) return;
      writeSlides(slides.map((slide) => (slide.id === current.id ? { ...slide, ...patch } : slide)));
    },
    [current, slides, writeSlides],
  );

  const addSlide = () => {
    const next = [...slides];
    next.splice(index + 1, 0, makeSlide({ layout: current?.layout ?? 'bullets' }));
    writeSlides(next, { immediate: true });
    setIndex(index + 1);
  };

  const duplicateSlide = () => {
    if (!current) return;
    const next = [...slides];
    next.splice(index + 1, 0, { ...current, id: makeSlide().id });
    writeSlides(next, { immediate: true });
    setIndex(index + 1);
  };

  const deleteSlide = () => {
    if (slides.length === 0) return;
    const next = slides.filter((slide) => slide.id !== current.id);
    writeSlides(next.length > 0 ? next : [makeSlide({ layout: 'title' })], { immediate: true });
    setIndex(Math.max(0, index - 1));
  };

  const moveSlide = (delta) => {
    const target = index + delta;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    writeSlides(next, { immediate: true });
    setIndex(target);
  };

  const fields = useMemo(() => LAYOUT_FIELDS[current?.layout] ?? LAYOUT_FIELDS.bullets, [current]);

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

  if (presenting) {
    return <PresentMode deck={deck} startIndex={index} onExit={() => setPresenting(false)} />;
  }

  return (
    <div className="deck-page">
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
            value={deck.title ?? ''}
            aria-label={t('slides.deckTitle')}
            onChange={(event) => patchDeck({ title: event.target.value })}
            onBlur={(event) =>
              patchDeck({ title: event.target.value.trim() || t('common.untitled') }, { immediate: true })
            }
          />
          <div className="editor-title-meta">
            <SaveIndicator />
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span>{t('slides.slideOf', { current: index + 1, total: slides.length })}</span>
          </div>
        </div>

        <div className="editor-header-actions">
          <Facepile document={deck} onShare={() => setSharing(true)} />
          <DownloadMenu
            formats={[
              {
                id: 'docx',
                file: () =>
                  new File([deckToDocx(deck, deck.title)], safeName(deck.title, 'docx'), {
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  }),
                ext: 'DOCX',
                label: t('export.word'),
                run: () =>
                  saveFile(
                    deckToDocx(deck, deck.title),
                    safeName(deck.title, 'docx'),
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  ),
              },
              {
                id: 'txt',
                file: () =>
                  new File([deckToText(deck)], safeName(deck.title, 'txt'), { type: 'text/plain' }),
                ext: 'TXT',
                label: t('export.speakerNotes'),
                run: () =>
                  saveFile(
                    deckToText(deck),
                    safeName(deck.title, 'txt'),
                    'text/plain;charset=utf-8',
                  ),
              },
            ]}
          />
          <button type="button" className="button ghost" onClick={() => setSharing(true)}>
            <Icon name="share" size={16} />
            {t('common.share')}
          </button>
          <button type="button" className="button primary" onClick={() => setPresenting(true)}>
            <Icon name="present" size={16} />
            {t('slides.present')}
          </button>
          <button
            type="button"
            className="button danger-ghost"
            onClick={() => setConfirmDelete(true)}
          >
            {t('common.delete')}
          </button>
        </div>
      </header>

      <div className="deck-body">
        <aside className="slide-strip" aria-label={t('slides.title')}>
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              className={`slide-strip-item ${slideIndex === index ? 'is-active' : ''}`}
              onClick={() => setIndex(slideIndex)}
              aria-current={slideIndex === index ? 'true' : undefined}
            >
              <span className="slide-strip-number">{slideIndex + 1}</span>
              <SlideView slide={slide} theme={deck.theme} scale="thumb" />
            </button>
          ))}
          <button type="button" className="slide-strip-add" onClick={addSlide}>
            <Icon name="plus" size={15} />
            {t('slides.addSlide')}
          </button>
        </aside>

        <div className="deck-main" ref={stageRef}>
          <div className="deck-toolbar" role="toolbar" aria-label={t('slides.layout')}>
            <label className="select-field">
              <span className="sr-only">{t('slides.layout')}</span>
              <select
                value={current?.layout ?? 'bullets'}
                onChange={(event) => patchSlide({ layout: event.target.value })}
              >
                {LAYOUTS.map((layout) => (
                  <option key={layout.id} value={layout.id}>
                    {t(layout.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <div className="theme-picker" role="group" aria-label={t('slides.theme')}>
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-swatch ${deck.theme === theme.id ? 'is-active' : ''}`}
                  style={{ background: theme.swatch }}
                  title={t(theme.labelKey)}
                  aria-label={t(theme.labelKey)}
                  aria-pressed={deck.theme === theme.id}
                  onClick={() => patchDeck({ theme: theme.id }, { immediate: true })}
                />
              ))}
            </div>

            <div className="tool-group push-right">
              <button
                type="button"
                className="icon-button"
                title={t('slides.moveUp')}
                aria-label={t('slides.moveUp')}
                onClick={() => moveSlide(-1)}
                disabled={index === 0}
              >
                <Icon name="up" size={17} />
              </button>
              <button
                type="button"
                className="icon-button"
                title={t('slides.moveDown')}
                aria-label={t('slides.moveDown')}
                onClick={() => moveSlide(1)}
                disabled={index >= slides.length - 1}
              >
                <Icon name="down" size={17} />
              </button>
              <button
                type="button"
                className="icon-button"
                title={t('slides.duplicateSlide')}
                aria-label={t('slides.duplicateSlide')}
                onClick={duplicateSlide}
              >
                <Icon name="copy" size={17} />
              </button>
              <button
                type="button"
                className="icon-button"
                title={t('slides.deleteSlide')}
                aria-label={t('slides.deleteSlide')}
                onClick={deleteSlide}
              >
                <Icon name="trash" size={17} />
              </button>
            </div>
          </div>

          {current ? (
            <div className="deck-canvas-wrap">
              <SlideView slide={current} theme={deck.theme} scale="canvas" />

              <div className="slide-fields">
                {fields.map((field) => (
                  <label key={field.key} className="field">
                    <span>{t(field.placeholderKey)}</span>
                    {field.rows ? (
                      <textarea
                        rows={field.rows}
                        value={current[field.key] ?? ''}
                        placeholder={t(field.placeholderKey)}
                        onChange={(event) => patchSlide({ [field.key]: event.target.value })}
                      />
                    ) : (
                      <input
                        type="text"
                        className={field.big ? 'big' : undefined}
                        value={current[field.key] ?? ''}
                        placeholder={t(field.placeholderKey)}
                        onChange={(event) => patchSlide({ [field.key]: event.target.value })}
                      />
                    )}
                  </label>
                ))}

                <label className="field">
                  <span>{t('slides.speakerNotes')}</span>
                  <textarea
                    rows={2}
                    value={current.notes ?? ''}
                    placeholder={t('slides.notesPlaceholder')}
                    onChange={(event) => patchSlide({ notes: event.target.value })}
                  />
                </label>
              </div>
            </div>
          ) : (
            <p className="deck-empty">{t('slides.noSlides')}</p>
          )}
        </div>
      </div>

      {sharing ? <ShareDialog document={deck} onClose={() => setSharing(false)} /> : null}

      {confirmDelete ? (
        <ConfirmDialog
          title={t('slides.deleteDeckTitle', { name: deck.title })}
          message={t('common.deleteForeverWarning')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            remove('presentations', deckId);
            onBack();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      ) : null}
    </div>
  );
}
