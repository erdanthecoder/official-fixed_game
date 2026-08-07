/**
 * "Where do you want to start?"
 *
 * Workspace signs you in and puts you in Drive. It is a reasonable guess and
 * it is still a guess: someone who only ever writes essays opens a file
 * manager every morning, and the way to fix it is buried in a settings page
 * they will never look at.
 *
 * So Kadam asks, once, on the first morning — and the answer is a real setting
 * (`prefs.startModule`), not a one-time redirect. Whatever they pick becomes
 * the thing the logo goes to, the thing a cold start opens, and the thing the
 * installed app launches into. It is changeable in Settings afterwards, and
 * this screen says so, because a question you can only answer once is a trap.
 *
 * The screen is also the one place in the app where all ten colours are on
 * screen together, which is the point: it is the moment the suite introduces
 * itself. Everywhere else you see one app's colour at a time.
 */

import { useState } from 'react';
import ProductIcon, { PRODUCTS } from '../brand/ProductIcon.jsx';
import Logo from '../brand/Logo.jsx';
import Icon from '../ui/Icon.jsx';
import { useT } from '../../i18n/index.jsx';

/**
 * The apps offered, in the order they get used across an application year:
 * write it, cost it, present it, sketch it, plan it, then the rest.
 *
 * Home is deliberately not a tile. It is the "I would rather not choose"
 * answer, and it lives at the bottom as a link — offering it as an eleventh
 * card of equal weight would make the question harder than it is.
 */
const CHOICES = [
  'notes',
  'sheets',
  'slides',
  'canvas',
  'tasks',
  'calendar',
  'shortlist',
  'languages',
  'unisave',
];

export default function ChooseStart({ onChoose }) {
  const { t } = useT();

  /*
   * The chosen tile is named before anything happens, so the card can play its
   * own confirmation — it grows, its colour floods the tile, and the rest of
   * the grid falls back — before the screen is replaced. Navigating on the
   * click instead made the choice feel like it had been taken from you.
   */
  const [picked, setPicked] = useState(null);

  const pick = (id) => {
    if (picked) return;
    setPicked(id);
    setTimeout(() => onChoose(id), 520);
  };

  return (
    <div className={`choose-start${picked ? ' has-pick' : ''}`}>
      <div className="choose-inner">
        <header className="choose-head">
          <Logo size={44} />
          <h1>{t('welcome.title')}</h1>
          <p>{t('welcome.body')}</p>
        </header>

        <div className="choose-grid" role="list">
          {CHOICES.map((id, index) => {
            const product = PRODUCTS[id];
            return (
              <button
                key={id}
                type="button"
                role="listitem"
                className={`choose-card${picked === id ? ' is-picked' : ''}`}
                style={{
                  '--i': index,
                  '--app': product.colour,
                  '--app-soft': product.soft,
                }}
                onClick={() => pick(id)}
                aria-label={t(product.labelKey)}
              >
                <span className="choose-card-art" aria-hidden="true">
                  <ProductIcon product={id} size={54} variant="solid" />
                </span>
                <strong>{t(product.labelKey)}</strong>
                {product.hintKey ? <span>{t(product.hintKey)}</span> : null}
                <span className="choose-card-go" aria-hidden="true">
                  <Icon name="forward" size={16} />
                </span>
              </button>
            );
          })}
        </div>

        <footer className="choose-foot">
          <button type="button" className="button ghost" onClick={() => pick('home')}>
            {t('welcome.later')}
          </button>
          <p>{t('welcome.change')}</p>
        </footer>
      </div>
    </div>
  );
}
