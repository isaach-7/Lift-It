import type { SupabaseClient } from '@supabase/supabase-js'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addTemplateExercise,
  listExercises,
  listTemplateExercises,
  removeTemplateExercise,
} from '../exercises/exercise-library.ts'
import type { Exercise } from '../exercises/exercise-library.ts'
import { WorkoutTemplates } from './WorkoutTemplates.tsx'
import { listWorkoutTemplates, saveWorkoutTemplate } from './templates.ts'
import type { WorkoutTemplate } from './templates.ts'

vi.mock('./templates.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./templates.ts')>()),
  listWorkoutTemplates: vi.fn(),
  saveWorkoutTemplate: vi.fn(),
}))

vi.mock('../exercises/exercise-library.ts', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../exercises/exercise-library.ts')
  >()),
  listExercises: vi.fn(),
  listTemplateExercises: vi.fn(),
  addTemplateExercise: vi.fn(),
  removeTemplateExercise: vi.fn(),
}))

const client = {} as SupabaseClient
const saved: WorkoutTemplate = {
  id: 'template-a',
  name: 'Push day',
  created_at: '2026-09-09T12:00:00Z',
}

const benchPress: Exercise = {
  id: 'exercise-bench',
  name: 'Barbell Bench Press',
  muscle_group: 'Chest',
  primary_muscle: 'Chest',
  secondary_muscles: ['Front delts', 'Triceps'],
  equipment_type: 'barbell',
  image_path: '/exercise-images/barbell-bench-press.jpg',
  supports_added_weight: false,
  instructions: [
    'Set your eyes under the bar and plant both feet.',
    'Lower the bar to the mid chest with forearms vertical.',
    'Press up while keeping the upper back braced.',
  ],
}

const pullUp: Exercise = {
  id: 'exercise-pull-up',
  name: 'Pull-Up',
  muscle_group: 'Back',
  primary_muscle: 'Lats',
  secondary_muscles: ['Biceps', 'Core'],
  equipment_type: 'bodyweight',
  image_path: '/exercise-images/pull-up.jpg',
  supports_added_weight: true,
  instructions: [
    'Hang from the bar with the shoulders active.',
    'Pull the chest upward by driving the elbows down.',
    'Lower to straight arms under control.',
  ],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listWorkoutTemplates).mockResolvedValue([])
  vi.mocked(listExercises).mockResolvedValue([benchPress, pullUp])
  vi.mocked(listTemplateExercises).mockResolvedValue([])
  vi.mocked(saveWorkoutTemplate).mockResolvedValue(saved)
  vi.mocked(addTemplateExercise).mockResolvedValue({
    workout_template_id: saved.id,
    exercise_id: benchPress.id,
    position: 0,
  })
  vi.mocked(removeTemplateExercise).mockResolvedValue()
})

describe('saved workouts', () => {
  it('shows loading then the first-workout empty state', async () => {
    let finish!: (templates: WorkoutTemplate[]) => void
    vi.mocked(listWorkoutTemplates).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    render(<WorkoutTemplates client={client} userId="user-a" />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading your workouts',
    )
    expect(
      screen.queryByRole('button', { name: 'Create workout' }),
    ).not.toBeInTheDocument()
    await act(async () => finish([]))
    expect(screen.getByText('No workouts yet')).toBeInTheDocument()
  })

  it('retries a failed list load without showing a false empty state', async () => {
    vi.mocked(listWorkoutTemplates).mockRejectedValueOnce(new Error('Offline'))
    const user = userEvent.setup()
    render(<WorkoutTemplates client={client} userId="user-a" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('could not load')
    expect(screen.queryByText('No workouts yet')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry loading' }))
    expect(await screen.findByText('No workouts yet')).toBeInTheDocument()
  })

  it('creates a workout only after the server confirms it', async () => {
    let finish!: (template: WorkoutTemplate) => void
    vi.mocked(saveWorkoutTemplate).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const user = userEvent.setup()
    render(<WorkoutTemplates client={client} userId="user-a" />)
    await user.type(await screen.findByLabelText('Workout name'), 'Push day')
    await user.click(screen.getByRole('button', { name: 'Create workout' }))
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    expect(
      screen.queryByRole('heading', { name: 'Push day' }),
    ).not.toBeInTheDocument()
    await act(async () => finish(saved))
    expect(
      screen.getByRole('heading', { name: 'Push day' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Workout name')).toHaveValue('')
    expect(listWorkoutTemplates).toHaveBeenCalledTimes(1)
  })

  it('retains the draft and reuses its ID after an uncertain save', async () => {
    vi.mocked(saveWorkoutTemplate).mockRejectedValueOnce(
      new Error('Response lost'),
    )
    const user = userEvent.setup()
    render(<WorkoutTemplates client={client} userId="user-a" />)
    const input = await screen.findByLabelText('Workout name')
    await user.type(input, 'Push day')
    await user.click(screen.getByRole('button', { name: 'Create workout' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not confirm',
    )
    expect(input).toHaveValue('Push day')
    await user.click(screen.getByRole('button', { name: 'Create workout' }))
    expect(saveWorkoutTemplate).toHaveBeenCalledTimes(2)
    const calls = vi.mocked(saveWorkoutTemplate).mock.calls
    expect(calls[0]?.[2]).toBe(calls[1]?.[2])
    expect(screen.getAllByRole('heading', { name: 'Push day' })).toHaveLength(1)
    await user.type(screen.getByLabelText('Workout name'), 'Pull day')
    await user.click(screen.getByRole('button', { name: 'Create workout' }))
    expect(vi.mocked(saveWorkoutTemplate).mock.calls[2]?.[2]).not.toBe(
      calls[0]?.[2],
    )
  })

  it('rejects a whitespace-only name without saving', async () => {
    const user = userEvent.setup()
    render(<WorkoutTemplates client={client} userId="user-a" />)
    await user.type(await screen.findByLabelText('Workout name'), '   ')
    await user.click(screen.getByRole('button', { name: 'Create workout' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a workout name')
    expect(saveWorkoutTemplate).not.toHaveBeenCalled()
  })

  it('loads previously saved workouts when mounted again', async () => {
    vi.mocked(listWorkoutTemplates).mockResolvedValue([saved])
    const view = render(<WorkoutTemplates client={client} userId="user-a" />)
    expect(
      await screen.findByRole('heading', { name: 'Push day' }),
    ).toBeInTheDocument()
    view.unmount()
    render(<WorkoutTemplates client={client} userId="user-a" />)
    expect(
      await screen.findByRole('heading', { name: 'Push day' }),
    ).toBeInTheDocument()
    expect(listWorkoutTemplates).toHaveBeenLastCalledWith(client, 'user-a')
  })

  it('preserves a failed rename then replaces the confirmed row', async () => {
    vi.mocked(listWorkoutTemplates).mockResolvedValue([saved])
    vi.mocked(saveWorkoutTemplate)
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ ...saved, name: 'Upper body' })
    const user = userEvent.setup()
    render(<WorkoutTemplates client={client} userId="user-a" />)
    await user.click(
      await screen.findByRole('button', { name: 'Rename Push day' }),
    )
    const card = within(screen.getByRole('listitem'))
    const input = card.getByLabelText('Workout name')
    await user.clear(input)
    await user.type(input, 'Upper body')
    await user.click(card.getByRole('button', { name: 'Save name' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not confirm',
    )
    expect(input).toHaveValue('Upper body')
    expect(card.getByRole('heading')).toHaveTextContent('Push day')
    await user.click(card.getByRole('button', { name: 'Save name' }))
    expect(
      await screen.findByRole('heading', { name: 'Upper body' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(saveWorkoutTemplate).toHaveBeenLastCalledWith(
      client,
      'user-a',
      saved.id,
      'Upper body',
      false,
    )
  })

  it('cancels a rename without sending a write', async () => {
    vi.mocked(listWorkoutTemplates).mockResolvedValue([saved])
    const user = userEvent.setup()
    render(<WorkoutTemplates client={client} userId="user-a" />)
    await user.click(
      await screen.findByRole('button', { name: 'Rename Push day' }),
    )
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(
      screen.getByRole('button', { name: 'Rename Push day' }),
    ).toBeInTheDocument()
    expect(saveWorkoutTemplate).not.toHaveBeenCalled()
  })

  it('filters exercises by muscle details and shows weighted guidance', async () => {
    vi.mocked(listWorkoutTemplates).mockResolvedValue([saved])
    const user = userEvent.setup()
    render(<WorkoutTemplates client={client} userId="user-a" />)

    await user.click(
      await screen.findByRole('button', { name: 'Add exercises' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Build this workout' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Weighted option')).toBeInTheDocument()

    const search = screen.getByLabelText('Search exercises')
    await user.type(search, 'lats')
    expect(screen.getByRole('heading', { name: 'Pull-Up' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Barbell Bench Press' }),
    ).not.toBeInTheDocument()

    await user.clear(search)
    await user.click(screen.getByRole('button', { name: 'Chest' }))
    expect(
      screen.getByRole('heading', { name: 'Barbell Bench Press' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Pull-Up' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByText('How to perform'))
    expect(screen.getByText(/Lower the bar to the mid chest/)).toBeVisible()
  })

  it('adds an exercise only after the server confirms the save', async () => {
    vi.mocked(listWorkoutTemplates).mockResolvedValue([saved])
    let finish!: (value: {
      workout_template_id: string
      exercise_id: string
      position: number
    }) => void
    vi.mocked(addTemplateExercise).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const user = userEvent.setup()
    render(<WorkoutTemplates client={client} userId="user-a" />)

    await user.click(
      await screen.findByRole('button', { name: 'Add exercises' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Add Barbell Bench Press' }),
    )
    expect(
      screen.getByRole('button', { name: 'Add Barbell Bench Press' }),
    ).toHaveTextContent('Adding...')
    expect(
      screen.getByRole('button', { name: 'Add Barbell Bench Press' }),
    ).toBeDisabled()
    expect(screen.getByText('No exercises added')).toBeInTheDocument()

    await act(async () =>
      finish({
        workout_template_id: saved.id,
        exercise_id: benchPress.id,
        position: 0,
      }),
    )
    expect(screen.getByText('1 exercise')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove Barbell Bench Press' }),
    ).toBeInTheDocument()
    expect(addTemplateExercise).toHaveBeenCalledWith(
      client,
      'user-a',
      saved.id,
      benchPress.id,
      0,
    )
  })

  it('keeps the current selection after a failed removal', async () => {
    vi.mocked(listWorkoutTemplates).mockResolvedValue([saved])
    const selected = {
      workout_template_id: saved.id,
      exercise_id: benchPress.id,
      position: 0,
    }
    vi.mocked(listTemplateExercises).mockResolvedValue([selected])
    vi.mocked(removeTemplateExercise).mockRejectedValueOnce(
      new Error('Offline'),
    )
    const user = userEvent.setup()
    render(<WorkoutTemplates client={client} userId="user-a" />)

    await user.click(
      await screen.findByRole('button', { name: 'Edit exercises' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Remove Barbell Bench Press' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not remove Barbell Bench Press',
    )
    expect(screen.getByText('1 exercise')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove Barbell Bench Press' }),
    ).toBeInTheDocument()
    expect(listTemplateExercises).toHaveBeenCalledTimes(2)
  })

  it('removes an exercise only after the server confirms the delete', async () => {
    vi.mocked(listWorkoutTemplates).mockResolvedValue([saved])
    vi.mocked(listTemplateExercises).mockResolvedValue([
      {
        workout_template_id: saved.id,
        exercise_id: benchPress.id,
        position: 0,
      },
    ])
    let finish!: () => void
    vi.mocked(removeTemplateExercise).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve
      }),
    )
    const user = userEvent.setup()
    render(<WorkoutTemplates client={client} userId="user-a" />)

    await user.click(
      await screen.findByRole('button', { name: 'Edit exercises' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Remove Barbell Bench Press' }),
    )
    expect(screen.getByText('1 exercise')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove Barbell Bench Press' }),
    ).toHaveTextContent('Removing...')

    await act(async () => finish())
    expect(screen.getByText('No exercises added')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add Barbell Bench Press' }),
    ).toBeInTheDocument()
    expect(removeTemplateExercise).toHaveBeenCalledWith(
      client,
      'user-a',
      saved.id,
      benchPress.id,
    )
  })
})
