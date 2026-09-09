import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { SupabaseClient, Session } from '@supabase/supabase-js'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { SessionPage } from './SessionPage.tsx'
import { AuthContext } from '../auth/auth-context.ts'
import { loadSession } from './data.ts'
import { listExercises } from '../exercises/exercise-library.ts'
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
      <RouterProvider
        router={createMemoryRouter(
          [
            { path: '/sessions/:id', element: <SessionPage /> },
            { path: '/', element: <p>Dashboard</p> },
          ],
          { initialEntries: ['/sessions/session-a'] },
        )}
      />
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
    const reps = await screen.findByLabelText('Reps')
    expect(reps).toHaveValue(null)
    expect(screen.getByLabelText('kg')).toHaveValue(null)
    await user.type(reps, '11')
    await user.type(screen.getByLabelText('kg'), '40')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('button', { name: 'Saved' })).toBeDisabled()
    expect(rpc).toHaveBeenCalledWith('log_workout_set', {
      p_id: 'set-a',
      p_reps: 11,
      p_weight: 40,
      p_scope: null,
    })
  })
  it('preserves failed entries and blocks finishing until resolved', async () => {
    rpc.mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    view()
    await user.type(await screen.findByLabelText('Reps'), '8')
    await user.type(screen.getByLabelText('kg'), '40')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Save not confirmed',
    )
    expect(screen.getByLabelText('kg')).toHaveValue(40)
    await user.click(screen.getByRole('button', { name: 'Finish workout' }))
    expect(
      screen.getByText('Save or resolve your entered sets before finishing.'),
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
    expect(await screen.findByLabelText('kg')).toHaveValue(40)
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
    await user.type(await screen.findByLabelText('Reps'), '8')
    await user.clear(screen.getByLabelText('kg'))
    await user.type(screen.getByLabelText('kg'), '30')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose whether')
    expect(rpc).not.toHaveBeenCalled()
    expect(
      within(
        screen.getByLabelText('If changing the suggested weight'),
      ).getByRole('option', { name: 'Use going forward' }),
    ).toBeInTheDocument()
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
