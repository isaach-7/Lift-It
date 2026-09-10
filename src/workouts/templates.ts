import type { SupabaseClient } from '@supabase/supabase-js'

export type WorkoutTemplate = {
  id: string
  name: string
  created_at: string
}

const columns = 'id, name, created_at'

export function validateTemplateName(value: string): string | null {
  if (!value.trim()) return 'Enter a workout name.'
  if (value.trim().length > 120) return 'Use 120 characters or fewer.'
  return null
}

export function sortTemplates(templates: WorkoutTemplate[]) {
  return [...templates].sort(
    (a, b) =>
      b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id),
  )
}

export async function listWorkoutTemplates(
  client: SupabaseClient,
  userId: string,
) {
  const { data, error } = await client
    .from('workout_templates')
    .select(columns)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id')
    .returns<WorkoutTemplate[]>()
  if (error) throw error
  return data ?? []
}

export async function saveWorkoutTemplate(
  client: SupabaseClient,
  userId: string,
  id: string,
  name: string,
  isNew: boolean,
): Promise<WorkoutTemplate> {
  const validation = validateTemplateName(name)
  if (validation) throw new Error(validation)
  const table = client.from('workout_templates')
  const query = isNew
    ? table.upsert(
        { id, user_id: userId, name: name.trim() },
        { onConflict: 'id' },
      )
    : table.update({ name: name.trim() }).eq('id', id).eq('user_id', userId)
  const { data, error } = await query.select(columns).single<WorkoutTemplate>()
  if (error) throw error
  if (!data) throw new Error('No saved workout was returned')
  return data
}

export type WorkoutSummary = WorkoutTemplate & { ready: boolean }
export async function listWorkoutSummaries(
  client: SupabaseClient,
  userId: string,
): Promise<WorkoutSummary[]> {
  const { data, error } = await client
    .from('workout_templates')
    .select(
      'id,name,created_at,workout_template_exercises(exercise_id,workout_template_sets(id))',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1, {
      referencedTable: 'workout_template_exercises.workout_template_sets',
    })
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    created_at: row.created_at,
    ready:
      row.workout_template_exercises.length > 0 &&
      row.workout_template_exercises.every(
        (e) => e.workout_template_sets.length > 0,
      ),
  }))
}
