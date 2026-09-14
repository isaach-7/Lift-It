import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.ts'

export function AuthCallbackPage() {
  const { state } = useAuth()
  if (state.status === 'ready' && state.session)
    return <Navigate to="/app" replace />
  return (
    <main className="page-shell">
      <section
        className="welcome-card auth-card"
        aria-labelledby="callback-title"
      >
        <p className="eyebrow">LiftIt</p>
        <h1 id="callback-title">Link unavailable</h1>
        <p className="feedback error" role="alert">
          This verification link is missing, invalid, or expired. Return to sign
          in to continue.
        </p>
        <a className="text-link" href="/login">
          Return to sign in
        </a>
      </section>
    </main>
  )
}
