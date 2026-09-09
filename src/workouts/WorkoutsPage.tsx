import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.ts'
import { listWorkoutSummaries } from './templates.ts'
import type { WorkoutSummary } from './templates.ts'
export function WorkoutsPage() {
  const { client, state } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [templates, setTemplates] = useState<WorkoutSummary[] | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [startId] = useState(() => crypto.randomUUID())
  const userId = state.status === 'ready' ? state.session?.user.id : undefined
  useEffect(() => {
    if (!client || !userId) return
    let active = true
    void listWorkoutSummaries(client, userId)
      .then((rows) => {
        if (active) setTemplates(rows)
      })
      .catch(() => {
        if (active) setError('Unable to load your workouts.')
      })
    return () => {
      active = false
    }
  }, [client, userId, attempt])
  async function start(id: string) {
    if (!client || busy) return
    setBusy(id)
    setError('')
    try {
      const { data, error } = await client.rpc('start_workout', {
        p_id: startId,
        p_template_id: id,
      })
      if (error) throw error
      navigate(`/sessions/${String(data)}`)
    } catch {
      setError(
        'Unable to start. Make sure each exercise has a set, then retry when connected. An existing active workout will be resumed.',
      )
    } finally {
      setBusy(null)
    }
  }
  if (params.has('start') && templates && !templates.some((t) => t.ready))
    return (
      <Navigate to="/workouts/new" state={{ needsTemplate: true }} replace />
    )
  return (
    <>
      <div className="section-row">
        <div>
          <p className="eyebrow">Your training</p>
          <h1>{params.has('start') ? 'Choose a workout' : 'Workouts'}</h1>
        </div>
        <Link className="button-link" to="/workouts/new">
          Create workout
        </Link>
      </div>
      {error && (
        <div className="panel">
          <p className="error" role="alert">
            {error}
          </p>
          <button
            className="secondary-button"
            onClick={() => {
              setError('')
              setAttempt((a) => a + 1)
            }}
          >
            Retry workouts
          </button>
        </div>
      )}
      {!templates && !error ? (
        <div className="panel skeleton" role="status">
          Loading workouts...
        </div>
      ) : templates?.length ? (
        <ul className="workout-list">
          {templates.map((t) => (
            <li className="panel section-row" key={t.id}>
              <div>
                <h2>{t.name}</h2>
                <Link to={`/workouts/${t.id}/edit`}>
                  Edit exercises and sets
                </Link>
              </div>
              {t.ready ? (
                <button disabled={!!busy} onClick={() => void start(t.id)}>
                  {busy === t.id ? 'Starting...' : 'Start workout'}
                </button>
              ) : (
                <Link className="secondary-link" to={`/workouts/${t.id}/edit`}>
                  Add sets to this draft
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        templates && (
          <section className="panel empty-state">
            <h2>Your routine starts here.</h2>
            <p>
              Create your first workout, add exercises and sets, then start your
              session.
            </p>
            <Link to="/workouts/new">Create your first workout</Link>
          </section>
        )
      )}
    </>
  )
}
