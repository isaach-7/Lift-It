import { rpcRow } from '../lib/rpc-row.ts'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.ts'
import { listExercises } from '../exercises/exercise-library.ts'
import type { Exercise } from '../exercises/exercise-library.ts'
import { loadSession, setColumns } from './data.ts'
import type { LoggedSet, SessionExercise, SessionRow } from './data.ts'
import { RestTimer } from './RestTimer.tsx'
import { SessionElapsed } from './SessionElapsed.tsx'
import { useProfile } from '../profile/profile-context.ts'
import { ConfirmationDialog } from '../ui/ConfirmationDialog.tsx'
import { UnitToggle } from '../ui/UnitToggle.tsx'
import {
  convertWeightText,
  displayWeight,
  parseWeight,
} from '../units/weight.ts'
import type { WeightUnit } from '../units/weight.ts'
import { formatDate } from '../lib/date.ts'

type Draft = {
  reps: string
  weight: string
  scope: 'once' | 'permanent' | ''
  dirty: boolean
}
type UnloggedSetResult = {
  set: LoggedSet
  current_weight: number | null
}
export function SessionPage() {
  const { id } = useParams()
  const { client, state } = useAuth()
  const { profile } = useProfile()
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
  const [unit, setUnit] = useState<WeightUnit>(profile.preferred_weight_unit)
  const [confirmingFinish, setConfirmingFinish] = useState(false)
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
              unit?: WeightUnit
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
                restored[s.id] = {
                  ...draft,
                  weight:
                    parsed.unit && parsed.unit !== profile.preferred_weight_unit
                      ? convertWeightText(
                          draft.weight,
                          parsed.unit,
                          profile.preferred_weight_unit,
                        )
                      : draft.weight,
                }
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
  }, [client, id, userId, storageKey, attempt, profile.preferred_weight_unit])
  useEffect(() => {
    if (loading || loadError) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ drafts, timer, unit }))
    } catch {
      // Surface failure of the external recovery store instead of implying durability.
      // oxlint-disable-next-line react/set-state-in-effect
      setStorageError(true)
    }
  }, [drafts, timer, unit, storageKey, loading, loadError])
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (inFlight.current.size || Object.values(drafts).some((d) => d.dirty))
        event.preventDefault()
    }
    window.addEventListener('beforeunload', unload)
    return () => window.removeEventListener('beforeunload', unload)
  }, [drafts])
  useEffect(() => {
    if (!session) return
    const state =
      session.status === 'in_progress'
        ? 'Active workout'
        : session.status === 'completed'
          ? 'Completed workout'
          : 'Workout'
    document.title = `${session.name} - ${state} | LiftIt`
  }, [session])
  function draftFor(s: LoggedSet, e: SessionExercise): Draft {
    return (
      drafts[s.id] ?? {
        reps: s.target_reps?.toString() ?? '',
        weight:
          (e.auto_increment_enabled && s.set_type !== 'warmup'
            ? (recommendations[`${e.exercise_id}:${e.equipment_key}`] ??
              s.target_weight)
            : s.target_weight) == null
            ? ''
            : displayWeight(
                (e.auto_increment_enabled && s.set_type !== 'warmup'
                  ? (recommendations[`${e.exercise_id}:${e.equipment_key}`] ??
                    s.target_weight)
                  : s.target_weight)!,
                unit,
              ),
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
  function acceptUnlogged(
    saved: LoggedSet,
    e: SessionExercise,
    draft: Draft,
    currentWeight: number | null,
  ) {
    setSets((rows) => rows.map((row) => (row.id === saved.id ? saved : row)))
    setDrafts((old) => ({ ...old, [saved.id]: draft }))
    setRecommendations((old) => {
      const next = { ...old }
      const key = `${e.exercise_id}:${e.equipment_key}`
      if (currentWeight == null) delete next[key]
      else next[key] = currentWeight
      return next
    })
    setErrors((old) => ({ ...old, [saved.id]: '' }))
  }
  async function log(s: LoggedSet, e: SessionExercise, bodyweight: boolean) {
    if (!client || inFlight.current.has(s.id) || finishing) return
    const d = draftFor(s, e)
    const reps = Number(d.reps)
    if (!d.reps.trim() || !Number.isInteger(reps) || reps < 1 || reps > 1000) {
      setErrors((old) => ({
        ...old,
        [s.id]: 'Enter the whole number of reps completed.',
      }))
      return
    }
    const weight = bodyweight ? null : parseWeight(d.weight, unit)
    if (!bodyweight && weight === null) {
      setErrors((old) => ({
        ...old,
        [s.id]: 'Enter a valid weight of 0 or more.',
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
  async function unlog(s: LoggedSet, e: SessionExercise) {
    if (!client || inFlight.current.has(s.id) || finishing) return
    const draft: Draft = {
      reps: String(s.reps ?? ''),
      weight: s.weight == null ? '' : displayWeight(s.weight, unit),
      scope: s.override_scope ?? '',
      dirty: true,
    }
    inFlight.current.add(s.id)
    setPending([...inFlight.current])
    setErrors((old) => ({ ...old, [s.id]: '' }))
    try {
      const { data, error } = await client.rpc('unlog_workout_set', {
        p_id: s.id,
      })
      if (error) throw error
      const result = data as UnloggedSetResult
      acceptUnlogged(result.set, e, draft, result.current_weight)
    } catch {
      // A lost response may follow a committed undo. Read the row before failing.
      try {
        const { data, error } = await client
          .from('sets')
          .select(setColumns)
          .eq('id', s.id)
          .single<LoggedSet>()
        if (!error && data && !data.completed_at) {
          acceptUnlogged(data, e, draft, null)
          return
        }
      } catch {
        /* Keep the confirmed completed state when the undo cannot be verified. */
      }
      setErrors((old) => ({
        ...old,
        [s.id]: 'Undo not confirmed. The set remains saved. Retry to edit it.',
      }))
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
    const previous = sets
      .filter((set) => set.session_exercise_id === e.id)
      .toSorted((a, b) => a.set_number - b.set_number)
      .at(-1)
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
      if (previous) {
        const previousDraft = draftFor(previous, e)
        setDrafts((old) => ({
          ...old,
          [saved.id]: {
            reps: previous.completed_at
              ? String(previous.reps ?? '')
              : previousDraft.reps,
            weight: previous.completed_at
              ? previous.weight == null
                ? ''
                : displayWeight(previous.weight, unit)
              : previousDraft.weight,
            scope: '',
            dirty: false,
          },
        }))
      }
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
  async function finish(abandon = false, confirmed = false) {
    if (!client || !id || finishing || inFlight.current.size) return
    if (
      !abandon &&
      Object.values(errors).some((message) =>
        message.startsWith('Save not confirmed'),
      )
    ) {
      setFinishError('Retry the unconfirmed set save before finishing.')
      return
    }
    if (!abandon && !confirmed && sets.some((s) => !s.completed_at)) {
      setConfirmingFinish(true)
      return
    }
    if (
      abandon &&
      !window.confirm(
        'Abandon this workout? It will not count towards your goal.',
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
      navigate('/app')
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
  const incomplete = sets.filter((set) => !set.completed_at).length
  return (
    <>
      <header className="session-header">
        <div>
          <p className="eyebrow">
            {active ? 'Workout in progress' : 'Workout completed'}
          </p>
          <h1>{session.name}</h1>
          <p className="session-meta">
            {active && <SessionElapsed startedAt={session.started_at} />}
            <span>{exercises.length} exercises</span>
            <span>
              {sets.filter((set) => set.completed_at).length} sets done
            </span>
            {!active && session.completed_at && (
              <time dateTime={session.completed_at}>
                {formatDate(session.completed_at)}
              </time>
            )}
          </p>
        </div>
        <UnitToggle
          value={unit}
          onChange={(next) => {
            setDrafts((current) =>
              Object.fromEntries(
                Object.entries(current).map(([key, draft]) => [
                  key,
                  {
                    ...draft,
                    weight: convertWeightText(draft.weight, unit, next),
                  },
                ]),
              ),
            )
            setUnit(next)
          }}
        />
      </header>
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
          <section
            className={`workout-exercise ${bodyweight ? 'bodyweight' : ''}`}
            key={e.id}
          >
            <div className="exercise-log-heading">
              <div>
                <p className="exercise-position">Exercise {e.position + 1}</p>
                <h2>{exercise?.name ?? 'Exercise'}</h2>
              </div>
              <span>{e.equipment_label}</span>
            </div>
            <p className="muted exercise-prescription">
              Target {e.rep_range_lower}-{e.rep_range_upper} reps
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
            <div className="live-set-heading" aria-hidden="true">
              <span>Set</span>
              <span>Plan</span>
              {!bodyweight && <span>{unit}</span>}
              <span>Reps</span>
              <span>Done</span>
            </div>
            {sets
              .filter((s) => s.session_exercise_id === e.id)
              .map((s) => {
                const d = draftFor(s, e)
                const saved = !!s.completed_at
                const busy = pending.includes(s.id)
                return (
                  <div className="live-set" key={s.id}>
                    <div className={`set-row ${saved ? 'is-complete' : ''}`}>
                      <span className="set-number">
                        <strong>{s.set_number + 1}</strong>
                        <small>
                          {s.set_type === 'standard' ? 'work' : s.set_type}
                        </small>
                      </span>
                      <span className="planned-value">
                        {s.target_weight != null && !bodyweight
                          ? `${displayWeight(s.target_weight, unit)} x `
                          : ''}
                        {s.target_reps ?? '-'}
                      </span>
                      {!bodyweight && (
                        <label>
                          <span className="sr-only">Weight in {unit}</span>
                          <input
                            aria-label={`${exercise?.name ?? 'Exercise'} set ${s.set_number + 1} weight in ${unit}`}
                            type="text"
                            inputMode="decimal"
                            disabled={saved || busy || !active}
                            value={
                              saved
                                ? s.weight == null
                                  ? ''
                                  : displayWeight(s.weight, unit)
                                : d.weight
                            }
                            onFocus={(event) => event.currentTarget.select()}
                            onChange={(event) =>
                              edit(s, e, { weight: event.target.value })
                            }
                          />
                        </label>
                      )}
                      <label>
                        <span className="sr-only">Reps</span>
                        <input
                          aria-label={`${exercise?.name ?? 'Exercise'} set ${s.set_number + 1} reps`}
                          type="text"
                          inputMode="numeric"
                          disabled={saved || busy || !active}
                          value={saved ? (s.reps ?? '') : d.reps}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) =>
                            edit(s, e, { reps: event.target.value })
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              void log(s, e, bodyweight)
                            }
                          }}
                        />
                      </label>
                      <button
                        className="set-complete"
                        aria-label={
                          saved
                            ? `Reopen set ${s.set_number + 1}`
                            : `${errors[s.id] ? 'Retry' : 'Complete'} set ${s.set_number + 1}`
                        }
                        aria-pressed={saved}
                        disabled={busy || !active || finishing}
                        onClick={() =>
                          saved ? void unlog(s, e) : void log(s, e, bodyweight)
                        }
                      >
                        {saved ? (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m6 12 4 4 8-9" />
                          </svg>
                        ) : busy ? (
                          <span className="saving-dot" aria-hidden="true" />
                        ) : (
                          <span aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {!saved &&
                      active &&
                      e.auto_increment_enabled &&
                      !bodyweight &&
                      s.set_type !== 'warmup' && (
                        <fieldset className="override-control">
                          <legend>Changed the suggested weight?</legend>
                          <button
                            type="button"
                            className={d.scope === 'once' ? 'active' : ''}
                            aria-pressed={d.scope === 'once'}
                            onClick={() => edit(s, e, { scope: 'once' })}
                          >
                            This set
                          </button>
                          <button
                            type="button"
                            className={d.scope === 'permanent' ? 'active' : ''}
                            aria-pressed={d.scope === 'permanent'}
                            onClick={() => edit(s, e, { scope: 'permanent' })}
                          >
                            Going forward
                          </button>
                        </fieldset>
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
                + Add set
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
      <ConfirmationDialog
        open={confirmingFinish}
        title={`${incomplete} incomplete ${incomplete === 1 ? 'set' : 'sets'}`}
        confirmLabel="Finish anyway"
        onCancel={() => setConfirmingFinish(false)}
        onConfirm={() => {
          setConfirmingFinish(false)
          void finish(false, true)
        }}
      >
        <p>
          Completed sets will be saved exactly as logged. Incomplete sets will
          not be counted as performed.
        </p>
      </ConfirmationDialog>
    </>
  )
}
