import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { getSupabaseClient } from '../lib/supabase.ts'

import { AuthContext } from './auth-context.ts'
import type { AuthState } from './auth-context.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    try {
      return getSupabaseClient()
    } catch {
      return null
    }
  })
  const [state, setState] = useState<AuthState>(
    client ? { status: 'checking' } : { status: 'unconfigured' },
  )

  useEffect(() => {
    if (!client) return
    const auth = client.auth
    let active = true
    let initialized = false
    let revision = 0
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      // Initialization owns callback errors; auth events must not hide them.
      if (active && initialized) {
        revision += 1
        setState({ status: 'ready', session })
      }
    })

    async function restoreSession() {
      try {
        const initialization = await auth.initialize()
        if (initialization.error) throw initialization.error
        initialized = true
        const readRevision = revision
        const { data, error } = await auth.getSession()
        if (!active || readRevision !== revision) return
        if (error) throw error
        setState({ status: 'ready', session: data.session })
      } catch {
        if (active) setState({ status: 'error' })
      }
    }
    void restoreSession()
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  return <AuthContext value={{ state, client }}>{children}</AuthContext>
}
