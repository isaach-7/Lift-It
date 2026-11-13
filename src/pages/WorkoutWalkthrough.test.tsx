import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { WorkoutWalkthrough } from './WorkoutWalkthrough.tsx'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('pauses, shows progression, holds the result and loops', () => {
  vi.useFakeTimers()
  render(<WorkoutWalkthrough />)
  fireEvent.click(screen.getByRole('button', { name: 'Pause animation' }))
  act(() => vi.advanceTimersByTime(10000))
  expect(screen.queryByText('Next set: 22.5 kg')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Play animation' }))
  for (let i = 0; i < 9; i++) act(() => vi.advanceTimersByTime(1000))
  expect(screen.getByText('Next set: 22.5 kg')).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(3199))
  expect(screen.getByText('Next set: 22.5 kg')).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(1))
  expect(screen.queryByText('Next set: 22.5 kg')).not.toBeInTheDocument()
  expect(screen.queryByText('Replay demo')).not.toBeInTheDocument()
})

it('keeps the final state static under reduced motion', () => {
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  render(<WorkoutWalkthrough />)
  act(() => vi.advanceTimersByTime(30000))
  expect(screen.getByText('Next set: 22.5 kg')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
