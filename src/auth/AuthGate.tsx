import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { useAuth } from './auth-context.ts'

export function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const { pathname } = useLocation()
  if (pathname === '/' || pathname === '/privacy') return children
  if (state.status === 'ready') return children

  const callback =
    pathname === '/auth/callback' || pathname === '/update-password'
  return (
    <main className="page-shell">
      <section className="welcome-card auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">LiftIt</p>
        {state.status === 'checking' && (
          <>
            <h1 id="auth-title">One moment</h1>
            <p className="feedback" role="status">
              {callback ? 'Completing sign-in...' : 'Checking your session...'}
            </p>
          </>
        )}
        {state.status === 'unconfigured' && (
          <>
            <h1 id="auth-title">Connect LiftIt</h1>
            <p className="intro">
              Supabase is not configured. Copy .env.example to .env.local, add
              your Project URL and publishable key, then restart the development
              server.
            </p>
          </>
        )}
        {state.status === 'error' && (
          <>
            <h1 id="auth-title">
              {callback ? 'Link unavailable' : 'Unable to restore session'}
            </h1>
            <p className="feedback error" role="alert">
              {callback
                ? 'This verification or recovery link may have expired or already been used. Request a new link, or try again if your connection failed.'
                : 'We could not check your session. Check your connection and try again.'}
            </p>
            <a
              className="text-link"
              href={callback ? '/forgot-password' : pathname}
            >
              {callback ? 'Request a new link' : 'Try again'}
            </a>
          </>
        )}
      </section>
    </main>
  )
}
