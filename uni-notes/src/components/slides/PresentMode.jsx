import { useCallback, useEffect, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import SlideView from './SlideView.jsx';
import { useT } from '../../i18n/index.jsx';

/**
 * Fullscreen presenting.
 *
 * Arrow keys / space / click advance, Esc leaves. Speaker notes sit under the
 * slide where only the presenter's screen shows them.
 */
export default function PresentMode({ deck, startIndex = 0, onExit }) {
  const { t } = useT();
  const slides = deck.slides ?? [];
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, slides.length - 1)));

  const go = useCallback(
    (delta) => setIndex((current) => Math.min(slides.length - 1, Math.max(0, current + delta))),
    [slides.length],
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(event.key)) {
        event.preventDefault();
        go(1);
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
        event.preventDefault();
        go(-1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onExit();
      } else if (event.key === 'Home') {
        setIndex(0);
      } else if (event.key === 'End') {
        setIndex(slides.length - 1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [go, onExit, slides.length]);

  // Ask for real fullscreen, but keep working if the browser refuses.
  useEffect(() => {
    const element = document.documentElement;
    element.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const slide = slides[index];

  return (
    <div className="present-mode">
      <div className="present-stage" onClick={() => go(1)}>
        {slide ? (
          <SlideView slide={slide} theme={deck.theme} scale="full" />
        ) : (
          <p className="present-empty">{t('slides.noSlides')}</p>
        )}
      </div>

      <div className="present-bar">
        <button type="button" className="button ghost" onClick={onExit}>
          {t('slides.exitPresent')}
        </button>
        <span className="present-counter">
          {t('slides.slideOf', { current: index + 1, total: slides.length })}
        </span>
        <div className="present-nav">
          <button
            type="button"
            className="icon-button"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label={t('common.previous')}
          >
            <Icon name="back" size={19} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => go(1)}
            disabled={index >= slides.length - 1}
            aria-label={t('common.next')}
          >
            <Icon name="forward" size={19} />
          </button>
        </div>
      </div>

      {slide?.notes ? <p className="present-notes">{slide.notes}</p> : null}
    </div>
  );
}
