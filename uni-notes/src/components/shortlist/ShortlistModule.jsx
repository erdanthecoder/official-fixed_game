/**
 * Shortlist.
 *
 * The universities you are choosing between, as one table that knows what its
 * own columns mean. Sheets could hold the same rows, but a spreadsheet cannot
 * tell you that two offers are in and a deadline is nine days out, because to
 * it every cell is just a cell.
 *
 * One document, edited in place. There is no separate "open" step and no
 * dashboard of shortlists to wade through first: most people are choosing
 * between universities once, so the app opens on the thing itself and makes
 * one for you if there is none. The document is an ordinary shared document,
 * so it inherits sharing, presence and All files without any of that being
 * written again here — a parent can be invited to look at the same table.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import ProductIcon from '../brand/ProductIcon.jsx';
import Facepile from '../collab/Facepile.jsx';
import ShareDialog from '../unisave/ShareDialog.jsx';
import { STAGES, makeEntry, makeShortlist, shortlistStats, sortEntries } from '../../lib/templates/shortlist.js';
import { daysUntil } from '../../lib/templates/tasks.js';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

export default function ShortlistModule() {
  const { t } = useT();
  const { shortlists, create, update } = useData();
  const [sharing, setSharing] = useState(false);

  // The first one, or a new one. A chooser between shortlists would be a
  // screen most people never need.
  const list = shortlists?.[0] ?? null;

  const entries = useMemo(() => sortEntries(list?.entries), [list?.entries]);
  const stats = shortlistStats(list);

  const start = () => create('shortlists', makeShortlist({ title: t('shortlist.defaultTitle') }), { idPrefix: 'shortlist' });

  /*
   * Every edit rewrites the whole `entries` array, so each one has to be built
   * from the newest version of it — not from whatever this render closed over.
   * Typing in one field and immediately changing another was losing the first
   * edit: both writes started from the same snapshot and the second won. Caught
   * by a browser test that filled three rows faster than React could re-render,
   * which is exactly what a fast typist does.
   *
   * A ref, updated on every render, is always current at the moment the event
   * fires.
   */
  const latest = useRef(list);
  useEffect(() => {
    latest.current = list;
  });

  const write = (build) => {
    const current = latest.current;
    if (!current) return;
    const next = build(current.entries ?? []);
    latest.current = { ...current, entries: next };
    update('shortlists', current.id, { entries: next }, { immediate: true });
  };

  const patch = (id, fields) =>
    write((entries) => entries.map((e) => (e.id === id ? { ...e, ...fields } : e)));

  const add = () => write((entries) => [...entries, makeEntry()]);

  const remove = (id) => write((entries) => entries.filter((e) => e.id !== id));

  return (
    <div className="shortlist-page">
      <div className="module-header">
        <div className="module-title-row">
          <span className="module-title-mark" aria-hidden="true">
            <ProductIcon product="shortlist" size={42} variant="plain" />
          </span>
          <div className="module-title-text">
            <h1>{t('nav.shortlist')}</h1>
            <p>
              {list
                ? t('shortlist.summary', {
                    total: stats.total,
                    applied: stats.applied,
                    offers: stats.offers,
                  })
                : t('nav.shortlistHint')}
            </p>
          </div>
        </div>
      </div>

      <div className="shortlist-body">
        {!list ? (
          <div className="shortlist-start">
            <p>{t('shortlist.empty')}</p>
            <button type="button" className="button primary" onClick={start}>
              <Icon name="plus" size={16} />
              {t('shortlist.create')}
            </button>
          </div>
        ) : (
          <>
            <header className="shortlist-head">
              <Facepile document={list} onShare={() => setSharing(true)} />
              <button type="button" className="button ghost" onClick={() => setSharing(true)}>
                <Icon name="share" size={16} />
                {t('common.share')}
              </button>
              <button type="button" className="button primary" onClick={add}>
                <Icon name="plus" size={16} />
                {t('shortlist.add')}
              </button>
            </header>

            {entries.length === 0 ? (
              <p className="shortlist-none">{t('shortlist.none')}</p>
            ) : (
              <ul className="shortlist-rows">
                {entries.map((entry, index) => {
                  const days = entry.deadline ? daysUntil(entry.deadline) : null;
                  const late = days !== null && days < 0 && entry.stage === 'looking';
                  const stage = STAGES.find((s) => s.id === entry.stage) ?? STAGES[0];

                  return (
                    <li
                      key={entry.id}
                      className={`shortlist-row tone-${stage.tone}`}
                      style={{ '--i': index }}
                    >
                      <div className="shortlist-main">
                        <input
                          className="shortlist-name"
                          value={entry.name}
                          placeholder={t('shortlist.namePlaceholder')}
                          aria-label={t('shortlist.name')}
                          onChange={(e) => patch(entry.id, { name: e.target.value })}
                        />
                        <input
                          className="shortlist-course"
                          value={entry.course}
                          placeholder={t('shortlist.coursePlaceholder')}
                          aria-label={t('shortlist.course')}
                          onChange={(e) => patch(entry.id, { course: e.target.value })}
                        />
                      </div>

                      <div className="shortlist-facts">
                        <label className="shortlist-field">
                          <span>{t('shortlist.tuition')}</span>
                          <input
                            value={entry.tuition}
                            inputMode="numeric"
                            placeholder="—"
                            onChange={(e) => patch(entry.id, { tuition: e.target.value })}
                          />
                        </label>

                        <label className="shortlist-field">
                          <span>{t('shortlist.deadline')}</span>
                          <input
                            type="date"
                            value={entry.deadline}
                            onChange={(e) => patch(entry.id, { deadline: e.target.value })}
                          />
                        </label>

                        <label className="shortlist-field">
                          <span>{t('shortlist.stage')}</span>
                          <select
                            className="share-role"
                            value={entry.stage}
                            onChange={(e) => patch(entry.id, { stage: e.target.value })}
                          >
                            {STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {t(s.labelKey)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="shortlist-end">
                        {days !== null ? (
                          <span className={`shortlist-days${late ? ' is-late' : ''}`}>
                            {late
                              ? t('shortlist.daysLate', { count: Math.abs(days) })
                              : t('shortlist.daysLeft', { count: days })}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="icon-button small"
                          title={t('common.delete')}
                          aria-label={`${t('common.delete')} — ${entry.name || t('shortlist.name')}`}
                          onClick={() => remove(entry.id)}
                        >
                          <Icon name="close" size={15} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {sharing && list ? (
        <ShareDialog document={list} onClose={() => setSharing(false)} />
      ) : null}
    </div>
  );
}
