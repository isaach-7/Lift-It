import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthState =
  | { status: 'checking' }
  | { status: 'ready'; session: Session | null }
  | { status: 'error' }
  | { status: 'unconfigured' }

export const AuthContext = createContext<{
  state: AuthState
  client: SupabaseClient | null
} | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is required')
  return context
}
