import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, it, expect, vi } from 'vitest'
import { WorkoutEditor } from './WorkoutEditor.tsx'
import { AuthContext } from '../auth/auth-context.ts'
import { ProfileContext } from '../profile/profile-context.ts'
import { listExercises } from '../exercises/exercise-library.ts'
vi.mock('../exercises/exercise-library.ts', async (original) => ({
  ...(await original<typeof import('../exercises/exercise-library.ts')>()),
  listExercises: vi.fn(),
}))
const rpc = vi.fn()
function view() {
  return render(
    <AuthContext
      value={{
        client: { rpc } as unknown as SupabaseClient,
        state: { status: 'ready', session: null },
        passwordRecoveryUserId: null,
        completePasswordRecovery: vi.fn(),
      }}
    >
      <ProfileContext
        value={{
          profile: {
            id: 'a',
            preferred_name: 'Alex',
            height_cm: null,
            weekly_goal: 4,
            preferred_weight_unit: 'kg',
            onboarding_completed_at: '2026-09-09',
            fitness_data_consent_at: '2026-09-14',
            privacy_notice_version: '2026-09-14',
          },
          setProfile: vi.fn(),
        }}
      >
        <RouterProvider
          router={createMemoryRouter(
            [
              { path: '/workouts/new', element: <WorkoutEditor /> },
              { path: '/workouts', element: <p>Workout list</p> },
            ],
            { initialEntries: ['/workouts/new'] },
          )}
        />
      </ProfileContext>
    </AuthContext>,
  )
}
beforeEach(() => {
  vi.resetAllMocks()
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
})
it('creates blank standard sets and saves optional targets atomically', async () => {
  rpc.mockResolvedValue({ data: 'id', error: null })
  const user = userEvent.setup()
  view()
  await user.type(await screen.findByLabelText('Workout name'), 'Upper')
  await user.click(screen.getByRole('button', { name: 'Add exercises' }))
  await user.click(screen.getByRole('button', { name: 'Add exercise' }))
  expect(screen.getByLabelText('Bench press set 1 target weight')).toHaveValue(
    '',
  )
  await user.type(screen.getByLabelText('Bench press set 1 target reps'), '8')
  await user.click(screen.getByRole('button', { name: 'Save workout' }))
  await screen.findByText('Workout list')
  expect(rpc).toHaveBeenCalledWith(
    'save_workout_template',
    expect.objectContaining({
      p_name: 'Upper',
      p_exercises: [
        expect.objectContaining({
          auto_increment_enabled: false,
          sets: [
            expect.objectContaining({
              target_reps: 8,
              target_weight: null,
              set_type: 'standard',
            }),
          ],
        }),
      ],
    }),
  )
})
it('keeps the draft and its ID after a save failure', async () => {
  rpc.mockResolvedValue({ error: new Error('offline') })
  const user = userEvent.setup()
  view()
  await user.type(await screen.findByLabelText('Workout name'), 'Upper')
  await user.click(screen.getByRole('button', { name: 'Save workout' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'changes are still here',
  )
  const first = rpc.mock.calls[0]?.[1]
  await user.click(screen.getByRole('button', { name: 'Save workout' }))
  await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2))
  expect(rpc.mock.calls[1]?.[1]).toEqual(first)
})

it('only shows the unsaved status after the draft changes', async () => {
  const user = userEvent.setup()
  view()
  const name = await screen.findByLabelText('Workout name')
  expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  expect(screen.queryByText('No unsaved changes')).not.toBeInTheDocument()
  await user.type(name, 'Upper')
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
})

it('renders the exercise library in small batches', async () => {
  vi.mocked(listExercises).mockResolvedValue(
    Array.from({ length: 13 }, (_, index) => ({
      id: `exercise-${index}`,
      name: `Exercise ${index}`,
      equipment_type: 'barbell' as const,
      supports_added_weight: false,
      muscle_group: 'Chest' as const,
      primary_muscle: 'Chest',
      secondary_muscles: [],
      image_path: '',
      instructions: [],
    })),
  )
  const user = userEvent.setup()
  view()
  await user.click(await screen.findByRole('button', { name: 'Add exercises' }))
  expect(screen.getAllByRole('button', { name: 'Add exercise' })).toHaveLength(
    12,
  )
  await user.click(screen.getByRole('button', { name: 'Show 1 more' }))
  expect(screen.getAllByRole('button', { name: 'Add exercise' })).toHaveLength(
    13,
  )
})

it('defaults bodyweight to reps and requires an explicit added-weight choice', async () => {
  vi.mocked(listExercises).mockResolvedValue([
    {
      id: 'pullup',
      name: 'Pull-up',
      equipment_type: 'bodyweight',
      supports_added_weight: true,
      muscle_group: 'Back',
      primary_muscle: 'Lats',
      secondary_muscles: [],
      image_path: '',
      instructions: [],
    },
  ])
  const user = userEvent.setup()
  view()
  await user.type(await screen.findByLabelText('Workout name'), 'Pull')
  await user.click(screen.getByRole('button', { name: 'Add exercises' }))
  await user.click(screen.getByRole('button', { name: 'Add exercise' }))
  expect(
    screen.queryByLabelText('Pull-up set 1 target weight'),
  ).not.toBeInTheDocument()
  await user.click(screen.getByLabelText('Track added weight'))
  expect(screen.getByLabelText('Pull-up set 1 target weight')).toHaveValue('')
})
