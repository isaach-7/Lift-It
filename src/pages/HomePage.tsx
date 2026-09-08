import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.ts'

export function HomePage() {
  const { client, state } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  if (state.status !== 'ready') return null
  if (!state.session) return <Navigate to="/login" replace />

  async function signOut() {
    if (!client || signingOut) return
    setSigningOut(true)
    setError('')
    try {
      const { error: signOutError } = await client.auth.signOut({
        scope: 'local',
      })
      if (signOutError) throw signOutError
    } catch {
      setError('Unable to sign out. Check your connection and try again.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="welcome-card auth-card" aria-labelledby="home-title">
        <p className="eyebrow">LiftIt</p>
        <h1 id="home-title">Welcome to LiftIt</h1>
        <p className="intro account-email">
          Signed in as {state.session.user.email}
        </p>
        <p className="intro">
          Your account is ready. Workout tracking is coming next.
        </p>
        <button
          className="sign-out"
          onClick={() => void signOut()}
          disabled={signingOut}
        >
          {signingOut ? 'Signing out...' : 'Sign out'}
        </button>
        <div className="feedback">
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
