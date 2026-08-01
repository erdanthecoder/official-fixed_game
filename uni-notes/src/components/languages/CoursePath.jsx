/**
 * The path down a deck: one node per lesson, finished ones behind you.
 *
 * It winds rather than running straight down, which is not decoration. A
 * straight list of twenty identical circles reads as a chore; a path reads as
 * somewhere you are partway along. The offset is a sine of the index, so it
 * needs no layout maths and never collides with itself.
 *
 * Locked lessons are shown, not hidden. Seeing that there are nine more is the
 * point — hiding them makes the deck feel bottomless.
 */

import Icon from '../ui/Icon.jsx';
import { DAILY_GOALS, MAX_HEARTS, heartsReturnIn } from '../../lib/course.js';
import { useT } from '../../i18n/index.jsx';

function Stat({ icon, value, label, tone = '' }) {
  return (
    <div className={`course-stat ${tone}`}>
      <Icon name={icon} size={18} />
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

export default function CoursePath({ deck, state, onStart, onSetGoal, onPractise }) {
  const { t } = useT();
  const { lessons, progress, hearts, streak, goalXp, todayXp, goalMet, percent } = state;

  const waitMs = heartsReturnIn(progress);
  const waitMinutes = Math.ceil(waitMs / 60000);

  return (
    <div className="course-path">
      <header className="course-head">
        <div className="course-stats">
          <Stat
            icon="flame"
            value={streak}
            label={t('course.dayStreak', { count: streak })}
            tone={streak > 0 ? 'is-hot' : ''}
          />
          <Stat icon="bolt" value={progress.xp} label={t('course.totalXp')} />
          <Stat
            icon="heart"
            value={hearts}
            label={hearts < MAX_HEARTS && waitMs > 0 ? t('course.inMinutes', { count: waitMinutes }) : t('course.hearts')}
            tone={hearts === 0 ? 'is-empty' : ''}
          />
        </div>

        <div className="course-goal">
          <div className="course-goal-bar" role="progressbar" aria-valuenow={todayXp} aria-valuemax={goalXp}>
            <span style={{ width: `${Math.min(100, (todayXp / goalXp) * 100)}%` }} />
          </div>
          <div className="course-goal-row">
            <span>
              {goalMet ? (
                <>
                  <Icon name="circleCheck" size={15} className="done-icon" />
                  {t('course.goalMet')}
                </>
              ) : (
                t('course.goalProgress', { xp: todayXp, goal: goalXp })
              )}
            </span>
            <label className="select-field small">
              <span className="sr-only">{t('course.dailyGoal')}</span>
              <select value={progress.goal} onChange={(event) => onSetGoal(event.target.value)}>
                {DAILY_GOALS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {t(g.labelKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <ol className="path-list">
        {lessons.map((lesson) => {
          const finished = lesson.index < progress.done;
          const current = lesson.index === progress.done;
          const locked = lesson.index > progress.done;
          // A gentle wander; ±34% of the track keeps every node on screen.
          const offset = Math.sin(lesson.index * 1.05) * 34;

          return (
            <li key={lesson.index} style={{ '--offset': `${offset}%` }}>
              <button
                type="button"
                className={`path-node ${finished ? 'is-done' : ''} ${current ? 'is-current' : ''}`}
                disabled={locked || (current && hearts === 0)}
                onClick={() => onStart(lesson.index)}
                aria-label={t('course.lessonN', { n: lesson.index + 1 })}
              >
                <Icon
                  name={finished ? 'circleCheck' : locked ? 'lock' : 'star'}
                  size={finished || locked ? 24 : 28}
                />
                {current ? <span className="path-pulse" aria-hidden="true" /> : null}
              </button>
              <span className="path-label">
                {t('course.lessonN', { n: lesson.index + 1 })}
                <small>{lesson.cards.map((c) => c.front).join(' · ')}</small>
              </span>
            </li>
          );
        })}
      </ol>

      {progress.done > 0 ? (
        <div className="course-practise">
          <p>{t('course.practiseHint')}</p>
          <button type="button" className="button ghost" onClick={onPractise}>
            <Icon name="redo" size={16} />
            {t('course.practise')}
          </button>
        </div>
      ) : null}

      {lessons.length > 0 && percent === 100 ? (
        <p className="course-finished">
          <Icon name="trophy" size={20} />
          {t('course.deckFinished', { name: deck.name })}
        </p>
      ) : null}
    </div>
  );
}
