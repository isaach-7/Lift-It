import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { WorkoutWalkthrough } from './WorkoutWalkthrough.tsx'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('pauses, completes and replays the demonstration', () => {
  vi.useFakeTimers()
  render(<WorkoutWalkthrough />)
  fireEvent.click(screen.getByRole('button', { name: 'Pause demo' }))
  act(() => vi.advanceTimersByTime(10000))
  expect(
    screen.queryByText('Set saved / Next weight: 22.5 kg'),
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Play demo' }))
  for (let i = 0; i < 9; i++) act(() => vi.advanceTimersByTime(1000))
  expect(
    screen.getByText('Set saved / Next weight: 22.5 kg'),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Replay demo' }))
  expect(screen.getByText('Enter the weight you lifted')).toBeInTheDocument()
})

it('shows the final state without playback under reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  render(<WorkoutWalkthrough />)
  expect(
    screen.getByText('Set saved / Next weight: 22.5 kg'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
