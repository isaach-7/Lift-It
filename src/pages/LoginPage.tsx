import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../auth/auth-context.ts'

export function LoginPage() {
  const { client, state } = useAuth()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  if (state.status === 'ready' && state.session)
    return <Navigate to="/" replace />

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client || sending) return
    setSending(true)
    setError('')
    const address = email.trim()
    try {
      const { error: sendError } = await client.auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (sendError) throw sendError
      setSentTo(address)
    } catch {
      setError(
        'We could not send your link. Check your connection and email address. If you just requested a link, wait a minute before trying again.',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="welcome-card auth-card" aria-labelledby="login-title">
        <p className="eyebrow">LiftIt</p>
        <h1 id="login-title">Your next session starts here.</h1>
        <p className="intro">
          Sign in or create an account with an email link. No password needed.
        </p>
        <form className="auth-form" onSubmit={sendLink} aria-busy={sending}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={sending}
            onChange={(event) => {
              setEmail(event.target.value)
              setSentTo('')
              setError('')
            }}
          />
          <button type="submit" disabled={sending}>
            {sending
              ? 'Sending link...'
              : sentTo
                ? 'Resend sign-in link'
                : 'Send sign-in link'}
          </button>
          <div className="feedback">
            {error ? (
              <p role="alert" className="error">
                {error}
              </p>
            ) : (
              <p role="status">
                {sentTo
                  ? `Check your inbox at ${sentTo} for your sign-in link. You can close this page once signed in.`
                  : 'We will email you a single-use sign-in link.'}
              </p>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
