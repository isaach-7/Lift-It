import { describe, it, expect } from 'vitest'
import { nextWeight, encouragement, weekBounds, localDate } from './rules.ts'
describe('weight progression boundaries', () => {
  it.each([
    [5, 37.5],
    [6, 40],
    [10, 40],
    [11, 42.5],
  ])('reps %s recommends %s', (reps, expected) =>
    expect(nextWeight(40, reps, 'standard', 6, 10, 2.5, [])).toBe(expected),
  )
  it('excludes warmups and includes failure', () => {
    expect(nextWeight(40, 11, 'warmup', 6, 10, 2.5, [])).toBe(40)
    expect(nextWeight(40, 5, 'failure', 6, 10, 2.5, [])).toBe(37.5)
  })
  it('clamps at zero and list limits', () => {
    expect(nextWeight(1, 5, 'standard', 6, 10, 2.5, [])).toBe(0)
    expect(nextWeight(5, 5, 'standard', 6, 10, 2.5, [5, 8, 12])).toBe(5)
    expect(nextWeight(12, 11, 'standard', 6, 10, 2.5, [5, 8, 12])).toBe(12)
  })
  it('uses actual adjacent available weights', () => {
    expect(nextWeight(8, 11, 'standard', 6, 10, 2.5, [5, 8, 12])).toBe(12)
    expect(nextWeight(8, 5, 'standard', 6, 10, 2.5, [5, 8, 12])).toBe(5)
  })
  it('does not progress when disabled', () =>
    expect(nextWeight(40, 11, 'standard', 6, 10, 2.5, [], false)).toBe(40))
})
describe('weekly motivation', () => {
  it.each([1, 2, 4, 7])('handles goal %s and exceeded goal', (goal) => {
    expect(encouragement(0, goal, 'Alex')).toContain('first workout')
    expect(encouragement(goal, goal, 'Alex')).toContain('Smashed it, Alex')
    expect(encouragement(goal + 1, goal, 'Alex')).toContain('Smashed it, Alex')
  })
  it('matches the four-day sequence', () => {
    expect(encouragement(1, 4, 'Alex')).toContain("You've made a start")
    expect(encouragement(2, 4, 'Alex')).toContain('Halfway')
    expect(encouragement(3, 4, 'Alex')).toContain('Only one more')
  })
  it('prioritizes one remaining above halfway', () =>
    expect(encouragement(1, 2, 'Alex')).toContain('Only one more'))
  it('uses local Monday midnight through next Monday', () => {
    const { start, end } = weekBounds(new Date(2026, 8, 13, 23, 59))
    expect(localDate(start)).toBe('2026-09-07')
    expect(localDate(end)).toBe('2026-09-14')
    expect(start.getHours()).toBe(0)
  })
})
