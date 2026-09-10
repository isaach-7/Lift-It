import type { SupabaseClient } from '@supabase/supabase-js'
import type { SetType } from '../workouts/model.ts'
export type SessionRow = {
  id: string
  name: string
  status: 'in_progress' | 'completed' | 'abandoned'
  started_at: string
  completed_at: string | null
}
export type LoggedSet = {
  id: string
  session_exercise_id: string
  set_number: number
  set_type: SetType
  target_reps: number | null
  target_weight: number | null
  reps: number | null
  weight: number | null
  completed_at: string | null
  next_weight: number | null
  override_scope: 'once' | 'permanent' | null
}
export type SessionExercise = {
  id: string
  exercise_id: string
  position: number
  rest_timer_seconds: number
  auto_increment_enabled: boolean
  rep_range_lower: number
  rep_range_upper: number
  increment_amount: number
  available_weights: number[]
  uses_added_weight?: boolean
  equipment_label: string
  equipment_key: string
}
export const sessionColumns = 'id,name,status,started_at,completed_at'
export const setColumns =
  'id,session_exercise_id,set_number,set_type,target_reps,target_weight,reps,weight,completed_at,next_weight,override_scope'
export async function loadSession(client: SupabaseClient, id: string) {
  const [session, exercises] = await Promise.all([
    client
      .from('workout_sessions')
      .select(sessionColumns)
      .eq('id', id)
      .single<SessionRow>(),
    client
      .from('session_exercises')
      .select(
        'id,exercise_id,position,rest_timer_seconds,auto_increment_enabled,rep_range_lower,rep_range_upper,increment_amount,available_weights,uses_added_weight,equipment_label,equipment_key',
      )
      .eq('session_id', id)
      .order('position')
      .returns<SessionExercise[]>(),
  ])
  if (session.error) throw session.error
  if (exercises.error) throw exercises.error
  const ids = exercises.data.map((e) => e.id)
  const sets = ids.length
    ? await client
        .from('sets')
        .select(setColumns)
        .in('session_exercise_id', ids)
        .order('set_number')
        .returns<LoggedSet[]>()
    : { data: [] as LoggedSet[], error: null }
  if (sets.error) throw sets.error
  return {
    session: session.data,
    exercises: exercises.data,
    sets: sets.data ?? [],
  }
}
