import { ProfileContext } from './profile-context.ts'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.ts'
import { readProfile } from './profile.ts'
import type { Profile } from './profile.ts'
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { client, state } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const { pathname } = useLocation()
  const userId = state.status === 'ready' ? state.session?.user.id : undefined
  useEffect(() => {
    let active = true
    if (!client || !userId) return
    void readProfile(client, userId)
      .then((value) => {
        if (active) setProfile(value)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [client, userId, attempt])
  if (!userId) return <Navigate to="/login" replace />
  if (error)
    return (
      <main className="page-shell">
        <section className="panel">
          <h1>Profile unavailable</h1>
          <p role="alert">
            We could not load your profile. Your workout data has not changed.
          </p>
          <button
            onClick={() => {
              setError(false)
              setAttempt((a) => a + 1)
            }}
          >
            Try again
          </button>
        </section>
      </main>
    )
  if (!profile || profile.id !== userId)
    return (
      <main className="page-shell">
        <section className="panel skeleton" role="status">
          Loading your profile...
        </section>
      </main>
    )
  const ready = Boolean(
    profile.onboarding_completed_at && profile.fitness_data_consent_at,
  )
  if (!ready && pathname !== '/onboarding')
    return <Navigate to="/onboarding" replace />
  if (ready && pathname === '/onboarding') return <Navigate to="/app" replace />
  return (
    <ProfileContext value={{ profile, setProfile }}>{children}</ProfileContext>
  )
}
