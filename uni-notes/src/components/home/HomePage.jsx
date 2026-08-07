/**
 * Home.
 *
 * Until now, opening Kadam dropped you into Notes — a folder of documents, which
 * tells you nothing you did not already know. This is the screen that answers
 * the question actually being asked at nine in the morning: what is close, and
 * what was I doing?
 *
 * Three bands, in the order the answers matter:
 *
 *   1. What is due. Deadlines from every plan, soonest first, counting down.
 *      Anything overdue comes first and is marked, because a missed deadline is
 *      the one thing this app exists to prevent.
 *   2. What you were doing. The last things touched, across all six kinds, so
 *      picking up is one tap rather than remembering which app it was in.
 *   3. What to start. The blank-page problem, solved by not showing a blank
 *      page.
 *
 * Google Workspace has no equivalent, and cannot: Drive can list files by date
 * but has no idea what a deadline is, and Docs cannot see your spreadsheets.
 * Holding all six kinds in one place is what makes this screen possible.
 */

import { useMemo } from 'react';
import Icon from '../ui/Icon.jsx';
import ProductIcon, { PRODUCTS } from '../brand/ProductIcon.jsx';
import Scenery from '../Scenery.jsx';
import { daysUntil } from '../../lib/templates/tasks.js';
import { progressOf } from '../../lib/course.js';
import { titleOf } from '../../lib/model.js';
import { formatRelativeDate } from '../../lib/text.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

const RECENT_SOURCES = [
  ['notes', 'notes'],
  ['sheets', 'sheets'],
  ['presentations', 'slides'],
  ['boards', 'canvas'],
  ['plans', 'tasks'],
  ['vocabDecks', 'languages'],
];

const STARTERS = ['notes', 'sheets', 'slides', 'canvas', 'tasks'];

/** Morning / afternoon / evening, from the clock on this device. */
function greetingKey(hour) {
  if (hour < 12) return 'home.morning';
  if (hour < 18) return 'home.afternoon';
  return 'home.evening';
}

export default function HomePage({ onGo, onOpenItem, onCreate }) {
  const { t } = useT();
  const { user } = useAuth();
  const data = useData();

  /** Every unfinished task that has a date, soonest first. */
  const due = useMemo(() => {
    const out = [];
    for (const plan of data.plans ?? []) {
      for (const task of plan.tasks ?? []) {
        if (task.done || !task.due) continue;
        out.push({
          id: `${plan.id}:${task.id}`,
          planId: plan.id,
          text: task.text,
          plan: titleOf(plan, t('common.untitled')),
          due: task.due,
          days: daysUntil(task.due),
        });
      }
    }
    return out.sort((a, b) => a.days - b.days).slice(0, 5);
  }, [data.plans, t]);

  const recent = useMemo(() => {
    const out = [];
    for (const [collection, module] of RECENT_SOURCES) {
      for (const doc of data[collection] ?? []) {
        out.push({
          id: `${collection}:${doc.id}`,
          module,
          docId: doc.id,
          title: titleOf(doc, t('common.untitled')),
          at: doc.updatedAt ?? 0,
        });
      }
    }
    return out.sort((a, b) => b.at - a.at).slice(0, 6);
  }, [data, t]);

  /** The best streak across all decks — one number, not six. */
  const streak = useMemo(
    () => Math.max(0, ...(data.vocabDecks ?? []).map((deck) => progressOf(deck).streak)),
    [data.vocabDecks],
  );

  const firstName = (user?.name ?? '').trim().split(/\s+/)[0];
  const hour = new Date().getHours();

  return (
    <div className="home-page">
      <Scenery slot="home" className="module-banner home-banner">
        <div className="home-banner-text">
          <h1>{firstName ? t(greetingKey(hour), { name: firstName }) : t('home.welcome')}</h1>
          <p>{t('home.today', { date: new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) })}</p>
        </div>
      </Scenery>

      <div className="home-body">
        {/* --- what is close ------------------------------------------------ */}
        {due.length ? (
          <section className="home-card">
            <header className="home-card-head">
              <h2>
                <Icon name="flag" size={17} />
                {t('home.dueSoon')}
              </h2>
              <button type="button" className="link-button" onClick={() => onGo('tasks')}>
                {t('home.seeAll')}
              </button>
            </header>
            <ul className="due-list">
              {due.map((item) => {
                const late = item.days < 0;
                const today = item.days === 0;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`due-row${late ? ' is-late' : today ? ' is-today' : ''}`}
                      onClick={() => onOpenItem('tasks', item.planId)}
                    >
                      <span className={`due-count${late ? ' is-late' : today ? ' is-today' : ''}`}>
                        {late ? Math.abs(item.days) : item.days}
                        <small>{t(late ? 'home.daysLate' : today ? 'home.today0' : 'home.daysLeft')}</small>
                      </span>
                      <span className="due-text">
                        <strong>{item.text}</strong>
                        <small>{item.plan}</small>
                      </span>
                      <Icon name="forward" size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* --- what you were doing ------------------------------------------ */}
        {recent.length ? (
          <section className="home-card">
            <header className="home-card-head">
              <h2>
                <Icon name="clock" size={17} />
                {t('home.pickUp')}
              </h2>
              <button type="button" className="link-button" onClick={() => onGo('unisave')}>
                {t('home.seeAll')}
              </button>
            </header>
            <div className="recent-grid">
              {recent.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="recent-tile"
                  onClick={() => onOpenItem(item.module, item.docId)}
                >
                  <ProductIcon product={item.module} size={26} />
                  <span className="recent-text">
                    <strong>{item.title}</strong>
                    <small>{formatRelativeDate(item.at, t)}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* --- practice ------------------------------------------------------ */}
        {streak > 0 ? (
          <button type="button" className="home-streak" onClick={() => onGo('languages')}>
            <Icon name="flame" size={22} />
            <span>
              <strong>{t('home.streak', { count: streak })}</strong>
              <small>{t('home.streakHint')}</small>
            </span>
            <Icon name="forward" size={16} />
          </button>
        ) : null}

        {/* --- start something ----------------------------------------------- */}
        <section className="home-card">
          <header className="home-card-head">
            <h2>
              <Icon name="plus" size={17} />
              {t('home.start')}
            </h2>
          </header>
          <div className="starter-row">
            {STARTERS.map((module) => (
              <button
                key={module}
                type="button"
                className="starter-tile"
                style={{ '--tile-accent': PRODUCTS[module]?.colour }}
                onClick={() => onCreate(module)}
              >
                <ProductIcon product={module} size={30} />
                <strong>{t(PRODUCTS[module]?.labelKey ?? `nav.${module}`)}</strong>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
