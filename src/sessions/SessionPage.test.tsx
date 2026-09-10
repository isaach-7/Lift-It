import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { SupabaseClient, Session } from '@supabase/supabase-js'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { SessionPage } from './SessionPage.tsx'
import { AuthContext } from '../auth/auth-context.ts'
import { loadSession } from './data.ts'
import { listExercises } from '../exercises/exercise-library.ts'
import { ProfileContext } from '../profile/profile-context.ts'
vi.mock('./data.ts', () => ({ loadSession: vi.fn() }))
vi.mock('../exercises/exercise-library.ts', () => ({ listExercises: vi.fn() }))
const rpc = vi.fn()
const progression = vi.fn()
const session = { user: { id: 'a' } } as Session
const exercise = {
  id: 'se',
  exercise_id: 'bench',
  position: 0,
  rest_timer_seconds: 90,
  auto_increment_enabled: true,
  rep_range_lower: 6,
  rep_range_upper: 10,
  increment_amount: 2.5,
  available_weights: [],
  equipment_label: 'Bench',
  equipment_key: 'key',
}
const set = {
  id: 'set-a',
  session_exercise_id: 'se',
  set_number: 0,
  set_type: 'standard' as const,
  target_reps: null,
  target_weight: null,
  reps: null,
  weight: null,
  completed_at: null,
  next_weight: null,
  override_scope: null,
}
function view() {
  const client = {
    rpc,
    from: () => ({ select: () => ({ eq: progression }) }),
  } as unknown as SupabaseClient
  return render(
    <AuthContext value={{ client, state: { status: 'ready', session } }}>
      <ProfileContext
        value={{
          profile: {
            id: 'a',
            preferred_name: 'Alex',
            height_cm: null,
            weekly_goal: 4,
            preferred_weight_unit: 'kg',
            onboarding_completed_at: '2026-09-09',
          },
          setProfile: vi.fn(),
        }}
      >
        <RouterProvider
          router={createMemoryRouter(
            [
              { path: '/sessions/:id', element: <SessionPage /> },
              { path: '/', element: <p>Dashboard</p> },
            ],
            { initialEntries: ['/sessions/session-a'] },
          )}
        />
      </ProfileContext>
    </AuthContext>,
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  progression.mockResolvedValue({ data: [], error: null })
  vi.mocked(listExercises).mockResolvedValue([
    {
      id: 'bench',
      name: 'Bench press',
      equipment_type: 'barbell',
      supports_added_weight: false,
      muscle_group: 'Chest',
      primary_muscle: 'Chest',
      secondary_muscles: [],
      image_path: '',
      instructions: ['Press carefully.'],
    },
  ])
  vi.mocked(loadSession).mockResolvedValue({
    session: {
      id: 'session-a',
      name: 'Upper',
      status: 'in_progress',
      started_at: '2026-09-09',
      completed_at: null,
    },
    exercises: [exercise],
    sets: [set],
  })
})
describe('live workout saves', () => {
  it('keeps first-use fields blank and saves entered performance', async () => {
    rpc.mockResolvedValue({
      data: {
        ...set,
        reps: 11,
        weight: 40,
        completed_at: '2026-09-09T12:00:00Z',
        next_weight: 42.5,
      },
      error: null,
    })
    const user = userEvent.setup()
    view()
    const reps = await screen.findByLabelText('Bench press set 1 reps')
    expect(reps).toHaveValue('')
    expect(screen.getByLabelText('Bench press set 1 weight in kg')).toHaveValue(
      '',
    )
    await user.type(reps, '11')
    await user.type(
      screen.getByLabelText('Bench press set 1 weight in kg'),
      '40',
    )
    await user.click(screen.getByRole('button', { name: 'Complete set 1' }))
    expect(
      await screen.findByRole('button', { name: 'Reopen set 1' }),
    ).toBeEnabled()
    expect(rpc).toHaveBeenCalledWith('log_workout_set', {
      p_id: 'set-a',
      p_reps: 11,
      p_weight: 40,
      p_scope: null,
    })
  })
  it('reopens a completed set and preserves its values for editing', async () => {
    rpc
      .mockResolvedValueOnce({
        data: {
          ...set,
          reps: 8,
          weight: 40,
          completed_at: '2026-09-09T12:00:00Z',
          next_weight: 40,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          set: { ...set, reps: null, weight: null, completed_at: null },
          current_weight: null,
        },
        error: null,
      })
    const user = userEvent.setup()
    view()
    await user.type(await screen.findByLabelText('Bench press set 1 reps'), '8')
    await user.type(
      screen.getByLabelText('Bench press set 1 weight in kg'),
      '40',
    )
    await user.click(screen.getByRole('button', { name: 'Complete set 1' }))
    await user.click(
      await screen.findByRole('button', { name: 'Reopen set 1' }),
    )
    expect(screen.getByLabelText('Bench press set 1 reps')).toHaveValue('8')
    expect(screen.getByLabelText('Bench press set 1 weight in kg')).toHaveValue(
      '40',
    )
    expect(screen.getByText('Unsaved entry')).toBeInTheDocument()
    expect(rpc).toHaveBeenLastCalledWith('unlog_workout_set', {
      p_id: 'set-a',
    })
  })
  it('preserves failed entries and blocks finishing until resolved', async () => {
    rpc.mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    view()
    await user.type(await screen.findByLabelText('Bench press set 1 reps'), '8')
    await user.type(
      screen.getByLabelText('Bench press set 1 weight in kg'),
      '40',
    )
    await user.click(screen.getByRole('button', { name: 'Complete set 1' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Save not confirmed',
    )
    expect(screen.getByLabelText('Bench press set 1 weight in kg')).toHaveValue(
      '40',
    )
    await user.click(screen.getByRole('button', { name: 'Finish workout' }))
    expect(
      screen.getByText('Retry the unconfirmed set save before finishing.'),
    ).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledTimes(1)
    await waitFor(() =>
      expect(localStorage.getItem('liftit-session-a-session-a')).toContain(
        '40',
      ),
    )
  })
  it('restores a local unsaved draft without calling a save automatically', async () => {
    localStorage.setItem(
      'liftit-session-a-session-a',
      JSON.stringify({
        drafts: {
          'set-a': { reps: '8', weight: '40', scope: '', dirty: true },
        },
      }),
    )
    view()
    expect(
      await screen.findByLabelText('Bench press set 1 weight in kg'),
    ).toHaveValue('40')
    expect(rpc).not.toHaveBeenCalled()
    expect(screen.getByText('Unsaved entry')).toBeInTheDocument()
  })
  it('requires an explicit scope when overriding a recommendation', async () => {
    progression.mockResolvedValue({
      data: [
        { exercise_id: 'bench', equipment_key: 'key', current_weight: 40 },
      ],
      error: null,
    })
    const user = userEvent.setup()
    view()
    await user.type(await screen.findByLabelText('Bench press set 1 reps'), '8')
    await user.clear(screen.getByLabelText('Bench press set 1 weight in kg'))
    await user.type(
      screen.getByLabelText('Bench press set 1 weight in kg'),
      '30',
    )
    await user.click(screen.getByRole('button', { name: 'Complete set 1' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose whether')
    expect(rpc).not.toHaveBeenCalled()
    expect(
      within(
        screen.getByRole('group', { name: 'Changed the suggested weight?' }),
      ).getByRole('button', { name: 'Going forward' }),
    ).toBeInTheDocument()
  })
  it.each(['1', '2', '3', '8', '12', '20'])(
    'accepts %s whole reps',
    async (value) => {
      rpc.mockResolvedValue({
        data: { ...set, reps: Number(value), weight: 0, completed_at: 'now' },
        error: null,
      })
      const user = userEvent.setup()
      view()
      const reps = await screen.findByLabelText('Bench press set 1 reps')
      await user.type(reps, value)
      await user.type(
        screen.getByLabelText('Bench press set 1 weight in kg'),
        '0',
      )
      await user.click(reps)
      await user.keyboard('{Enter}')
      await waitFor(() =>
        expect(rpc).toHaveBeenCalledWith(
          'log_workout_set',
          expect.objectContaining({ p_reps: Number(value), p_weight: 0 }),
        ),
      )
    },
  )
  it('confirms an incomplete workout and allows finishing anyway', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    const user = userEvent.setup()
    view()
    await screen.findByText('Bench press')
    await user.click(screen.getByRole('button', { name: 'Finish workout' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('1 incomplete set')
    await user.click(screen.getByRole('button', { name: 'Finish anyway' }))
    expect(rpc).toHaveBeenCalledWith('finish_workout', {
      p_id: 'session-a',
      p_abandon: false,
    })
  })
  it('finishes immediately when every set is complete', async () => {
    vi.mocked(loadSession).mockResolvedValue({
      session: {
        id: 'session-a',
        name: 'Upper',
        status: 'in_progress',
        started_at: '2026-09-09',
        completed_at: null,
      },
      exercises: [exercise],
      sets: [{ ...set, reps: 8, weight: 40, completed_at: '2026-09-09' }],
    })
    rpc.mockResolvedValue({ data: null, error: null })
    const user = userEvent.setup()
    view()
    await screen.findByRole('button', { name: 'Reopen set 1' })
    await user.click(screen.getByRole('button', { name: 'Finish workout' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('finish_workout', {
      p_id: 'session-a',
      p_abandon: false,
    })
  })
  it('rejects fractional reps with a specific message', async () => {
    const user = userEvent.setup()
    view()
    await user.type(
      await screen.findByLabelText('Bench press set 1 reps'),
      '2.5',
    )
    await user.type(
      screen.getByLabelText('Bench press set 1 weight in kg'),
      '20',
    )
    await user.click(screen.getByRole('button', { name: 'Complete set 1' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter the whole number of reps completed.',
    )
    expect(rpc).not.toHaveBeenCalled()
  })
  it('shows retry on failed loading', async () => {
    vi.mocked(loadSession).mockRejectedValue(new Error('offline'))
    view()
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load')
    expect(
      screen.getByRole('button', { name: 'Retry session' }),
    ).toBeInTheDocument()
  })
})
