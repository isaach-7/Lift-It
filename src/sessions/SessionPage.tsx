import { rpcRow } from '../lib/rpc-row.ts'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.ts'
import { listExercises } from '../exercises/exercise-library.ts'
import type { Exercise } from '../exercises/exercise-library.ts'
import { loadSession, setColumns } from './data.ts'
import type { LoggedSet, SessionExercise, SessionRow } from './data.ts'
import { RestTimer } from './RestTimer.tsx'

type Draft = {
  reps: string
  weight: string
  scope: 'once' | 'permanent' | ''
  dirty: boolean
}
export function SessionPage() {
  const { id } = useParams()
  const { client, state } = useAuth()
  const navigate = useNavigate()
  const userId = state.status === 'ready' ? state.session?.user.id : undefined
  const storageKey = `liftit-session-${userId}-${id}`
  const [session, setSession] = useState<SessionRow | null>(null)
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [sets, setSets] = useState<LoggedSet[]>([])
  const [library, setLibrary] = useState<Exercise[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [recommendations, setRecommendations] = useState<
    Record<string, number>
  >({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<string[]>([])
  const [finishError, setFinishError] = useState('')
  const [finishing, setFinishing] = useState(false)
  const [timer, setTimer] = useState<number | null>(null)
  const [storageError, setStorageError] = useState(false)
  const inFlight = useRef(new Set<string>())
  const addIds = useRef<Record<string, string>>({})
  useEffect(() => {
    if (!client || !id || !userId) return
    let active = true
    void Promise.all([
      loadSession(client, id),
      listExercises(client),
      client
        .from('exercise_progression')
        .select('exercise_id,equipment_key,current_weight')
        .eq('user_id', userId),
    ])
      .then(([data, library, progression]) => {
        if (!active) return
        if (progression.error) throw progression.error
        setSession(data.session)
        setExercises(data.exercises)
        setSets(data.sets)
        setLibrary(library)
        setRecommendations(
          Object.fromEntries(
            (progression.data ?? []).map((p) => [
              `${p.exercise_id}:${p.equipment_key}`,
              p.current_weight,
            ]),
          ),
        )
        try {
          const raw = localStorage.getItem(storageKey)
          if (raw) {
            const parsed = JSON.parse(raw) as {
              drafts?: Record<string, Draft>
              timer?: number
            }
            const restored: Record<string, Draft> = {}
            for (const s of data.sets) {
              const draft = parsed.drafts?.[s.id]
              if (
                !s.completed_at &&
                draft &&
                typeof draft.reps === 'string' &&
                typeof draft.weight === 'string' &&
                ['', 'once', 'permanent'].includes(draft.scope)
              )
                restored[s.id] = draft
            }
            setDrafts(restored)
            if (typeof parsed.timer === 'number') setTimer(parsed.timer)
          }
        } catch {
          setStorageError(true)
        }
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [client, id, userId, storageKey, attempt])
  useEffect(() => {
    if (loading || loadError) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ drafts, timer }))
    } catch {
      // Surface failure of the external recovery store instead of implying durability.
      // oxlint-disable-next-line react/set-state-in-effect
      setStorageError(true)
    }
  }, [drafts, timer, storageKey, loading, loadError])
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (inFlight.current.size || Object.values(drafts).some((d) => d.dirty))
        event.preventDefault()
    }
    window.addEventListener('beforeunload', unload)
    return () => window.removeEventListener('beforeunload', unload)
  }, [drafts])
  function draftFor(s: LoggedSet, e: SessionExercise): Draft {
    return (
      drafts[s.id] ?? {
        reps: s.target_reps?.toString() ?? '',
        weight:
          (e.auto_increment_enabled && s.set_type !== 'warmup'
            ? (recommendations[`${e.exercise_id}:${e.equipment_key}`] ??
              s.target_weight)
            : s.target_weight
          )?.toString() ?? '',
        scope: '',
        dirty: false,
      }
    )
  }
  function edit(s: LoggedSet, e: SessionExercise, patch: Partial<Draft>) {
    setDrafts((d) => ({
      ...d,
      [s.id]: { ...draftFor(s, e), ...patch, dirty: true },
    }))
  }
  function acceptSaved(saved: LoggedSet, e: SessionExercise) {
    setSets((rows) => rows.map((row) => (row.id === saved.id ? saved : row)))
    setDrafts((old) => {
      const next = { ...old }
      delete next[saved.id]
      return next
    })
    if (
      e.auto_increment_enabled &&
      saved.set_type !== 'warmup' &&
      saved.next_weight != null
    )
      setRecommendations((old) => ({
        ...old,
        [`${e.exercise_id}:${e.equipment_key}`]: saved.next_weight!,
      }))
    if (e.rest_timer_seconds > 0)
      setTimer(
        new Date(saved.completed_at!).getTime() + e.rest_timer_seconds * 1000,
      )
    setErrors((old) => ({ ...old, [saved.id]: '' }))
  }
  async function log(s: LoggedSet, e: SessionExercise, bodyweight: boolean) {
    if (!client || inFlight.current.has(s.id) || finishing) return
    const d = draftFor(s, e)
    const reps = Number(d.reps)
    const weight = bodyweight ? null : Number(d.weight)
    if (
      !d.reps ||
      !Number.isInteger(reps) ||
      reps < 0 ||
      reps > 1000 ||
      (!bodyweight &&
        (!d.weight ||
          !Number.isFinite(weight) ||
          weight! < 0 ||
          weight! >= 100000))
    ) {
      setErrors((old) => ({
        ...old,
        [s.id]: 'Enter valid reps and weight before saving.',
      }))
      return
    }
    const original = e.auto_increment_enabled
      ? (recommendations[`${e.exercise_id}:${e.equipment_key}`] ??
        s.target_weight)
      : s.target_weight
    if (
      e.auto_increment_enabled &&
      s.set_type !== 'warmup' &&
      !bodyweight &&
      original != null &&
      weight !== original &&
      !d.scope
    ) {
      setErrors((old) => ({
        ...old,
        [s.id]:
          'Choose whether your weight override is for this set only or going forward.',
      }))
      return
    }
    inFlight.current.add(s.id)
    setPending([...inFlight.current])
    setErrors((old) => ({ ...old, [s.id]: '' }))
    try {
      const { data, error } = await client.rpc('log_workout_set', {
        p_id: s.id,
        p_reps: reps,
        p_weight: weight,
        p_scope: d.scope || null,
      })
      if (error) throw error
      acceptSaved(rpcRow<LoggedSet>(data), e)
    } catch {
      // A lost response may follow a committed write. Read the authoritative row once.
      try {
        const { data, error } = await client
          .from('sets')
          .select(setColumns)
          .eq('id', s.id)
          .single<LoggedSet>()
        if (!error && data?.completed_at) {
          acceptSaved(data, e)
          return
        }
      } catch {
        /* Preserve the draft when confirmation is still unavailable. */
      }
      setErrors((old) => ({
        ...old,
        [s.id]:
          'Save not confirmed. Your values are preserved. Retry this set.',
      }))
      setDrafts((old) => ({ ...old, [s.id]: { ...d, dirty: true } }))
    } finally {
      inFlight.current.delete(s.id)
      setPending([...inFlight.current])
    }
  }
  async function add(e: SessionExercise) {
    if (!client || finishing || inFlight.current.has(e.id)) return
    inFlight.current.add(e.id)
    setPending([...inFlight.current])
    setErrors((old) => ({ ...old, [e.id]: '' }))
    const requestId = addIds.current[e.id] ?? crypto.randomUUID()
    addIds.current[e.id] = requestId
    try {
      const { data, error } = await client.rpc('add_workout_set', {
        p_id: requestId,
        p_exercise_id: e.id,
        p_type: 'standard',
      })
      if (error) throw error
      const saved = rpcRow<LoggedSet>(data)
      setSets((rows) =>
        rows.some((s) => s.id === saved.id) ? rows : [...rows, saved],
      )
      delete addIds.current[e.id]
    } catch {
      setErrors((old) => ({
        ...old,
        [e.id]: 'Unable to add set. Retry to confirm it.',
      }))
    } finally {
      inFlight.current.delete(e.id)
      setPending([...inFlight.current])
    }
  }
  async function finish(abandon = false) {
    if (!client || !id || finishing || inFlight.current.size) return
    if (
      !abandon &&
      (Object.values(errors).some(Boolean) ||
        Object.values(drafts).some((d) => d.dirty))
    ) {
      setFinishError('Save or resolve your entered sets before finishing.')
      return
    }
    if (!abandon && !sets.some((s) => s.completed_at)) {
      setFinishError('Save at least one completed set first.')
      return
    }
    if (
      (abandon || sets.some((s) => !s.completed_at)) &&
      !window.confirm(
        abandon
          ? 'Abandon this workout? It will not count towards your goal.'
          : 'Finish with remaining planned sets incomplete?',
      )
    )
      return
    setFinishing(true)
    setFinishError('')
    try {
      const { error } = await client.rpc('finish_workout', {
        p_id: id,
        p_abandon: abandon,
      })
      if (error) throw error
      try {
        localStorage.removeItem(storageKey)
      } catch {
        /* Server completion is authoritative. */
      }
      navigate('/')
    } catch {
      setFinishError('Unable to confirm completion. Retry when connected.')
    } finally {
      setFinishing(false)
    }
  }
  if (loading)
    return (
      <section className="panel skeleton" role="status">
        Loading your session...
      </section>
    )
  if (loadError || !session)
    return (
      <section className="panel">
        <p role="alert">Unable to load this session.</p>
        <button
          onClick={() => {
            setLoading(true)
            setLoadError(false)
            setAttempt((a) => a + 1)
          }}
        >
          Retry session
        </button>
      </section>
    )
  const active = session.status === 'in_progress'
  return (
    <>
      <p className="eyebrow">
        {active ? 'Workout in progress' : session.status}
      </p>
      <h1>{session.name}</h1>
      {storageError && (
        <p role="alert">
          Local recovery storage is unavailable. Keep this page open until
          entered sets are saved.
        </p>
      )}
      {active && (
        <RestTimer key={timer} end={timer} onSkip={() => setTimer(null)} />
      )}
      {exercises.map((e) => {
        const exercise = library.find((x) => x.id === e.exercise_id)
        const bodyweight =
          exercise?.equipment_type === 'bodyweight' && !e.uses_added_weight
        return (
          <section className="panel" key={e.id}>
            <h2>{exercise?.name ?? 'Exercise'}</h2>
            <p className="muted">
              {e.equipment_label} / {e.rep_range_lower}-{e.rep_range_upper} reps
              {e.auto_increment_enabled ? ' / Auto-progression on' : ''}
            </p>
            {exercise && (
              <details>
                <summary>Instructions</summary>
                <ol>
                  {exercise.instructions.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </details>
            )}
            {sets
              .filter((s) => s.session_exercise_id === e.id)
              .map((s) => {
                const d = draftFor(s, e)
                const saved = !!s.completed_at
                const busy = pending.includes(s.id)
                return (
                  <div className="live-set" key={s.id}>
                    <div className="set-row">
                      <span>
                        {s.set_number + 1}
                        <small>{s.set_type}</small>
                      </span>
                      <label>
                        Reps
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          inputMode="numeric"
                          disabled={saved || busy || !active}
                          value={saved ? (s.reps ?? '') : d.reps}
                          onChange={(event) =>
                            edit(s, e, { reps: event.target.value })
                          }
                        />
                      </label>
                      {bodyweight ? (
                        <span>Bodyweight</span>
                      ) : (
                        <label>
                          kg
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            disabled={saved || busy || !active}
                            value={saved ? (s.weight ?? '') : d.weight}
                            onChange={(event) =>
                              edit(s, e, { weight: event.target.value })
                            }
                          />
                        </label>
                      )}
                      <button
                        disabled={saved || busy || !active || finishing}
                        onClick={() => void log(s, e, bodyweight)}
                      >
                        {saved
                          ? 'Saved'
                          : busy
                            ? 'Saving...'
                            : errors[s.id]
                              ? 'Retry'
                              : 'Done'}
                      </button>
                    </div>
                    {!saved &&
                      active &&
                      e.auto_increment_enabled &&
                      !bodyweight &&
                      s.set_type !== 'warmup' && (
                        <label className="override-control">
                          If changing the suggested weight
                          <select
                            disabled={busy}
                            value={d.scope}
                            onChange={(event) =>
                              edit(s, e, {
                                scope: event.target.value as Draft['scope'],
                              })
                            }
                          >
                            <option value="">
                              Use suggestion / first weight
                            </option>
                            <option value="once">
                              Next set only (this set)
                            </option>
                            <option value="permanent">Use going forward</option>
                          </select>
                        </label>
                      )}
                    <div className="set-feedback">
                      {errors[s.id] ? (
                        <p className="error" role="alert">
                          {errors[s.id]}
                        </p>
                      ) : (
                        <span>
                          {saved
                            ? 'Saved to your account'
                            : busy
                              ? 'Saving to your account...'
                              : d.dirty
                                ? 'Unsaved entry'
                                : 'Planned set'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            {active && (
              <button
                className="secondary-button"
                disabled={pending.includes(e.id) || finishing}
                onClick={() => void add(e)}
              >
                Add set
              </button>
            )}
            {errors[e.id] && <p role="alert">{errors[e.id]}</p>}
          </section>
        )
      })}
      {active && (
        <div className="save-bar">
          <button
            disabled={finishing || pending.length > 0}
            onClick={() => void finish()}
          >
            {finishing ? 'Saving...' : 'Finish workout'}
          </button>
          <button
            className="secondary-button"
            disabled={finishing || pending.length > 0}
            onClick={() => void finish(true)}
          >
            Abandon workout
          </button>
        </div>
      )}
      {finishError && (
        <p className="error" role="alert">
          {finishError}
        </p>
      )}
    </>
  )
}
