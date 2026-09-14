import type { Session } from '@supabase/supabase-js'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { routes } from './routes.tsx'
import { readProfile } from './profile/profile.ts'
import {
  listExercises,
  listTemplateExercises,
} from './exercises/exercise-library.ts'
import { listWorkoutTemplates } from './workouts/templates.ts'

vi.mock('./profile/profile.ts', () => ({
  readProfile: vi.fn().mockResolvedValue({
    id: 'user-a',
    preferred_name: 'Alex',
    weekly_goal: 4,
    height_cm: null,
    preferred_weight_unit: 'kg',
    onboarding_completed_at: '2026-09-09',
    fitness_data_consent_at: '2026-09-14',
    privacy_notice_version: '2026-09-14',
  }),
}))
vi.mock('./pages/HomePage.tsx', () => ({ HomePage: () => <h1>Hi, Alex!</h1> }))

vi.mock('./workouts/templates.ts', () => ({ listWorkoutTemplates: vi.fn() }))
vi.mock('./exercises/exercise-library.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./exercises/exercise-library.ts')>()),
  listExercises: vi.fn(),
  listTemplateExercises: vi.fn(),
}))

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  resend: vi.fn(),
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

function renderApp(path = '/app') {
  return render(
    <StrictMode>
      <RouterProvider
        router={createMemoryRouter(routes, { initialEntries: [path] })}
      />
    </StrictMode>,
  )
}

function emitSession(
  value: Session | null,
  event = value ? 'SIGNED_IN' : 'SIGNED_OUT',
) {
  mocks.listeners.forEach((listener) => listener(event, value))
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(readProfile).mockResolvedValue({
    id: 'user-a',
    preferred_name: 'Alex',
    weekly_goal: 4,
    height_cm: null,
    preferred_weight_unit: 'kg',
    onboarding_completed_at: '2026-09-09',
    fitness_data_consent_at: '2026-09-14',
    privacy_notice_version: '2026-09-14',
  })
  vi.mocked(listWorkoutTemplates).mockResolvedValue([])
  vi.mocked(listExercises).mockResolvedValue([])
  vi.mocked(listTemplateExercises).mockResolvedValue([])
  mocks.listeners.clear()
  mocks.initialize.mockResolvedValue({ error: null })
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
  mocks.signInWithPassword.mockResolvedValue({ error: null })
  mocks.signOut.mockImplementation(async () => {
    emitSession(null)
    return { error: null }
  })
  mocks.getClient.mockReturnValue({
    auth: {
      initialize: mocks.initialize,
      getSession: mocks.getSession,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      signUp: mocks.signUp,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
      resend: mocks.resend,
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
  it('keeps the public landing page available while auth initializes', () => {
    mocks.initialize.mockReturnValue(new Promise(() => undefined))
    renderApp('/')
    expect(
      screen.getByRole('heading', {
        name: 'Train with intent. Track the work. See the progress.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: 'Create account' }),
    ).not.toHaveLength(0)
    expect(screen.getAllByRole('link', { name: 'Sign in' })).not.toHaveLength(0)
  })

  it('keeps the privacy notice available without Supabase configuration', () => {
    mocks.getClient.mockImplementation(() => {
      throw new Error('Missing configuration')
    })
    renderApp('/privacy')
    expect(
      screen.getByRole('heading', {
        name: 'How LiftIt handles your information.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/does not sell personal information/i),
    ).toBeInTheDocument()
  })

  it('sets useful route metadata while keeping private pages out of search', async () => {
    renderApp('/register')
    await screen.findByLabelText('Email address')
    expect(document.title).toBe('Create account | LiftIt')
  })

  it('keeps private content and the login form hidden while checking', async () => {
    let finish!: (value: { error: null }) => void
    mocks.initialize.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    renderApp('/app')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session',
    )
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument()
    expect(screen.queryByText(/Hi, Alex!/)).not.toBeInTheDocument()
    await act(async () => finish({ error: null }))
    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
  })

  it('signs in with a password and displays pending state', async () => {
    const user = userEvent.setup()
    let finish!: (value: { error: null }) => void
    mocks.signInWithPassword.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    renderApp('/login')
    await user.type(
      await screen.findByLabelText('Email address'),
      'lifter@example.com',
    )
    await user.type(screen.getByLabelText('Password'), 'a-long-password')
    fireEvent.submit(
      screen.getByRole('button', { name: 'Sign in' }).closest('form')!,
    )
    expect(
      screen.getByRole('button', { name: 'Please wait...' }),
    ).toBeDisabled()
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'lifter@example.com',
      password: 'a-long-password',
    })
    await act(async () => finish({ error: null }))
  })

  it('preserves email and password on network failure', async () => {
    mocks.signInWithPassword.mockRejectedValueOnce(new Error('Network'))
    const user = userEvent.setup()
    renderApp('/login')
    await user.type(
      await screen.findByLabelText('Email address'),
      'lifter@example.com',
    )
    await user.type(screen.getByLabelText('Password'), 'a-long-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to sign in',
    )
    expect(screen.getByLabelText('Email address')).toHaveValue(
      'lifter@example.com',
    )
    expect(screen.getByLabelText('Password')).toHaveValue('a-long-password')
  })

  it('registers with matching passwords and requests email verification', async () => {
    mocks.signUp.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    renderApp('/register')
    await user.type(
      await screen.findByLabelText('Email address'),
      'lifter@example.com',
    )
    await user.type(screen.getByLabelText('Password'), 'a-long-password')
    await user.type(
      screen.getByLabelText('Confirm password'),
      'a-long-password',
    )
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'lifter@example.com',
      password: 'a-long-password',
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'verify your email',
    )
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('rejects mismatched registration passwords without an API call', async () => {
    const user = userEvent.setup()
    renderApp('/register')
    await user.type(
      await screen.findByLabelText('Email address'),
      'lifter@example.com',
    )
    await user.type(screen.getByLabelText('Password'), 'a-long-password')
    await user.type(
      screen.getByLabelText('Confirm password'),
      'another-password',
    )
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Passwords do not match',
    )
    expect(mocks.signUp).not.toHaveBeenCalled()
  })

  it('normalizes account email and rejects malformed addresses locally', async () => {
    const user = userEvent.setup()
    renderApp('/login')
    const email = await screen.findByLabelText('Email address')
    await user.type(email, 'invalid')
    await user.type(screen.getByLabelText('Password'), 'a-long-password')
    fireEvent.submit(
      screen.getByRole('button', { name: 'Sign in' }).closest('form')!,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'valid email address',
    )
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()

    await user.clear(email)
    fireEvent.change(email, { target: { value: ' LIFTER@EXAMPLE.COM ' } })
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'lifter@example.com',
      password: 'a-long-password',
    })
  })

  it('uses neutral recovery responses for existing and unknown accounts', async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    renderApp('/forgot-password')
    await user.type(
      await screen.findByLabelText('Email address'),
      'unknown@example.com',
    )
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'If an account exists',
    )
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      'unknown@example.com',
      { redirectTo: `${window.location.origin}/update-password` },
    )
  })

  it('allows password updates only after a recovery auth event', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null })
    mocks.initialize.mockImplementationOnce(async () => {
      emitSession(session, 'PASSWORD_RECOVERY')
      return { error: null }
    })
    mocks.updateUser.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    renderApp('/update-password')
    await user.type(await screen.findByLabelText('Password'), 'a-new-password')
    await user.type(screen.getByLabelText('Confirm password'), 'a-new-password')
    expect(screen.queryByText('Hi, Alex!')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save password' }))
    expect(mocks.updateUser).toHaveBeenCalledWith({
      password: 'a-new-password',
    })
    expect(await screen.findByText('Hi, Alex!')).toBeInTheDocument()
  })

  it('rejects the update route for a normally authenticated session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null })
    renderApp('/update-password')
    expect(
      await screen.findByText(
        'This recovery link is missing, invalid, or expired.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it.each(['/app', '/login', '/auth/callback'])(
    'restores a session at %s',
    async (path) => {
      mocks.getSession.mockResolvedValue({ data: { session }, error: null })
      renderApp(path)
      expect(await screen.findByText('Hi, Alex!')).toBeInTheDocument()
      expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument()
    },
  )

  it('updates the private page when auth changes in another tab', async () => {
    renderApp('/app')
    await screen.findByLabelText('Email address')
    act(() => emitSession(session))
    expect(await screen.findByText(/Hi, Alex!/)).toBeInTheDocument()
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
    renderApp('/app')
    await waitFor(() => expect(mocks.getSession).toHaveBeenCalled())
    act(() => emitSession(null))
    await act(async () => finish({ data: { session }, error: null }))
    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
  })

  it('signs out locally and returns to login', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null })
    const user = userEvent.setup()
    renderApp('/app')
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
  })

  it('keeps the account visible when sign-out fails and allows retry', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null })
    mocks.signOut.mockResolvedValueOnce({ error: new Error('Network') })
    const user = userEvent.setup()
    renderApp('/app')
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to sign out',
    )
    expect(screen.getByText(/Hi, Alex!/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
  })

  it('handles a missing callback session', async () => {
    renderApp('/auth/callback')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'missing, invalid, or expired',
    )
    expect(
      screen.getByRole('link', { name: 'Return to sign in' }),
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
      '/app',
    )
  })

  it('provides setup instructions when configuration is missing', () => {
    mocks.getClient.mockImplementation(() => {
      throw new Error('Missing configuration')
    })
    renderApp('/app')
    expect(
      screen.getByRole('heading', { name: 'Connect LiftIt' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Copy .env.example/)).toBeInTheDocument()
  })

  it('unsubscribes from auth events on unmount', async () => {
    const view = renderApp('/app')
    await screen.findByLabelText('Email address')
    view.unmount()
    expect(mocks.listeners.size).toBe(0)
  })
})
