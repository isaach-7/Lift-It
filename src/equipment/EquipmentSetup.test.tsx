import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { it, expect, vi } from 'vitest'
import { EquipmentSetup } from './EquipmentSetup.tsx'
import { blankExercise } from '../workouts/model.ts'
import { machineType } from './presets.ts'
it('requires installed stack confirmation before applying a manufacturer preset', async () => {
  const change = vi.fn()
  const user = userEvent.setup()
  render(
    <EquipmentSetup
      exercise={{
        id: 'chest',
        name: 'Converging Chest Press Machine',
        equipment_type: 'machine',
        muscle_group: 'Chest',
        primary_muscle: 'Chest',
        secondary_muscles: [],
        supports_added_weight: false,
        image_path: '',
        instructions: [],
      }}
      plan={blankExercise('chest')}
      onChange={change}
    />,
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Manufacturer reference' }),
    'matrix-g7-s13',
  )
  expect(
    screen.getByRole('button', { name: 'Apply confirmed main-plate preset' }),
  ).toBeDisabled()
  await user.type(
    screen.getByLabelText('First main plate label on your machine (kg)'),
    '4.5',
  )
  await user.click(
    screen.getByRole('checkbox', {
      name: 'These main-plate labels match my installed machine.',
    }),
  )
  await user.click(
    screen.getByRole('button', { name: 'Apply confirmed main-plate preset' }),
  )
  expect(change).toHaveBeenCalledWith(
    expect.objectContaining({
      available_weights: expect.arrayContaining([4.5, 9, 108]),
      increment_amount: 4.5,
    }),
  )
  expect(change.mock.calls[0]?.[0].available_weights).toHaveLength(24)
})
it.each([
  ['Chest press machine', 'chest'],
  ['Shoulder press machine', 'shoulder'],
  ['Lat pulldown', 'lat'],
  ['Seated cable row', 'row'],
  ['Leg extension', 'extension'],
  ['Seated leg curl', 'curl'],
])('selects a generic preview for %s', (name, expected) =>
  expect(machineType(name)).toBe(expected),
)
it('does not substitute unrelated machine previews', () =>
  expect(machineType('Dumbbell biceps curl')).toBeNull())
