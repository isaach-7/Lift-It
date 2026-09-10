import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, it, expect, vi } from 'vitest'
import { HomePage } from './HomePage.tsx'
import { AuthContext } from '../auth/auth-context.ts'
import { ProfileContext } from '../profile/profile-context.ts'
const rpc = vi.fn()
const profile = {
  id: 'a',
  preferred_name: 'Alex',
  height_cm: null,
  weekly_goal: 4,
  preferred_weight_unit: 'kg' as const,
  onboarding_completed_at: '2026-09-09',
}
function view() {
  const from = () => {
    const q = {
      select: () => q,
      eq: () => q,
      order: () => q,
      limit: () => q,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      returns: () => Promise.resolve({ data: [], error: null }),
    }
    return q
  }
  return render(
    <MemoryRouter>
      <AuthContext
        value={{
          client: { rpc, from } as unknown as SupabaseClient,
          state: { status: 'ready', session: null },
        }}
      >
        <ProfileContext value={{ profile, setProfile: vi.fn() }}>
          <HomePage />
        </ProfileContext>
      </AuthContext>
    </MemoryRouter>,
  )
}
beforeEach(() => {
  vi.resetAllMocks()
})
it('keeps start available when the chart fails', async () => {
  rpc.mockImplementation((name) =>
    Promise.resolve(
      name === 'exercise_progress'
        ? { error: new Error('offline') }
        : { data: [], error: null },
    ),
  )
  view()
  expect(
    await screen.findByRole('link', { name: 'Start workout' }),
  ).toHaveAttribute('href', '/workouts?start=1')
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to load exercise progress',
  )
  expect(
    screen.getByText('Ready to train, Alex? Start one today.'),
  ).toBeInTheDocument()
})
it('shows genuine empty states without invented chart values', async () => {
  rpc.mockResolvedValue({ data: [], error: null })
  view()
  expect(
    await screen.findByText('Progress starts with your first workout.'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0')
})
it('shows a one-point chart and its accessible recorded values', async () => {
  rpc.mockImplementation((name) =>
    Promise.resolve({
      error: null,
      data:
        name === 'exercise_progress'
          ? [
              {
                exercise_id: 'bench',
                exercise_name: 'Bench',
                equipment_key: 'machine-a',
                equipment_label: 'Gym A',
                session_id: 'session-a',
                completed_at: '2026-09-09T12:00:00Z',
                value: 40,
                metric: 'kg',
              },
            ]
          : [],
    }),
  )
  view()
  expect(
    await screen.findByText(
      'First session recorded. Another session will show your trend.',
    ),
  ).toBeInTheDocument()
  expect(screen.getByRole('img')).toHaveAccessibleName(
    'Maximum kg per session. Recorded values are available below.',
  )
  expect(screen.getByText('Maximum (kg)')).toBeInTheDocument()
})
