import { useMemo, useState } from 'react'
import { ExerciseImage } from './ExerciseImage.tsx'
import {
  equipmentLabel,
  filterExercises,
  muscleGroups,
} from './exercise-library.ts'
import type {
  Exercise,
  MuscleGroup,
  TemplateExercise,
} from './exercise-library.ts'

export function ExercisePicker({
  exercises,
  selected,
  pendingExerciseId,
  error,
  onToggle,
  onClose,
}: {
  exercises: Exercise[]
  selected: TemplateExercise[]
  pendingExerciseId: string | null
  error: string
  onToggle: (exercise: Exercise, isSelected: boolean) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<MuscleGroup | 'All'>('All')
  const selectedIds = useMemo(
    () => new Set(selected.map((item) => item.exercise_id)),
    [selected],
  )
  const visibleExercises = useMemo(
    () => filterExercises(exercises, query, group),
    [exercises, group, query],
  )

  return (
    <section
      className="exercise-picker"
      aria-labelledby="exercise-picker-title"
    >
      <div className="picker-heading">
        <div>
          <p className="picker-kicker">Exercise library</p>
          <h4 id="exercise-picker-title">Build this workout</h4>
          <p>{selected.length} exercises added</p>
        </div>
        <button className="secondary-button compact-button" onClick={onClose}>
          Done
        </button>
      </div>

      <label className="exercise-search">
        <span>Search exercises</span>
        <input
          type="search"
          value={query}
          placeholder="Name, muscle, or equipment"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="muscle-filters" aria-label="Filter by muscle group">
        {(['All', ...muscleGroups] as const).map((option) => (
          <button
            key={option}
            className={group === option ? 'active' : ''}
            aria-pressed={group === option}
            onClick={() => setGroup(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <p className="picker-feedback" role={error ? 'alert' : 'status'}>
        {error || `${visibleExercises.length} exercises shown`}
      </p>

      {visibleExercises.length === 0 ? (
        <div className="empty-exercises">
          <h5>No matching exercises</h5>
          <p>Try another name, muscle, or equipment type.</p>
        </div>
      ) : (
        <ul className="exercise-grid">
          {visibleExercises.map((exercise) => {
            const isSelected = selectedIds.has(exercise.id)
            const isPending = pendingExerciseId === exercise.id
            return (
              <li className="exercise-card" key={exercise.id}>
                <ExerciseImage
                  name={exercise.name}
                  group={exercise.muscle_group}
                  src={exercise.image_path}
                />
                <div className="exercise-card-body">
                  <div className="exercise-title-row">
                    <div>
                      <p>{exercise.muscle_group}</p>
                      <h5>{exercise.name}</h5>
                    </div>
                    {exercise.supports_added_weight && (
                      <span className="weighted-badge">Weighted option</span>
                    )}
                  </div>
                  <p className="equipment-label">
                    {equipmentLabel(exercise.equipment_type)}
                  </p>
                  <div className="muscle-tags" aria-label="Muscles worked">
                    <span>{exercise.primary_muscle}</span>
                    {exercise.secondary_muscles.map((muscle) => (
                      <span key={muscle}>{muscle}</span>
                    ))}
                  </div>
                  <details>
                    <summary>How to perform</summary>
                    <ol>
                      {exercise.instructions.map((instruction) => (
                        <li key={instruction}>{instruction}</li>
                      ))}
                    </ol>
                  </details>
                  <button
                    className={isSelected ? 'remove-exercise' : ''}
                    disabled={pendingExerciseId !== null}
                    aria-label={`${isSelected ? 'Remove' : 'Add'} ${exercise.name}`}
                    onClick={() => onToggle(exercise, isSelected)}
                  >
                    {isPending
                      ? isSelected
                        ? 'Removing...'
                        : 'Adding...'
                      : isSelected
                        ? 'Remove'
                        : 'Add exercise'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
