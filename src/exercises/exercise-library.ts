import type { SupabaseClient } from '@supabase/supabase-js'

export const muscleGroups = [
  'Chest',
  'Shoulders',
  'Triceps',
  'Biceps',
  'Legs',
  'Back',
] as const

export type MuscleGroup = (typeof muscleGroups)[number]

export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'plate_loaded'
  | 'smith_machine'
  | 'bodyweight'

export type Exercise = {
  id: string
  name: string
  muscle_group: MuscleGroup
  primary_muscle: string
  secondary_muscles: string[]
  equipment_type: EquipmentType
  image_path: string
  supports_added_weight: boolean
  instructions: string[]
}

export type TemplateExercise = {
  workout_template_id: string
  exercise_id: string
  position: number
}

const exerciseColumns =
  'id, name, muscle_group, primary_muscle, secondary_muscles, equipment_type, image_path, supports_added_weight, instructions'
const templateExerciseColumns = 'workout_template_id, exercise_id, position'

const equipmentLabels: Record<EquipmentType, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  plate_loaded: 'Plate-loaded',
  smith_machine: 'Smith machine',
  bodyweight: 'Bodyweight',
}

export function equipmentLabel(type: EquipmentType) {
  return equipmentLabels[type]
}

export function sortExerciseLibrary(exercises: Exercise[]) {
  const groupPosition = new Map(
    muscleGroups.map((group, index) => [group, index]),
  )
  return [...exercises].sort(
    (a, b) =>
      (groupPosition.get(a.muscle_group) ?? muscleGroups.length) -
        (groupPosition.get(b.muscle_group) ?? muscleGroups.length) ||
      a.name.localeCompare(b.name),
  )
}

export function filterExercises(
  exercises: Exercise[],
  query: string,
  group: MuscleGroup | 'All',
) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return exercises.filter((exercise) => {
    if (group !== 'All' && exercise.muscle_group !== group) return false
    if (!normalizedQuery) return true
    const searchable = [
      exercise.name,
      exercise.muscle_group,
      exercise.primary_muscle,
      ...exercise.secondary_muscles,
      equipmentLabel(exercise.equipment_type),
    ]
      .join(' ')
      .toLocaleLowerCase()
    return searchable.includes(normalizedQuery)
  })
}

export async function listExercises(client: SupabaseClient) {
  const { data, error } = await client
    .from('exercises')
    .select(exerciseColumns)
    .order('name')
    .returns<Exercise[]>()
  if (error) throw error
  return sortExerciseLibrary(data ?? [])
}

export async function listTemplateExercises(
  client: SupabaseClient,
  userId: string,
) {
  const { data, error } = await client
    .from('workout_template_exercises')
    .select(templateExerciseColumns)
    .eq('user_id', userId)
    .order('position')
    .order('exercise_id')
    .returns<TemplateExercise[]>()
  if (error) throw error
  return data ?? []
}

export async function addTemplateExercise(
  client: SupabaseClient,
  userId: string,
  workoutTemplateId: string,
  exerciseId: string,
  position: number,
) {
  const { data, error } = await client
    .from('workout_template_exercises')
    .insert({
      user_id: userId,
      workout_template_id: workoutTemplateId,
      exercise_id: exerciseId,
      position,
    })
    .select(templateExerciseColumns)
    .single<TemplateExercise>()
  if (error) throw error
  if (!data) throw new Error('No saved exercise was returned')
  return data
}

export async function removeTemplateExercise(
  client: SupabaseClient,
  userId: string,
  workoutTemplateId: string,
  exerciseId: string,
) {
  const { error } = await client
    .from('workout_template_exercises')
    .delete()
    .eq('user_id', userId)
    .eq('workout_template_id', workoutTemplateId)
    .eq('exercise_id', exerciseId)
  if (error) throw error
}
