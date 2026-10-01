import { describe, expect, it } from 'vitest'
import { formatDate } from './date.ts'

describe('formatDate', () => {
  it('uses the UK medium date format', () => {
    expect(formatDate('2026-09-14T12:00:00Z')).toBe('14 Sep 2026')
  })
})
