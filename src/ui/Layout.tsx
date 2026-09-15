import { Suspense, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.ts'
import { Brand } from './Brand.tsx'
export function Layout() {
  const { pathname } = useLocation()
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
  const focusedWorkoutRoute =
    /^\/workouts\/(?:new|[^/]+\/edit)$/.test(pathname) ||
    /^\/sessions\/[^/]+$/.test(pathname)

  return (
    <div
      className={`app-shell${focusedWorkoutRoute ? ' focused-workout-route' : ''}`}
    >
      <header className="app-header">
        <Brand to="/app" />
        <nav aria-label="Main navigation">
          <NavLink to="/app" end>
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
            <section className="page-skeleton" role="status">
              <span className="sr-only">Loading page</span>
              <span className="skeleton-line skeleton-title" />
              <span className="skeleton-line" />
              <div className="skeleton-card" />
              <div className="skeleton-card skeleton-card-short" />
            </section>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
