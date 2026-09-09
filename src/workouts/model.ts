import type { SupabaseClient } from '@supabase/supabase-js'
export type SetType = 'warmup' | 'standard' | 'failure'
export type PlannedSet = {
  id: string
  set_type: SetType
  target_reps: number | null
  target_weight: number | null
}
export type ExercisePlan = {
  exercise_id: string
  rest_timer_seconds: number
  auto_increment_enabled: boolean
  rep_range_lower: number
  rep_range_upper: number
  increment_amount: number
  available_weights: number[]
  uses_added_weight?: boolean
  equipment_label: string
  sets: PlannedSet[]
}
export const blankSet = (): PlannedSet => ({
  id: crypto.randomUUID(),
  set_type: 'standard',
  target_reps: null,
  target_weight: null,
})
export const blankExercise = (id: string): ExercisePlan => ({
  exercise_id: id,
  rest_timer_seconds: 90,
  auto_increment_enabled: false,
  rep_range_lower: 6,
  rep_range_upper: 10,
  increment_amount: 2.5,
  available_weights: [],
  uses_added_weight: false,
  equipment_label: 'Custom',
  sets: [blankSet()],
})
export async function loadPlan(client: SupabaseClient, id: string) {
  const results = await Promise.all([
    client.from('workout_templates').select('id,name').eq('id', id).single(),
    client
      .from('workout_template_exercises')
      .select(
        'exercise_id,rest_timer_seconds,auto_increment_enabled,rep_range_lower,rep_range_upper,increment_amount,available_weights,uses_added_weight,equipment_label',
      )
      .eq('workout_template_id', id)
      .order('position'),
    client
      .from('workout_template_sets')
      .select('id,exercise_id,set_type,target_reps,target_weight')
      .eq('workout_template_id', id)
      .order('position'),
  ])
  for (const result of results) if (result.error) throw result.error
  const [template, exercises, sets] = results
  if (!template?.data) throw new Error('Workout unavailable')
  return {
    name: template.data.name as string,
    exercises: (exercises?.data ?? []).map((e) => ({
      ...e,
      sets: (sets?.data ?? []).filter((s) => s.exercise_id === e.exercise_id),
    })) as ExercisePlan[],
  }
}
export function validatePlan(name: string, exercises: ExercisePlan[]) {
  if (!name.trim() || name.trim().length > 120)
    return 'Enter a workout name of 1-120 characters.'
  for (const e of exercises) {
    if (e.rep_range_lower >= e.rep_range_upper)
      return 'The upper rep target must be higher than the lower target.'
    if (!e.equipment_label.trim())
      return 'Give your equipment a name so progress stays comparable.'
    if (
      e.available_weights.some(
        (w) => !Number.isFinite(w) || w < 0 || w >= 100000,
      ) ||
      new Set(e.available_weights).size !== e.available_weights.length
    )
      return 'Available weights must be unique, non-negative numbers.'
  }
  return null
}
