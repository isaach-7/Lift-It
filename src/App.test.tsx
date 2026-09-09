import type { Session } from '@supabase/supabase-js'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App.tsx'
import { listWorkoutTemplates } from './workouts/templates.ts'

vi.mock('./workouts/templates.ts', () => ({ listWorkoutTemplates: vi.fn() }))

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  getSession: vi.fn(),
  signInWithOtp: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  getClient: vi.fn(),
  listeners: new Set<(event: string, session: Session | null) => void>(),
}))

vi.mock('./lib/supabase.ts', () => ({ getSupabaseClient: mocks.getClient }))

const session = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'user-a',
    email: 'lifter@example.com',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-09-08',
  },
} satisfies Session

function renderApp(path = '/') {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </StrictMode>,
  )
}

function emitSession(value: Session | null) {
  mocks.listeners.forEach((listener) =>
    listener(value ? 'SIGNED_IN' : 'SIGNED_OUT', value),
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listWorkoutTemplates).mockResolvedValue([])
  mocks.listeners.clear()
  mocks.initialize.mockResolvedValue({ error: null })
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
  mocks.signInWithOtp.mockResolvedValue({ error: null })
  mocks.signOut.mockImplementation(async () => {
    emitSession(null)
    return { error: null }
  })
  mocks.getClient.mockReturnValue({
    auth: {
      initialize: mocks.initialize,
      getSession: mocks.getSession,
      signInWithOtp: mocks.signInWithOtp,
      signOut: mocks.signOut,
      onAuthStateChange: (
        listener: (event: string, value: Session | null) => void,
      ) => {
        mocks.listeners.add(listener)
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                mocks.listeners.delete(listener)
                mocks.unsubscribe()
              },
            },
          },
        }
      },
    },
  })
})

describe('account foundation', () => {
  it('keeps private content and the login form hidden while checking', async () => {
    let finish!: (value: { error: null }) => void
    mocks.initialize.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    renderApp()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session',
    )
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument()
    expect(screen.queryByText(/Signed in as/)).not.toBeInTheDocument()
    await act(async () => finish({ error: null }))
    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
  })

  it('sends a registration/sign-in link, shows pending state, and resends explicitly', async () => {
    const user = userEvent.setup()
    let finish!: (value: { error: null }) => void
    mocks.signInWithOtp.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    renderApp()
    await user.type(
      await screen.findByLabelText('Email address'),
      'lifter@example.com',
    )
    await user.click(screen.getByRole('button', { name: 'Send sign-in link' }))
    expect(
      screen.getByRole('button', { name: 'Sending link...' }),
    ).toBeDisabled()
    expect(screen.queryByText(/Check your inbox/)).not.toBeInTheDocument()
    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: 'lifter@example.com',
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    await act(async () => finish({ error: null }))
    expect(screen.getByRole('status')).toHaveTextContent(
      'Check your inbox at lifter@example.com',
    )
    await user.click(
      screen.getByRole('button', { name: 'Resend sign-in link' }),
    )
    expect(mocks.signInWithOtp).toHaveBeenCalledTimes(2)
  })

  it.each(['response', 'network'])(
    'preserves the email after a %s send failure and allows retry',
    async (failure) => {
      if (failure === 'response')
        mocks.signInWithOtp.mockResolvedValueOnce({
          error: new Error('Rate limit'),
        })
      else mocks.signInWithOtp.mockRejectedValueOnce(new Error('Network'))
      const user = userEvent.setup()
      renderApp('/login')
      const email = await screen.findByLabelText('Email address')
      await user.type(email, 'lifter@example.com')
      await user.click(
        screen.getByRole('button', { name: 'Send sign-in link' }),
      )
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'We could not send your link',
      )
      expect(email).toHaveValue('lifter@example.com')
      expect(screen.queryByText(/Check your inbox/)).not.toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: 'Send sign-in link' }),
      )
      expect(await screen.findByRole('status')).toHaveTextContent(
        'Check your inbox',
      )
    },
  )

  it('requires a valid email before sending', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.type(await screen.findByLabelText('Email address'), 'invalid')
    await user.click(screen.getByRole('button', { name: 'Send sign-in link' }))
    expect(mocks.signInWithOtp).not.toHaveBeenCalled()
  })

  it.each(['/', '/login', '/auth/callback'])(
    'restores a session at %s',
    async (path) => {
      mocks.getSession.mockResolvedValue({ data: { session }, error: null })
      renderApp(path)
      expect(
        await screen.findByText('Signed in as lifter@example.com'),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument()
    },
  )

  it('updates the private page when auth changes in another tab', async () => {
    renderApp()
    await screen.findByLabelText('Email address')
    act(() => emitSession(session))
    expect(await screen.findByText(/Signed in as/)).toBeInTheDocument()
    act(() => emitSession(null))
    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
  })

  it('does not overwrite a newer sign-out event with an old session read', async () => {
    let finish!: (value: unknown) => void
    mocks.getSession.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    renderApp()
    await waitFor(() => expect(mocks.getSession).toHaveBeenCalled())
    act(() => emitSession(null))
    await act(async () => finish({ data: { session }, error: null }))
    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
  })

  it('signs out locally and returns to login', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null })
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
  })

  it('keeps the account visible when sign-out fails and allows retry', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null })
    mocks.signOut.mockResolvedValueOnce({ error: new Error('Network') })
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to sign out',
    )
    expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
  })

  it('handles a missing callback session', async () => {
    renderApp('/auth/callback')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'missing, invalid, or expired',
    )
    expect(
      screen.getByRole('link', { name: 'Request a new link' }),
    ).toHaveAttribute('href', '/login')
  })

  it('shows callback initialization errors even if an older session exists', async () => {
    mocks.initialize.mockResolvedValue({ error: new Error('Expired link') })
    mocks.getSession.mockResolvedValue({ data: { session }, error: null })
    renderApp('/auth/callback')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'expired or already been used',
    )
    expect(mocks.getSession).not.toHaveBeenCalled()
  })

  it('shows a recovery action if session restoration fails', async () => {
    mocks.getSession.mockRejectedValue(new Error('Network'))
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not check your session',
    )
    expect(screen.getByRole('link', { name: 'Try again' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('provides setup instructions when configuration is missing', () => {
    mocks.getClient.mockImplementation(() => {
      throw new Error('Missing configuration')
    })
    renderApp()
    expect(
      screen.getByRole('heading', { name: 'Connect LiftIt' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Copy .env.example/)).toBeInTheDocument()
  })

  it('unsubscribes from auth events on unmount', async () => {
    const view = renderApp()
    await screen.findByLabelText('Email address')
    view.unmount()
    expect(mocks.listeners.size).toBe(0)
  })
})
