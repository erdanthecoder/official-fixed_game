/**
 * Calendar.
 *
 * Tasks already knows every deadline. What it cannot show is the *shape* of a
 * month — that three things land in the same week, that the gap after the
 * fifteenth is the only clear run before Christmas, that a deadline you thought
 * was "next month" is nine days away. A list answers "what is next"; a grid
 * answers "when am I going to do this", which is the question that actually
 * decides whether an application gets finished.
 *
 * It is deliberately a *view*, not a second place to keep things. Nothing is
 * stored here. Every date on it is a task inside a plan, so there is one truth
 * about a deadline and it lives where it was written. Tick something off in
 * Tasks and it stops being bold here; there is nothing to keep in step.
 *
 * The month is built from first principles rather than from a date library:
 * seven columns, weeks beginning Monday, and enough leading and trailing days
 * to fill the grid. A library would be a dependency and a build-size cost for
 * arithmetic that is a dozen lines.
 */

import { useMemo, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import ProductIcon from '../brand/ProductIcon.jsx';
import { daysUntil } from '../../lib/templates/tasks.js';
import { titleOf } from '../../lib/model.js';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

/** yyyy-mm-dd for a Date, in local time — never toISOString, which is UTC. */
function key(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The six-week grid for a month.
 *
 * Always six rows, so the calendar does not change height as you page through
 * the year — a grid that grows and shrinks makes every click feel like a jump.
 */
function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  // getDay() is Sunday-first; this is a Monday-first calendar, which is what
  // both Kyrgyzstan and the UK use.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date, key: key(date), inMonth: date.getMonth() === month };
  });
}

/**
 * How many deadlines a cell shows before it says "+2 more".
 *
 * Two, not three. The cells are a fixed height so the grid cannot jump as you
 * page through the year, and three labels plus the counter overflowed that
 * height — the counter was clipped in exactly the cell that needed it most.
 */
const VISIBLE = 2;

export default function CalendarModule({ onOpenPlan }) {
  const { t, language } = useT();
  const { plans } = useData();

  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  /** Every unfinished deadline, grouped by the day it falls on. */
  const byDay = useMemo(() => {
    const out = new Map();
    for (const plan of plans ?? []) {
      for (const task of plan.tasks ?? []) {
        if (!task.due) continue;
        const list = out.get(task.due) ?? [];
        list.push({
          id: `${plan.id}:${task.id}`,
          planId: plan.id,
          text: task.text,
          plan: titleOf(plan, t('common.untitled')),
          done: Boolean(task.done),
          days: daysUntil(task.due),
        });
        out.set(task.due, list);
      }
    }
    return out;
  }, [plans, t]);

  const cells = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const todayKey = key(today);
  const monthName = cursor.toLocaleDateString(language, { month: 'long', year: 'numeric' });

  // Weekday initials straight from the browser's own locale data, so Russian
  // and Kyrgyz get theirs without a table to maintain.
  const weekdays = useMemo(
    () =>
      // 1 January 2024 was a Monday, which is where the week starts here.
      Array.from({ length: 7 }, (_, i) =>
        new Date(2024, 0, 1 + i).toLocaleDateString(language, { weekday: 'short' }),
      ).map((label) => label.replace('.', '')),
    [language],
  );

  const step = (months) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + months, 1));

  const openCount = [...byDay.values()].flat().filter((d) => !d.done).length;

  return (
    <div className="calendar-page">
      {/* The same compact header as every other module — see ModuleHeader.
          Calendar and Shortlist kept their hero banner after the others lost
          theirs, which made them look like screens from a different app. */}
      <div className="module-header">
        <div className="module-title-row">
          <span className="module-title-mark" aria-hidden="true">
            <ProductIcon product="calendar" size={42} variant="plain" />
          </span>
          <div className="module-title-text">
            <h1>{t('nav.calendar')}</h1>
            <p>{t('calendar.subtitle', { count: openCount })}</p>
          </div>
        </div>
      </div>

      <div className="calendar-body">
        <header className="calendar-head">
          <button
            type="button"
            className="icon-button"
            onClick={() => step(-1)}
            aria-label={t('calendar.previous')}
            title={t('calendar.previous')}
          >
            <Icon name="back" size={18} />
          </button>

          <h2 className="calendar-month">{monthName}</h2>

          <button
            type="button"
            className="icon-button"
            onClick={() => step(1)}
            aria-label={t('calendar.next')}
            title={t('calendar.next')}
          >
            <Icon name="forward" size={18} />
          </button>

          <button
            type="button"
            className="button ghost tiny calendar-today"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            {t('calendar.today')}
          </button>
        </header>

        {/*
          Keyed on the month so React rebuilds the cells when you page, which
          is what replays the sweep. Without the key the same 42 nodes are
          reused and the animation never runs again.
        */}
        <div
          className="calendar-grid"
          role="grid"
          aria-label={monthName}
          key={`${cursor.getFullYear()}-${cursor.getMonth()}`}
        >
          {weekdays.map((day) => (
            <div key={day} className="calendar-weekday" role="columnheader">
              {day}
            </div>
          ))}

          {cells.map((cell, index) => {
            const due = byDay.get(cell.key) ?? [];
            const open = due.filter((item) => !item.done);
            const isToday = cell.key === todayKey;

            return (
              <div
                key={cell.key}
                role="gridcell"
                style={{ '--i': index }}
                className={[
                  'calendar-day',
                  cell.inMonth ? '' : 'is-outside',
                  isToday ? 'is-today' : '',
                  open.length ? 'has-due' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="calendar-date">{cell.date.getDate()}</span>

                <div className="calendar-items">
                  {due.slice(0, VISIBLE).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`calendar-item${item.done ? ' is-done' : ''}${
                        !item.done && item.days < 0 ? ' is-late' : ''
                      }`}
                      title={`${item.text} — ${item.plan}`}
                      onClick={() => onOpenPlan(item.planId)}
                    >
                      {item.text}
                    </button>
                  ))}
                  {due.length > VISIBLE ? (
                    <span className="calendar-more">
                      {t('calendar.more', { count: due.length - VISIBLE })}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/*
          The same month as a list.
          ------------------------------------------------------------------
          Seven columns in 390px gives cells 48px wide — measured — which is
          not enough for a date and a deadline, let alone two. A grid answers
          "when am I free"; on a phone that question cannot be answered at all,
          so the phone gets the question it CAN answer: "what is coming, in
          order".

          Rendered always and switched by CSS rather than by watching the
          window: a resize listener re-renders the whole month on every frame
          of a drag, and this markup is a dozen rows.
        */}
        <ol className="calendar-agenda" aria-label={monthName}>
          {cells
            .filter((cell) => cell.inMonth && (byDay.get(cell.key)?.length ?? 0) > 0)
            .map((cell) => {
              const due = byDay.get(cell.key) ?? [];
              return (
                <li
                  key={cell.key}
                  className={`agenda-day${cell.key === todayKey ? ' is-today' : ''}`}
                >
                  <div className="agenda-date">
                    <strong>{cell.date.getDate()}</strong>
                    <span>
                      {cell.date.toLocaleDateString(language, { weekday: 'short' })}
                    </span>
                  </div>
                  <div className="agenda-items">
                    {due.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`agenda-item${item.done ? ' is-done' : ''}${
                          !item.done && item.days < 0 ? ' is-late' : ''
                        }`}
                        onClick={() => onOpenPlan(item.planId)}
                      >
                        <strong>{item.text}</strong>
                        <span>{item.plan}</span>
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
        </ol>

        {openCount === 0 ? <p className="calendar-empty">{t('calendar.empty')}</p> : null}
      </div>
    </div>
  );
}
