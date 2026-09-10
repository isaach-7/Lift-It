import { Suspense, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.ts'
import { Brand } from './Brand.tsx'
export function Layout() {
  const { client } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function signOut() {
    if (!client || busy) return
    setBusy(true)
    setError('')
    try {
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw error
    } catch {
      setError('Unable to sign out. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/workouts">Workouts</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <button
          className="secondary-button sign-out-button"
          disabled={busy}
          onClick={() => void signOut()}
        >
          {busy ? 'Signing out...' : 'Sign out'}
        </button>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <main className="app-content">
        <Suspense
          fallback={
            <section className="panel skeleton" role="status">
              Loading page...
            </section>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
