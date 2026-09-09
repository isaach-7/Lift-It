import { useUnsavedChanges } from '../ui/useUnsavedChanges.ts'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.ts'
import {
  listExercises,
  filterExercises,
  muscleGroups,
} from '../exercises/exercise-library.ts'
import type { Exercise, MuscleGroup } from '../exercises/exercise-library.ts'
import { ExerciseImage } from '../exercises/ExerciseImage.tsx'
import { blankExercise, blankSet, loadPlan, validatePlan } from './model.ts'
import type { ExercisePlan, SetType } from './model.ts'
import { EquipmentSetup } from '../equipment/EquipmentSetup.tsx'
export function WorkoutEditor() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { client } = useAuth()
  const [draftId] = useState(() => id ?? crypto.randomUUID())
  const [name, setName] = useState('')
  const [plans, setPlans] = useState<ExercisePlan[]>([])
  const [library, setLibrary] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<MuscleGroup | 'All'>('All')
  const [picker, setPicker] = useState(false)
  useEffect(() => {
    if (!client) return
    let active = true
    void Promise.all([
      listExercises(client),
      id ? loadPlan(client, id) : Promise.resolve({ name: '', exercises: [] }),
    ])
      .then(([library, plan]) => {
        if (active) {
          setLibrary(library)
          setName(plan.name)
          setPlans(plan.exercises)
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
  }, [client, id, attempt])
  useUnsavedChanges(dirty && !busy, 'Leave without saving this workout?')
  function change(index: number, patch: Partial<ExercisePlan>) {
    setDirty(true)
    setPlans((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!client || busy) return
    const validation = validatePlan(name, plans)
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError('')
    try {
      const { error } = await client.rpc('save_workout_template', {
        p_id: draftId,
        p_name: name.trim(),
        p_exercises: plans,
      })
      if (error) throw error
      setDirty(false)
      navigate('/workouts')
    } catch {
      setError(
        'Unable to save the workout. Your changes are still here. Retry when connected.',
      )
    } finally {
      setBusy(false)
    }
  }
  if (loading)
    return (
      <section className="panel skeleton" role="status">
        Loading workout editor...
      </section>
    )
  if (loadError)
    return (
      <section className="panel">
        <p role="alert">Unable to load the workout editor.</p>
        <button
          onClick={() => {
            setLoading(true)
            setLoadError(false)
            setAttempt((a) => a + 1)
          }}
        >
          Retry editor
        </button>
      </section>
    )
  return (
    <>
      <p className="eyebrow">Your training plan</p>
      <h1>{id ? 'Edit workout' : 'Create workout'}</h1>
      {location.state?.needsTemplate && (
        <p className="intro">
          Add exercises and sets to create a workout you can start. You can also{' '}
          <Link to="/workouts">finish an existing draft</Link>.
        </p>
      )}
      <form onSubmit={save} className="editor">
        <fieldset disabled={busy}>
          <label>
            Workout name
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setDirty(true)
              }}
              placeholder="e.g. Upper body"
            />
          </label>
          {plans.map((plan, index) => {
            const exercise = library.find((e) => e.id === plan.exercise_id)
            if (!exercise) return null
            const bodyweight =
              exercise.equipment_type === 'bodyweight' &&
              !plan.uses_added_weight
            return (
              <section className="panel" key={plan.exercise_id}>
                <div className="section-row">
                  <h2>
                    {index + 1}. {exercise.name}
                  </h2>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={index === 0}
                      onClick={() => {
                        setDirty(true)
                        setPlans((rows) => {
                          const next = [...rows]
                          ;[next[index - 1], next[index]] = [
                            next[index]!,
                            next[index - 1]!,
                          ]
                          return next
                        })
                      }}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={index === plans.length - 1}
                      onClick={() => {
                        setDirty(true)
                        setPlans((rows) => {
                          const next = [...rows]
                          ;[next[index], next[index + 1]] = [
                            next[index + 1]!,
                            next[index]!,
                          ]
                          return next
                        })
                      }}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setPlans((rows) => rows.filter((_, i) => i !== index))
                        setDirty(true)
                      }}
                    >
                      Remove exercise
                    </button>
                  </div>
                </div>
                {exercise.equipment_type === 'bodyweight' &&
                  exercise.supports_added_weight && (
                    <label>
                      <input
                        type="checkbox"
                        checked={plan.uses_added_weight ?? false}
                        onChange={(event) =>
                          change(index, {
                            uses_added_weight: event.target.checked,
                            auto_increment_enabled: false,
                            sets: plan.sets.map((set) => ({
                              ...set,
                              target_weight: null,
                            })),
                          })
                        }
                      />
                      Track added weight
                    </label>
                  )}
                <details>
                  <summary>Instructions</summary>
                  <ol>
                    {exercise.instructions.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </details>
                <div className="set-table">
                  <div className="set-row set-heading">
                    <span>Set</span>
                    <span>Type</span>
                    <span>Reps</span>
                    <span>{bodyweight ? '' : 'kg'}</span>
                    <span />
                  </div>
                  {plan.sets.map((set, si) => (
                    <div className="set-row" key={set.id}>
                      <span>{si + 1}</span>
                      <select
                        aria-label={`${exercise.name} set ${si + 1} type`}
                        value={set.set_type}
                        onChange={(e) =>
                          change(index, {
                            sets: plan.sets.map((s) =>
                              s.id === set.id
                                ? { ...s, set_type: e.target.value as SetType }
                                : s,
                            ),
                          })
                        }
                      >
                        {['standard', 'warmup', 'failure'].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <input
                        aria-label={`${exercise.name} set ${si + 1} target reps`}
                        type="number"
                        min={0}
                        max={1000}
                        placeholder="-"
                        value={set.target_reps ?? ''}
                        onChange={(e) =>
                          change(index, {
                            sets: plan.sets.map((s) =>
                              s.id === set.id
                                ? {
                                    ...s,
                                    target_reps:
                                      e.target.value === ''
                                        ? null
                                        : Number(e.target.value),
                                  }
                                : s,
                            ),
                          })
                        }
                      />
                      {bodyweight ? (
                        <span />
                      ) : (
                        <input
                          aria-label={`${exercise.name} set ${si + 1} target weight`}
                          type="number"
                          min={0}
                          max={99999}
                          step="0.01"
                          placeholder="-"
                          value={set.target_weight ?? ''}
                          onChange={(e) =>
                            change(index, {
                              sets: plan.sets.map((s) =>
                                s.id === set.id
                                  ? {
                                      ...s,
                                      target_weight:
                                        e.target.value === ''
                                          ? null
                                          : Number(e.target.value),
                                    }
                                  : s,
                              ),
                            })
                          }
                        />
                      )}
                      <button
                        type="button"
                        className="secondary-button"
                        aria-label={`Remove ${exercise.name} set ${si + 1}`}
                        onClick={() =>
                          change(index, {
                            sets: plan.sets.filter((s) => s.id !== set.id),
                          })
                        }
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={plan.sets.length >= 100}
                  onClick={() =>
                    change(index, { sets: [...plan.sets, blankSet()] })
                  }
                >
                  Add set
                </button>
                <details className="exercise-settings">
                  <summary>Rest and progression settings</summary>
                  <div className="field-grid">
                    <label>
                      Rest (seconds)
                      <input
                        type="number"
                        required
                        min={0}
                        max={3600}
                        value={plan.rest_timer_seconds}
                        onChange={(e) =>
                          change(index, {
                            rest_timer_seconds: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Lower rep target
                      <input
                        required
                        type="number"
                        min={1}
                        max={99}
                        value={plan.rep_range_lower}
                        onChange={(e) =>
                          change(index, {
                            rep_range_lower: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Upper rep target
                      <input
                        required
                        type="number"
                        min={2}
                        max={100}
                        value={plan.rep_range_upper}
                        onChange={(e) =>
                          change(index, {
                            rep_range_upper: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    {!bodyweight && (
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={plan.auto_increment_enabled}
                          onChange={(e) =>
                            change(index, {
                              auto_increment_enabled: e.target.checked,
                            })
                          }
                        />
                        Automatic weight progression
                      </label>
                    )}
                  </div>
                  {!bodyweight && (
                    <EquipmentSetup
                      exercise={exercise}
                      plan={plan}
                      onChange={(patch) => change(index, patch)}
                    />
                  )}
                </details>
              </section>
            )
          })}
          {!plans.length && (
            <p className="empty-state">
              Add an exercise to start building your workout.
            </p>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPicker(!picker)}
          >
            {picker ? 'Close exercise library' : 'Add exercises'}
          </button>
          {picker && (
            <section className="panel">
              <h2>Exercise library</h2>
              <label>
                Search exercises
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="search"
                />
              </label>
              <label>
                Muscle group
                <select
                  value={group}
                  onChange={(e) =>
                    setGroup(e.target.value as MuscleGroup | 'All')
                  }
                >
                  <option>All</option>
                  {muscleGroups.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <div className="exercise-grid">
                {filterExercises(library, query, group).map((exercise) => (
                  <article className="exercise-card" key={exercise.id}>
                    <ExerciseImage
                      name={exercise.name}
                      group={exercise.muscle_group}
                      src={exercise.image_path}
                    />
                    <div className="exercise-card-body">
                      <h3>{exercise.name}</h3>
                      <p>{exercise.primary_muscle}</p>
                      <details>
                        <summary>How to perform</summary>
                        <ol>
                          {exercise.instructions.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      </details>
                      <button
                        type="button"
                        disabled={plans.some(
                          (e) => e.exercise_id === exercise.id,
                        )}
                        onClick={() => {
                          setPlans((rows) => [
                            ...rows,
                            blankExercise(exercise.id),
                          ])
                          setDirty(true)
                        }}
                      >
                        {plans.some((e) => e.exercise_id === exercise.id)
                          ? 'Added'
                          : 'Add exercise'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!filterExercises(library, query, group).length && (
                <p>No matching exercises. Try another search.</p>
              )}
            </section>
          )}
          <div className="save-bar">
            <button disabled={busy}>
              {busy ? 'Saving workout...' : 'Save workout'}
            </button>
            <span>{dirty ? 'Unsaved changes' : 'No unsaved changes'}</span>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </fieldset>
      </form>
    </>
  )
}
