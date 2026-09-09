import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { ExerciseImage } from '../exercises/ExerciseImage.tsx'
import { ExercisePicker } from '../exercises/ExercisePicker.tsx'
import {
  addTemplateExercise,
  equipmentLabel,
  listExercises,
  listTemplateExercises,
  removeTemplateExercise,
} from '../exercises/exercise-library.ts'
import type {
  Exercise,
  TemplateExercise,
} from '../exercises/exercise-library.ts'
import { TemplateNameForm } from './TemplateNameForm.tsx'
import {
  listWorkoutTemplates,
  saveWorkoutTemplate,
  sortTemplates,
} from './templates.ts'
import type { WorkoutTemplate } from './templates.ts'

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready'
      templates: WorkoutTemplate[]
      exercises: Exercise[]
      selections: TemplateExercise[]
    }

export function WorkoutTemplates({
  client,
  userId,
}: {
  client: SupabaseClient
  userId: string
}) {
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [draftId, setDraftId] = useState(() => crypto.randomUUID())
  const [editing, setEditing] = useState<string | null>(null)
  const [activePicker, setActivePicker] = useState<string | null>(null)
  const [pendingExerciseId, setPendingExerciseId] = useState<string | null>(
    null,
  )
  const [pickerError, setPickerError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      listWorkoutTemplates(client, userId),
      listExercises(client),
      listTemplateExercises(client, userId),
    ]).then(
      ([templates, exercises, selections]) => {
        if (active)
          setList({ status: 'ready', templates, exercises, selections })
      },
      () => {
        if (active) setList({ status: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [client, userId, attempt])

  function mergeSaved(template: WorkoutTemplate) {
    setList((current) =>
      current.status === 'ready'
        ? {
            ...current,
            templates: sortTemplates([
              ...current.templates.filter((item) => item.id !== template.id),
              template,
            ]),
          }
        : current,
    )
  }

  function replaceSelections(selections: TemplateExercise[]) {
    setList((current) =>
      current.status === 'ready' ? { ...current, selections } : current,
    )
  }

  async function reconcileSelection(
    workoutTemplateId: string,
    exerciseId: string,
    shouldExist: boolean,
  ) {
    try {
      const latest = await listTemplateExercises(client, userId)
      const exists = latest.some(
        (item) =>
          item.workout_template_id === workoutTemplateId &&
          item.exercise_id === exerciseId,
      )
      replaceSelections(latest)
      return exists === shouldExist
    } catch {
      return false
    }
  }

  async function toggleExercise(
    workoutTemplateId: string,
    exercise: Exercise,
    isSelected: boolean,
  ) {
    if (list.status !== 'ready' || pendingExerciseId) return
    setPendingExerciseId(exercise.id)
    setPickerError('')
    setNotice('')

    const templateSelections = list.selections.filter(
      (item) => item.workout_template_id === workoutTemplateId,
    )

    try {
      if (isSelected) {
        await removeTemplateExercise(
          client,
          userId,
          workoutTemplateId,
          exercise.id,
        )
        replaceSelections(
          list.selections.filter(
            (item) =>
              item.workout_template_id !== workoutTemplateId ||
              item.exercise_id !== exercise.id,
          ),
        )
        setNotice(`Removed ${exercise.name}.`)
      } else {
        const nextPosition =
          templateSelections.reduce(
            (largest, item) => Math.max(largest, item.position),
            -1,
          ) + 1
        const saved = await addTemplateExercise(
          client,
          userId,
          workoutTemplateId,
          exercise.id,
          nextPosition,
        )
        replaceSelections([...list.selections, saved])
        setNotice(`Added ${exercise.name}.`)
      }
    } catch {
      const reconciled = await reconcileSelection(
        workoutTemplateId,
        exercise.id,
        !isSelected,
      )
      if (reconciled) {
        setNotice(`${isSelected ? 'Removed' : 'Added'} ${exercise.name}.`)
      } else {
        setPickerError(
          `We could not ${isSelected ? 'remove' : 'add'} ${exercise.name}. Check your connection and try again.`,
        )
      }
    } finally {
      setPendingExerciseId(null)
    }
  }

  return (
    <section className="workouts" aria-labelledby="workouts-title">
      <div className="section-heading">
        <h2 id="workouts-title">Your workouts</h2>
        <p>Create a reusable workout, then add exercises from the library.</p>
      </div>
      {list.status === 'loading' && (
        <div className="workouts-loading" role="status">
          <p>Loading your workouts and exercises...</p>
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}
      {list.status === 'error' && (
        <div className="workouts-loading">
          <p role="alert" className="error">
            We could not load your workouts and exercises. Check your connection
            and try again.
          </p>
          <button
            onClick={() => {
              setList({ status: 'loading' })
              setAttempt((value) => value + 1)
            }}
          >
            Retry loading
          </button>
        </div>
      )}
      {list.status === 'ready' && (
        <>
          <div className="new-workout">
            <h3>New workout</h3>
            <TemplateNameForm
              key={draftId}
              inputId="new-workout-name"
              onSave={(name) =>
                saveWorkoutTemplate(client, userId, draftId, name, true)
              }
              onSaved={(template) => {
                mergeSaved(template)
                setDraftId(crypto.randomUUID())
                setNotice(`Created ${template.name}.`)
              }}
            />
          </div>
          <p className="workout-notice" role="status">
            {notice}
          </p>
          {list.templates.length === 0 ? (
            <div className="empty-workouts">
              <h3>No workouts yet</h3>
              <p>
                Give your first workout a name, such as Push day or Full body.
              </p>
            </div>
          ) : (
            <ul className="workout-list">
              {list.templates.map((template) => {
                const selected = list.selections
                  .filter((item) => item.workout_template_id === template.id)
                  .sort(
                    (a, b) =>
                      a.position - b.position ||
                      a.exercise_id.localeCompare(b.exercise_id),
                  )
                const selectedExercises = selected.flatMap((selection) => {
                  const exercise = list.exercises.find(
                    (item) => item.id === selection.exercise_id,
                  )
                  return exercise ? [exercise] : []
                })

                return (
                  <li key={template.id} className="workout-card">
                    <div className="workout-card-heading">
                      <div>
                        <h3>{template.name}</h3>
                        <p>
                          {selected.length === 0
                            ? 'No exercises added'
                            : `${selected.length} ${selected.length === 1 ? 'exercise' : 'exercises'}`}
                        </p>
                      </div>
                      {editing === template.id ? (
                        <TemplateNameForm
                          inputId={`rename-${template.id}`}
                          initialName={template.name}
                          onSave={(name) =>
                            saveWorkoutTemplate(
                              client,
                              userId,
                              template.id,
                              name,
                              false,
                            )
                          }
                          onSaved={(saved) => {
                            mergeSaved(saved)
                            setEditing(null)
                            setNotice(`Renamed workout to ${saved.name}.`)
                          }}
                          onCancel={() => setEditing(null)}
                        />
                      ) : (
                        <button
                          className="secondary-button compact-button"
                          disabled={
                            editing !== null || pendingExerciseId !== null
                          }
                          aria-label={`Rename ${template.name}`}
                          onClick={() => {
                            setNotice('')
                            setActivePicker(null)
                            setEditing(template.id)
                          }}
                        >
                          Rename
                        </button>
                      )}
                    </div>

                    {selectedExercises.length > 0 && (
                      <ol className="selected-exercises">
                        {selectedExercises.map((exercise) => (
                          <li key={exercise.id}>
                            <ExerciseImage
                              compact
                              name={exercise.name}
                              group={exercise.muscle_group}
                              src={exercise.image_path}
                            />
                            <div>
                              <strong>{exercise.name}</strong>
                              <span>
                                {exercise.primary_muscle} -{' '}
                                {equipmentLabel(exercise.equipment_type)}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}

                    {editing !== template.id && (
                      <button
                        className="manage-exercises-button"
                        aria-expanded={activePicker === template.id}
                        onClick={() => {
                          setPickerError('')
                          setActivePicker((current) =>
                            current === template.id ? null : template.id,
                          )
                        }}
                      >
                        {activePicker === template.id
                          ? 'Close exercise library'
                          : selected.length === 0
                            ? 'Add exercises'
                            : 'Edit exercises'}
                      </button>
                    )}

                    {activePicker === template.id && (
                      <ExercisePicker
                        exercises={list.exercises}
                        selected={selected}
                        pendingExerciseId={pendingExerciseId}
                        error={pickerError}
                        onClose={() => setActivePicker(null)}
                        onToggle={(exercise, isSelected) =>
                          void toggleExercise(template.id, exercise, isSelected)
                        }
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
