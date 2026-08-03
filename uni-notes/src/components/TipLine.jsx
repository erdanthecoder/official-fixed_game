import { useEffect, useState } from 'react';
import { isTouch, tipAt } from '../i18n/tips.js';
import { useT } from '../i18n/index.jsx';

/**
 * One rotating tip.
 *
 * Starts at a random tip so the same one doesn't greet you every visit, then
 * advances steadily. Pauses when the tab is hidden — rotating a tip nobody can
 * see just wastes a render.
 */
export default function TipLine({ interval = 7000, className = '' }) {
  const { t, language } = useT();
  // Read once: a device does not grow a keyboard mid-session, and re-checking
  // on every render would be a media query per tip.
  const [touch] = useState(isTouch);
  const [index, setIndex] = useState(() => Math.floor(Math.random() * 64));

  useEffect(() => {
    if (interval <= 0) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') setIndex((current) => current + 1);
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);

  return (
    <p className={`tip-line ${className}`} aria-live="polite">
      <span className="tip-label">{t('common.tip')}</span>
      <span className="tip-text" key={index}>
        {tipAt(language, index, { touch })}
      </span>
    </p>
  );
}
