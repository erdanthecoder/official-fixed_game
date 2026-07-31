/**
 * One plan: a list of deadlines, grouped by school.
 *
 * The interesting decision here is that a task row is edited in place rather
 * than in a dialog. Filling in a deadline planner means touching twenty rows in
 * a row; a dialog per row would make that unbearable, and the fields are small
 * enough to sit on the row itself.
 */

import { useMemo, useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import Icon from '../ui/Icon.jsx';
import SaveIndicator from '../SaveIndicator.jsx';
import ShareDialog from '../unisave/ShareDialog.jsx';
import {
  PRIORITIES,
  daysUntil,
  groupBySchool,
  makeTask,
  planStats,
  taskState,
} from '../../lib/templates/tasks.js';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

const FILTERS = [
  { id: 'open', labelKey: 'tasks.filterOpen' },
  { id: 'all', labelKey: 'tasks.filterAll' },
  { id: 'done', labelKey: 'tasks.filterDone' },
];

/** "in 3 days" / "2 days late" / "today" — whichever the date deserves. */
function DueLabel({ task }) {
  const { t } = useT();
  const state = taskState(task);
  if (state === 'none') return <span className="task-due is-none">{t('tasks.noDate')}</span>;

  const days = daysUntil(task.due);
  const text =
    state === 'done'
      ? task.due
      : days === 0
        ? t('tasks.dueToday')
        : days < 0
          ? t('tasks.dueLate', { count: Math.abs(days) })
          : t('tasks.dueIn', { count: days });

  return (
    <span className={`task-due is-${state}`}>
      <Icon name={state === 'overdue' ? 'warning' : 'calendar'} size={14} />
      {text}
    </span>
  );
}

function TaskRow({ task, editable, onPatch, onRemove }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const state = taskState(task);

  return (
    <li className={`task-row is-${state} ${task.done ? 'is-done' : ''}`}>
      <div className="task-main">
        <button
          type="button"
          className="task-tick"
          aria-pressed={task.done}
          aria-label={task.done ? t('tasks.markOpen') : t('tasks.markDone')}
          disabled={!editable}
          onClick={() =>
            onPatch({ done: !task.done, doneAt: task.done ? null : Date.now() })
          }
        >
          <Icon name={task.done ? 'circleCheck' : 'circleEmpty'} size={20} />
        </button>

        <input
          className="task-text"
          value={task.text}
          readOnly={!editable}
          placeholder={t('tasks.taskPlaceholder')}
          aria-label={t('tasks.taskPlaceholder')}
          onChange={(event) => onPatch({ text: event.target.value })}
        />

        <DueLabel task={task} />

        <span
          className="task-flag"
          style={{ color: PRIORITIES.find((p) => p.id === task.priority)?.colour }}
          title={t(PRIORITIES.find((p) => p.id === task.priority)?.labelKey ?? 'tasks.priorityNormal')}
        >
          <Icon name="flag" size={15} />
        </span>

        <button
          type="button"
          className="icon-button small"
          aria-expanded={open}
          aria-label={t('tasks.details')}
          title={t('tasks.details')}
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? 'up' : 'down'} size={16} />
        </button>
      </div>

      {open ? (
        <div className="task-details">
          <label className="field compact">
            <span>{t('tasks.due')}</span>
            <input
              type="date"
              value={task.due ?? ''}
              readOnly={!editable}
              onChange={(event) => onPatch({ due: event.target.value })}
            />
          </label>

          <label className="field compact">
            <span>{t('tasks.school')}</span>
            <input
              type="text"
              value={task.school ?? ''}
              readOnly={!editable}
              placeholder={t('tasks.schoolPlaceholder')}
              onChange={(event) => onPatch({ school: event.target.value })}
            />
          </label>

          <label className="field compact">
            <span>{t('tasks.priority')}</span>
            <select
              value={task.priority ?? 'normal'}
              disabled={!editable}
              onChange={(event) => onPatch({ priority: event.target.value })}
            >
              {PRIORITIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(item.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="field compact wide">
            <span>{t('tasks.notes')}</span>
            <textarea
              rows={2}
              value={task.notes ?? ''}
              readOnly={!editable}
              placeholder={t('tasks.notesPlaceholder')}
              onChange={(event) => onPatch({ notes: event.target.value })}
            />
          </label>

          {editable ? (
            <button type="button" className="button danger-ghost small" onClick={onRemove}>
              <Icon name="trash" size={15} />
              {t('common.delete')}
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default function PlanEditor({ planId, onBack }) {
  const { t } = useT();
  const { plans, update, remove, mayEdit } = useData();

  const plan = plans.find((item) => item.id === planId);
  const editable = mayEdit(plan);

  const [filter, setFilter] = useState('open');
  const [draft, setDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);

  const tasks = plan?.tasks ?? [];
  const stats = useMemo(() => planStats(plan), [plan]);

  const groups = useMemo(() => {
    const filtered = tasks.filter((task) =>
      filter === 'all' ? true : filter === 'done' ? task.done : !task.done,
    );
    return groupBySchool(filtered);
  }, [tasks, filter]);

  const writeTasks = (next, options) => update('plans', planId, { tasks: next }, options);

  const patchTask = (id, patch) =>
    writeTasks(tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)));

  const addTask = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    writeTasks([...tasks, makeTask({ text })], { immediate: true });
    setDraft('');
  };

  if (!plan) {
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

  return (
    <div className="plan-page">
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
            value={plan.title ?? ''}
            readOnly={!editable}
            aria-label={t('tasks.planTitle')}
            onChange={(event) => update('plans', planId, { title: event.target.value })}
            onBlur={(event) =>
              update(
                'plans',
                planId,
                { title: event.target.value.trim() || t('common.untitled') },
                { immediate: true },
              )
            }
          />
          <div className="editor-title-meta">
            <SaveIndicator />
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span>{t('tasks.doneOf', { done: stats.done, total: stats.total })}</span>
          </div>
        </div>

        <div className="editor-header-actions">
          <button type="button" className="button ghost" onClick={() => setSharing(true)}>
            <Icon name="share" size={16} />
            {t('unisave.share')}
          </button>
          {editable ? (
            <button type="button" className="button danger-ghost" onClick={() => setConfirmDelete(true)}>
              {t('common.delete')}
            </button>
          ) : null}
        </div>
      </header>

      <div className="plan-body">
        <div className="plan-summary">
          <div className="plan-progress" role="img" aria-label={t('tasks.percentDone', { percent: stats.percent })}>
            <span style={{ width: `${stats.percent}%` }} />
          </div>
          <div className="plan-counts">
            <span>{t('tasks.percentDone', { percent: stats.percent })}</span>
            {stats.overdue > 0 ? (
              <span className="count-overdue">
                <Icon name="warning" size={14} />
                {t('tasks.overdueCount', { count: stats.overdue })}
              </span>
            ) : null}
            {stats.soon > 0 ? (
              <span className="count-soon">
                <Icon name="clock" size={14} />
                {t('tasks.soonCount', { count: stats.soon })}
              </span>
            ) : null}
          </div>
        </div>

        <div className="plan-controls">
          <div className="segmented" role="group" aria-label={t('tasks.filter')}>
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={filter === item.id ? 'is-active' : ''}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {editable ? (
          <form className="plan-add" onSubmit={addTask}>
            <Icon name="plus" size={17} />
            <input
              type="text"
              value={draft}
              placeholder={t('tasks.addPlaceholder')}
              aria-label={t('tasks.addTask')}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" className="button primary" disabled={!draft.trim()}>
              {t('tasks.addTask')}
            </button>
          </form>
        ) : (
          <p className="board-readonly">
            <Icon name="lock" size={15} className="notice-icon" />
            {t('share.viewerOnly')}
          </p>
        )}

        {groups.length === 0 ? (
          <p className="plan-empty">{t('tasks.nothingHere')}</p>
        ) : (
          groups.map(([school, groupTasks]) => (
            <section key={school || 'ungrouped'} className="plan-group">
              <h2>
                <Icon name={school ? 'school' : 'inbox'} size={16} />
                {school || t('tasks.noSchool')}
                <span className="plan-group-count">{groupTasks.length}</span>
              </h2>
              <ul className="task-list">
                {groupTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    editable={editable}
                    onPatch={(patch) => patchTask(task.id, patch)}
                    onRemove={() =>
                      writeTasks(tasks.filter((item) => item.id !== task.id), { immediate: true })
                    }
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {confirmDelete ? (
        <ConfirmDialog
          title={t('tasks.deletePlanTitle', { name: plan.title })}
          message={t('common.deleteForeverWarning')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            remove('plans', planId);
            onBack();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      ) : null}

      {sharing ? <ShareDialog document={plan} onClose={() => setSharing(false)} /> : null}
    </div>
  );
}
