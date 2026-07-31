import { useMemo, useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import Icon from '../ui/Icon.jsx';
import ItemCard, { EditedMeta } from '../shared/ItemCard.jsx';
import ModuleHeader, { sortItems } from '../shared/ModuleHeader.jsx';
import PromptDialog from '../ui/PromptDialog.jsx';
import TemplateStrip from '../shared/TemplateStrip.jsx';
import { PLAN_TEMPLATES, blankPlan, planStats, sortTasks, taskState } from '../../lib/templates/tasks.js';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

/** The three soonest unfinished deadlines — the reason to open the card. */
function NextUp({ plan }) {
  const { t } = useT();
  const upcoming = sortTasks((plan.tasks ?? []).filter((task) => !task.done)).slice(0, 3);
  if (upcoming.length === 0) return <p className="plan-card-clear">{t('tasks.allClear')}</p>;

  return (
    <ul className="plan-card-next">
      {upcoming.map((task) => (
        <li key={task.id} className={`is-${taskState(task)}`}>
          <Icon name="circleEmpty" size={13} />
          <span>{task.text || t('tasks.untitledTask')}</span>
        </li>
      ))}
    </ul>
  );
}

export default function TasksDashboard({ onOpen }) {
  const { t } = useT();
  const { plans, create, update, remove, duplicate } = useData();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = plans.filter((plan) => {
      if (!needle) return true;
      if (String(plan.title ?? '').toLowerCase().includes(needle)) return true;
      return (plan.tasks ?? []).some((task) =>
        [task.text, task.school, task.notes].some((field) =>
          String(field ?? '').toLowerCase().includes(needle),
        ),
      );
    });
    return sortItems(filtered, sort);
  }, [plans, query, sort]);

  const startPlan = (title, data) => {
    const plan = create('plans', { title, ...data }, { idPrefix: 'plan' });
    onOpen(plan.id);
  };

  const startBlank = () => startPlan(t('common.untitled'), blankPlan());
  const startFromTemplate = (template) => startPlan(t(template.labelKey), template.build());

  return (
    <div className="dashboard">
      <ModuleHeader
        slot="tasks"
        title={t('tasks.title')}
        subtitle={t('tasks.subtitle')}
        count={`${visible.length} · ${t('tasks.title')}`}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        searchPlaceholder={t('tasks.searchPlaceholder')}
        actions={
          <button type="button" className="button primary on-scenery" onClick={startBlank}>
            <Icon name="plus" size={17} />
            {t('tasks.newPlan')}
          </button>
        }
      />

      <TemplateStrip
        templates={PLAN_TEMPLATES}
        onPick={startFromTemplate}
        onBlank={startBlank}
        blankLabelKey="tasks.blankPlan"
        blankHintKey="tasks.blankHint"
        ariaLabel={t('tasks.newPlan')}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon="flag"
          title={query ? t('notes.noMatches') : t('tasks.emptyState')}
          body={query ? t('notes.noMatchesBody', { query }) : t('tasks.emptyBody')}
          action={
            query ? null : (
              <button type="button" className="button primary" onClick={startBlank}>
                {t('tasks.newPlan')}
              </button>
            )
          }
        />
      ) : (
        <div className="doc-grid">
          {visible.map((plan) => {
            const stats = planStats(plan);
            return (
              <ItemCard
                key={plan.id}
                title={plan.title || t('common.untitled')}
                accent="#c5372c"
                thumb={
                  <span className="plan-card-thumb">
                    <span className="plan-progress">
                      <span style={{ width: `${stats.percent}%` }} />
                    </span>
                    <NextUp plan={plan} />
                  </span>
                }
                meta={
                  <EditedMeta
                    timestamp={plan.updatedAt}
                    extra={
                      stats.overdue > 0
                        ? t('tasks.overdueCount', { count: stats.overdue })
                        : t('tasks.doneOf', { done: stats.done, total: stats.total })
                    }
                  />
                }
                onOpen={() => onOpen(plan.id)}
                actions={[
                  { label: t('common.open'), run: () => onOpen(plan.id) },
                  { label: t('common.rename'), run: () => setRenaming(plan) },
                  { label: t('common.copy'), run: () => duplicate('plans', plan.id) },
                  { label: t('common.delete'), run: () => setDeleting(plan), danger: true },
                ]}
              />
            );
          })}
        </div>
      )}

      {renaming ? (
        <PromptDialog
          title={t('tasks.renamePlan')}
          label={t('tasks.planTitle')}
          initialValue={renaming.title}
          confirmLabel={t('common.save')}
          cancelLabel={t('common.cancel')}
          onConfirm={(title) =>
            update(
              'plans',
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
          title={t('tasks.deletePlanTitle', { name: deleting.title })}
          message={t('common.deleteForeverWarning')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => remove('plans', deleting.id)}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}
