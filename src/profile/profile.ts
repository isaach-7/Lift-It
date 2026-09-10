import type { SupabaseClient } from '@supabase/supabase-js'
export type Profile = {
  id: string
  preferred_name: string | null
  height_cm: number | null
  weekly_goal: number | null
  preferred_weight_unit: 'kg' | 'lb'
  onboarding_completed_at: string | null
}
export async function readProfile(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('profiles')
    .select(
      'id, preferred_name, height_cm, weekly_goal, preferred_weight_unit, onboarding_completed_at',
    )
    .eq('id', id)
    .single<Profile>()
  if (error) throw error
  return data
}
