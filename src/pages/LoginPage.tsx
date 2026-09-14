import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/auth-context.ts'
import { Brand } from '../ui/Brand.tsx'
import {
  normalizeEmail,
  validateEmail,
  validateNewPassword,
} from '../lib/form-validation.ts'

export function LoginPage() {
  const { client, state, passwordRecoveryUserId, completePasswordRecovery } =
    useAuth()
  const { pathname } = useLocation()
  const mode =
    pathname === '/register'
      ? 'register'
      : pathname === '/forgot-password'
        ? 'forgot'
        : pathname === '/update-password'
          ? 'update'
          : 'login'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState(false)
  const signedIn = state.status === 'ready' && state.session
  const canUpdatePassword = Boolean(
    signedIn && passwordRecoveryUserId === signedIn.user.id,
  )
  if (signedIn && mode === 'login') return <Navigate to="/app" replace />
  if (updated) return <Navigate to="/app" replace />
  const title = {
    login: 'Welcome back.',
    register: 'Create your account.',
    forgot: 'Reset your password.',
    update: 'Choose a new password.',
  }[mode]

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client || busy) return
    setError('')
    setMessage('')
    const normalizedEmail = normalizeEmail(email)
    if (mode !== 'update') {
      const validation = validateEmail(email)
      if (validation) {
        setError(validation)
        return
      }
    }
    if (mode === 'register' || mode === 'update') {
      const validation = validateNewPassword(password)
      if (validation) {
        setError(validation)
        return
      }
    }
    if (
      (mode === 'register' || mode === 'update') &&
      password !== confirmation
    ) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await client.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        if (error) throw error
      } else if (mode === 'register') {
        const { error } = await client.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setMessage(
          'Check your inbox to verify your email before setting up your profile. If you already have an account, sign in or reset your password.',
        )
        setPassword('')
        setConfirmation('')
      } else if (mode === 'forgot') {
        const { error } = await client.auth.resetPasswordForEmail(
          normalizedEmail,
          { redirectTo: `${window.location.origin}/update-password` },
        )
        if (error) throw error
        setMessage(
          'If an account exists for this email, you will receive a password reset link. Existing email-link accounts can set their first password this way.',
        )
      } else {
        const { error } = await client.auth.updateUser({ password })
        if (error) throw error
        completePasswordRecovery()
        setPassword('')
        setConfirmation('')
        setUpdated(true)
      }
    } catch (cause) {
      const code =
        typeof cause === 'object' && cause !== null && 'code' in cause
          ? String(cause.code)
          : ''
      setError(
        code === 'email_not_confirmed'
          ? 'Verify your email before signing in. You can resend verification below.'
          : code === 'weak_password'
            ? 'Choose a stronger password with at least 12 characters.'
            : mode === 'login'
              ? 'Unable to sign in. Check your email and password, verify your email, or try again if your connection failed.'
              : 'Unable to complete this request. Check your connection and try again. If you recently requested an email, wait a minute before retrying.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function resend() {
    if (!client || busy || !email.trim()) return
    const validation = validateEmail(email)
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError('')
    try {
      const { error } = await client.auth.resend({
        type: 'signup',
        email: normalizeEmail(email),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
      setMessage('If verification is needed, check your inbox for a new link.')
    } catch {
      setError(
        'Unable to resend verification. Check your email and connection, or wait a minute and retry.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="auth-shell">
      <section className="auth-visual" aria-label="LiftIt training">
        <img
          src="/auth-strength-training.webp"
          width="1122"
          height="1402"
          alt="Athlete loading a weight plate onto a barbell in a gym"
        />
        <div className="auth-visual-copy">
          <Brand />
          <p>Track the work.</p>
          <strong>See the progress.</strong>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <p className="eyebrow">
            {mode === 'login'
              ? 'Ready when you are'
              : mode === 'register'
                ? 'Start training with intent'
                : 'Account recovery'}
          </p>
          <h1>{title}</h1>
          <p className="intro">
            {mode === 'login'
              ? 'Your next session starts here.'
              : mode === 'register'
                ? 'A simple place to build a stronger routine.'
                : 'Use a password you do not use elsewhere.'}
          </p>
          {mode === 'update' && !canUpdatePassword ? (
            <>
              <p role="alert">
                This recovery link is missing, invalid, or expired.
              </p>
              <Link to="/forgot-password">Request a new reset link</Link>
            </>
          ) : (
            <form className="auth-form" onSubmit={submit} aria-busy={busy}>
              {mode !== 'update' && (
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )}
              {mode !== 'forgot' && (
                <>
                  <label>
                    Password
                    <input
                      name="password"
                      type={visible ? 'text' : 'password'}
                      autoComplete={
                        mode === 'login' ? 'current-password' : 'new-password'
                      }
                      required
                      minLength={mode === 'login' ? 1 : 12}
                      maxLength={1024}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={(e) => setVisible(e.target.checked)}
                    />
                    Show password
                  </label>
                </>
              )}
              {(mode === 'register' || mode === 'update') && (
                <>
                  <small>Use at least 12 characters.</small>
                  <label>
                    Confirm password
                    <input
                      name="confirmation"
                      type={visible ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={1024}
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                    />
                  </label>
                </>
              )}
              <button disabled={busy}>
                {busy
                  ? 'Please wait...'
                  : {
                      login: 'Sign in',
                      register: 'Create account',
                      forgot: 'Send reset link',
                      update: 'Save password',
                    }[mode]}
              </button>
              <div className="form-feedback">
                {error && (
                  <p role="alert" className="error">
                    {error}
                  </p>
                )}
                {message && <p role="status">{message}</p>}
              </div>
              {(mode === 'register' || mode === 'login') && (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy || !email.trim()}
                  onClick={() => void resend()}
                >
                  Resend verification email
                </button>
              )}
            </form>
          )}
          <div className="auth-links">
            {mode !== 'login' && <Link to="/login">Back to sign in</Link>}
            {mode === 'login' && (
              <>
                <Link to="/register">Create an account</Link>
                <Link to="/forgot-password">Forgot password?</Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
