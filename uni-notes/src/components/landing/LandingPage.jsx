import { useState } from 'react';
import Icon from '../ui/Icon.jsx';
import Logo from '../brand/Logo.jsx';
import LanguagePicker from '../LanguagePicker.jsx';
import ModulePreview from './ModulePreview.jsx';
import ProductIcon, { PRODUCTS } from '../brand/ProductIcon.jsx';
import Scenery from '../Scenery.jsx';
import TipLine from '../TipLine.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useT } from '../../i18n/index.jsx';

const TOUR = ['notes', 'sheets', 'slides', 'unisave', 'ai', 'languages'];

/**
 * The front door.
 *
 * Someone arriving at the bare URL should understand what this is and see it
 * working before being asked to sign in — hence the switchable preview rather
 * than a list of adjectives. One primary action: Let's go.
 */
export default function LandingPage({ onStart }) {
  const { t } = useT();
  const { user, isCloud, isFirebaseConfigured } = useAuth();
  const [tab, setTab] = useState('notes');

  const previewCopy = {
    notesFile: t('landing.previewNotesFile'),
    notesHeading: t('landing.previewNotesHeading'),
    notesBody: t('landing.previewNotesBody'),
    notesTask1: t('landing.previewNotesTask1'),
    notesTask2: t('landing.previewNotesTask2'),
    notesTask3: t('landing.previewNotesTask3'),
    sheetsFile: t('landing.previewSheetsFile'),
    sheetsHeadSchool: t('landing.previewSheetsHeadSchool'),
    sheetsHeadFee: t('landing.previewSheetsHeadFee'),
    sheetsHeadYears: t('landing.previewSheetsHeadYears'),
    sheetsHeadTotal: t('landing.previewSheetsHeadTotal'),
    sheetsSchool1: t('landing.previewSheetsSchool1'),
    sheetsSchool2: t('landing.previewSheetsSchool2'),
    sheetsSchool3: t('landing.previewSheetsSchool3'),
    sheetsCheapest: t('landing.previewSheetsCheapest'),
    slidesFile: t('landing.previewSlidesFile'),
    slidesTitle: t('landing.previewSlidesTitle'),
    slidesSub: t('landing.previewSlidesSub'),
    saveFile: t('landing.previewSaveFile'),
    saveFile1: t('landing.previewSaveFile1'),
    saveFile2: t('landing.previewSaveFile2'),
    saveFile3: t('landing.previewSaveFile3'),
    saveKindNote: t('nav.notes'),
    saveKindSheet: t('nav.sheets'),
    saveKindDeck: t('nav.languages'),
    saveShared: t('landing.previewSaveShared'),
    savePeople: t('landing.previewSavePeople'),
    aiFile: t('landing.previewAiFile'),
    aiAsk: t('landing.previewAiAsk'),
    aiAnswer: t('landing.previewAiAnswer'),
    langFile: t('landing.previewLangFile'),
    langFront: t('landing.previewLangFront'),
    langBack: t('landing.previewLangBack'),
    langAgain: t('languages.again'),
    langHard: t('languages.hard'),
    langGood: t('languages.good'),
    langEasy: t('languages.easy'),
  };

  const cta = isCloud ? t('landing.openApp') : t('landing.letsGo');

  return (
    <div className="landing">
      <header className="landing-top">
        <a className="landing-brand" href="#/">
          <Logo size={34} sub={t('common.tagline')} />
        </a>

        <div className="landing-top-actions">
          <LanguagePicker compact />
          <button type="button" className="button primary" onClick={onStart}>
            {cta}
          </button>
        </div>
      </header>

      {/* ------------------------------- hero ------------------------------- */}
      <section className="landing-hero">
        <Scenery slot="signIn" className="landing-hero-scene" overlay />

        <div className="landing-hero-inner">
          <p className="landing-eyebrow">{t('landing.eyebrow')}</p>
          <h1>{t('landing.headline')}</h1>
          <p className="landing-lede">{t('landing.lede')}</p>

          <div className="landing-cta-row">
            <button type="button" className="button primary big" onClick={onStart}>
              {cta}
              <Icon name="forward" size={18} />
            </button>
            <a className="button ghost big on-dark" href="#tour">
              {t('landing.seeInside')}
            </a>
          </div>

          {isCloud && user ? (
            <p className="landing-signed-in">{t('auth.signedInAs', { name: user.name })}</p>
          ) : (
            <p className="landing-note">
              {isFirebaseConfigured ? t('landing.freeNote') : t('landing.localNote')}
            </p>
          )}

          <TipLine className="on-dark" />
        </div>
      </section>

      {/* ------------------------------- tour ------------------------------- */}
      <section className="landing-tour" id="tour">
        <div className="landing-section-head">
          <h2>{t('landing.tourTitle')}</h2>
          <p>{t('landing.tourBody')}</p>
        </div>

        <div className="tour-tabs" role="tablist" aria-label={t('landing.tourTitle')}>
          {TOUR.map((product) => (
            <button
              key={product}
              type="button"
              role="tab"
              aria-selected={tab === product}
              className={`tour-tab ${tab === product ? 'is-active' : ''}`}
              style={{ '--tab-accent': PRODUCTS[product].colour }}
              onClick={() => setTab(product)}
            >
              <ProductIcon product={product} size={26} />
              <span>{t(PRODUCTS[product].labelKey)}</span>
            </button>
          ))}
        </div>

        <div className="tour-stage">
          <ModulePreview product={tab} copy={previewCopy} />
          <div className="tour-copy">
            <h3>
              <ProductIcon product={tab} size={30} variant="solid" />
              {t(`landing.${tab}Title`)}
            </h3>
            <p>{t(`landing.${tab}Body`)}</p>
            <ul className="tour-points">
              <li>{t(`landing.${tab}Point1`)}</li>
              <li>{t(`landing.${tab}Point2`)}</li>
              <li>{t(`landing.${tab}Point3`)}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------- reassurance ---------------------------- */}
      <section className="landing-trust">
        <div className="landing-section-head">
          <h2>{t('landing.trustTitle')}</h2>
          <p>{t('landing.trustBody')}</p>
        </div>

        <div className="trust-grid">
          <article className="trust-card">
            <Icon name="save" size={24} className="trust-icon" />
            <h3>{t('landing.trustSaveTitle')}</h3>
            <p>{t('landing.trustSaveBody')}</p>
          </article>
          <article className="trust-card">
            <Icon name="users" size={24} className="trust-icon" />
            <h3>{t('landing.trustShareTitle')}</h3>
            <p>{t('landing.trustShareBody')}</p>
          </article>
          <article className="trust-card">
            <Icon name="lock" size={24} className="trust-icon" />
            <h3>{t('landing.trustPrivateTitle')}</h3>
            <p>{t('landing.trustPrivateBody')}</p>
          </article>
          <article className="trust-card">
            <Icon name="globe" size={24} className="trust-icon" />
            <h3>{t('landing.trustLangTitle')}</h3>
            <p>{t('landing.trustLangBody')}</p>
          </article>
        </div>
      </section>

      {/* ------------------------------ closing ------------------------------ */}
      <section className="landing-close">
        <Logo variant="mark" size={56} />
        <h2>{t('landing.closeTitle')}</h2>
        <p>{t('landing.closeBody')}</p>
        <button type="button" className="button primary big" onClick={onStart}>
          {cta}
          <Icon name="forward" size={18} />
        </button>
      </section>

      <footer className="landing-foot">
        <span>{t('common.appName')}</span>
        <span className="dot" aria-hidden="true">
          ·
        </span>
        <span>{t('landing.footNote')}</span>
      </footer>
    </div>
  );
}
