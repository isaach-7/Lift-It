import { describe, expect, it } from 'vitest'
import { filterExercises, sortExerciseLibrary } from './exercise-library.ts'
import type { Exercise } from './exercise-library.ts'

const exercises: Exercise[] = [
  {
    id: 'pull-up',
    name: 'Pull-Up',
    muscle_group: 'Back',
    primary_muscle: 'Lats',
    secondary_muscles: ['Biceps', 'Core'],
    equipment_type: 'bodyweight',
    image_path: '/exercise-images/pull-up.jpg',
    supports_added_weight: true,
    instructions: ['Hang under control.', 'Pull up under control.'],
  },
  {
    id: 'bench-press',
    name: 'Barbell Bench Press',
    muscle_group: 'Chest',
    primary_muscle: 'Chest',
    secondary_muscles: ['Front delts', 'Triceps'],
    equipment_type: 'barbell',
    image_path: '/exercise-images/barbell-bench-press.jpg',
    supports_added_weight: false,
    instructions: ['Lower under control.', 'Press up under control.'],
  },
]

describe('exercise library', () => {
  it('uses the product muscle-group order before exercise name', () => {
    expect(sortExerciseLibrary(exercises).map((item) => item.id)).toEqual([
      'bench-press',
      'pull-up',
    ])
  })

  it.each([
    ['lats', ['pull-up']],
    ['biceps', ['pull-up']],
    ['bodyweight', ['pull-up']],
    ['front DELTS', ['bench-press']],
    ['barbell', ['bench-press']],
  ])('searches all useful exercise metadata for %s', (query, expected) => {
    expect(
      filterExercises(exercises, query, 'All').map((item) => item.id),
    ).toEqual(expected)
  })

  it('combines the text query and selected muscle group', () => {
    expect(filterExercises(exercises, 'biceps', 'Chest')).toEqual([])
    expect(filterExercises(exercises, '', 'Chest')).toEqual([exercises[1]])
  })
})
