import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.ts'
import { useProfile } from '../profile/profile-context.ts'
import { encouragement, localDate, weekBounds } from '../sessions/rules.ts'
import { sessionColumns } from '../sessions/data.ts'
import type { SessionRow } from '../sessions/data.ts'
import { displayWeight } from '../units/weight.ts'
import { formatDate } from '../lib/date.ts'
type Point = {
  exercise_id: string
  exercise_name: string
  equipment_key: string
  equipment_label: string
  session_id: string
  completed_at: string
  value: number
  metric: string
}
export function HomePage() {
  const { client } = useAuth()
  const { profile } = useProfile()
  const [active, setActive] = useState<SessionRow | null | undefined>()
  const [days, setDays] = useState<string[] | null>(null)
  const [recent, setRecent] = useState<SessionRow[] | null>(null)
  const [points, setPoints] = useState<Point[] | null>(null)
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState('')
  const [today, setToday] = useState(() => localDate(new Date()))
  useEffect(() => {
    const tick = () => setToday(localDate(new Date()))
    const timer = window.setInterval(tick, 60000)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', tick)
    }
  }, [])
  useEffect(() => {
    if (!client) return
    let live = true
    const { start, end } = weekBounds()
    const since = new Date()
    since.setDate(since.getDate() - 84)
    const fail = (key: string) => {
      if (live) setErrors((e) => ({ ...e, [key]: true }))
    }
    void client
      .from('workout_sessions')
      .select(sessionColumns)
      .eq('user_id', profile.id)
      .eq('status', 'in_progress')
      .maybeSingle<SessionRow>()
      .then(({ data, error }) => {
        if (error) fail('active')
        else if (live) setActive(data)
      })
    void client
      .rpc('weekly_attendance', {
        p_start: start.toISOString(),
        p_end: end.toISOString(),
        p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      .then(({ data, error }) => {
        if (error) fail('days')
        else if (live) setDays((data as { day: string }[]).map((d) => d.day))
      })
    void client
      .from('workout_sessions')
      .select(sessionColumns)
      .eq('user_id', profile.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(3)
      .returns<SessionRow[]>()
      .then(({ data, error }) => {
        if (error) fail('recent')
        else if (live) setRecent(data)
      })
    void client
      .rpc('exercise_progress', { p_since: since.toISOString() })
      .then(({ data, error }) => {
        if (error) fail('points')
        else if (live) setPoints(data as Point[])
      })
    return () => {
      live = false
    }
  }, [client, profile.id, attempt, today])
  const goal = profile.weekly_goal ?? 4
  const name = profile.preferred_name ?? 'there'
  const bounds = weekBounds()
  const options = [
    ...new Map(
      (points ?? []).map((p) => [`${p.exercise_id}:${p.equipment_key}`, p]),
    ).entries(),
  ]
  const key = options.some(([key]) => key === selected)
    ? selected
    : options[0]?.[0]
  const series = (points ?? [])
    .filter((p) => `${p.exercise_id}:${p.equipment_key}` === key)
    .toSorted((a, b) => a.completed_at.localeCompare(b.completed_at))
    .map((point) =>
      point.metric === 'kg'
        ? {
            ...point,
            value: Number(
              displayWeight(point.value, profile.preferred_weight_unit),
            ),
            metric: profile.preferred_weight_unit,
          }
        : point,
    )
  function retry(label: string) {
    return (
      <div className="inline-error">
        <p role="alert">Unable to load {label}.</p>
        <button
          className="secondary-button"
          onClick={() => {
            setErrors({})
            setAttempt((a) => a + 1)
          }}
        >
          Retry {label}
        </button>
      </div>
    )
  }
  return (
    <>
      <header className="dashboard-heading">
        <p className="eyebrow">Your training</p>
        <h1>Ready to put the work in, {name}?</h1>
      </header>
      <div className="dashboard-grid">
        <section className="panel workout-focus">
          <h2>This week</h2>
          {errors.days ? (
            retry('weekly progress')
          ) : days === null ? (
            <div className="weekly-loading skeleton-block" role="status">
              <span className="sr-only">Loading this week</span>
            </div>
          ) : (
            <>
              <p className="motivation">
                {encouragement(days.length, goal, name)}
              </p>
              <p className="weekly-score">
                <strong className="large-number">{days.length}</strong>
                <span>/ {goal} workouts</span>
              </p>
              <progress
                value={Math.min(days.length, goal)}
                max={goal}
                aria-label={`${days.length} of ${goal} gym days`}
              />
              <div className="week-strip">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
                  const date = new Date(bounds.start)
                  date.setDate(date.getDate() + i)
                  const done = days.includes(localDate(date))
                  return (
                    <span
                      className={done ? 'day done' : 'day'}
                      key={i}
                      aria-label={`${date.toLocaleDateString(undefined, { weekday: 'long' })}: ${done ? 'workout completed' : 'no completed workout'}`}
                    >
                      <span>{label}</span>
                      <strong>{done ? 'Done' : date.getDate()}</strong>
                    </span>
                  )
                })}
              </div>
            </>
          )}
          {errors.active ? (
            retry('active workout')
          ) : active === undefined ? (
            <div className="action-loading skeleton-block" role="status">
              <span className="sr-only">Checking active workout</span>
            </div>
          ) : (
            <Link
              className="button-link primary-workout"
              to={active ? `/sessions/${active.id}` : '/workouts?start=1'}
            >
              {active ? 'Resume workout' : 'Start workout'}
            </Link>
          )}
          {active && <p className="muted">{active.name}</p>}
          <Link className="secondary-link" to="/workouts/new">
            Create workout
          </Link>
        </section>
        <section className="panel recent-panel">
          <h2>Recent workouts</h2>
          {errors.recent ? (
            retry('recent workouts')
          ) : recent === null ? (
            <div className="recent-loading" role="status">
              <span className="sr-only">Loading recent workouts</span>
              <span className="skeleton-line" />
              <span className="skeleton-line" />
              <span className="skeleton-line skeleton-line-short" />
            </div>
          ) : !recent.length ? (
            <div className="empty-state">
              <h3>Your first session belongs here.</h3>
              <p>Complete a workout to start building your history.</p>
            </div>
          ) : (
            <ul className="plain-list">
              {recent.map((s) => (
                <li key={s.id}>
                  <Link
                    className="recent-workout-link"
                    to={`/sessions/${s.id}`}
                  >
                    <span>{s.name}</span>
                    <time dateTime={s.completed_at!}>
                      {formatDate(s.completed_at!)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel progress-panel">
          <h2>Exercise progress</h2>
          <p className="muted">
            Your best set in each completed session, over the last 12 weeks.
          </p>
          {errors.points ? (
            retry('exercise progress')
          ) : points === null ? (
            <div className="chart-area skeleton" role="status">
              Loading progress...
            </div>
          ) : !options.length ? (
            <div className="chart-area empty-state">
              <h3>Progress starts with your first workout.</h3>
              <p>Your recorded sessions will appear here.</p>
            </div>
          ) : (
            <>
              <label>
                Exercise and equipment
                <select
                  value={key}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {options.map(([key, p]) => (
                    <option key={key} value={key}>
                      {p.exercise_name} / {p.equipment_label} (
                      {p.equipment_key.slice(0, 4)})
                    </option>
                  ))}
                </select>
              </label>
              {series.length === 1 ? (
                <div className="current-best">
                  <span>Current best</span>
                  <strong>
                    {series[0]!.value} {series[0]!.metric}
                  </strong>
                  <p>
                    First session recorded. Another session will show your
                    trend.
                  </p>
                </div>
              ) : (
                <ProgressChart points={series} />
              )}
              <div className="progress-values">
                <table>
                  <caption>Recorded values</caption>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Maximum ({series[0]?.metric})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((p) => (
                      <tr key={p.session_id}>
                        <td>
                          <time dateTime={p.completed_at}>
                            {formatDate(p.completed_at)}
                          </time>
                        </td>
                        <td>
                          {p.value} {p.metric}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
function ProgressChart({ points }: { points: Point[] }) {
  const values = points.map((p) => Number(p.value))
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const first = new Date(points[0]?.completed_at ?? 0).getTime()
  const last = new Date(points.at(-1)?.completed_at ?? 0).getTime()
  const xy = points.map((p) => ({
    x:
      last === first
        ? 50
        : 5 +
          ((new Date(p.completed_at).getTime() - first) / (last - first)) * 90,
    y: 50 - ((Number(p.value) - min) / range) * 40,
    p,
  }))
  return (
    <div className="chart-area">
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Maximum ${points[0]?.metric} per session. Recorded values are available below.`}
      >
        <line x1="5" y1="50" x2="95" y2="50" className="chart-axis" />
        <polyline
          points={xy.map((v) => `${v.x},${v.y}`).join(' ')}
          className="chart-line"
          vectorEffect="non-scaling-stroke"
        />
        {xy.map(({ x, y, p }) => (
          <g key={p.session_id}>
            <title>
              {formatDate(p.completed_at)}: {p.value} {p.metric}
            </title>
            <circle cx={x} cy={y} r="4" className="chart-hit-area" />
            <circle cx={x} cy={y} r="1.8" className="chart-dot" />
          </g>
        ))}
      </svg>
      <div className="chart-labels" aria-hidden="true">
        <span>{formatDate(points[0]!.completed_at)}</span>
        <span>{formatDate(points.at(-1)!.completed_at)}</span>
      </div>
    </div>
  )
}
