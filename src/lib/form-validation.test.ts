import { describe, expect, it } from 'vitest'
import {
  normalizeEmail,
  validateEmail,
  validateNewPassword,
  validateProfile,
} from './form-validation.ts'

describe('form validation', () => {
  it('normalizes and validates account email addresses', () => {
    expect(normalizeEmail('  Lifter@Example.COM ')).toBe('lifter@example.com')
    expect(validateEmail('lifter@example.com')).toBeNull()
    expect(validateEmail('not-an-email')).toBe('Enter a valid email address.')
    expect(validateEmail(`${'a'.repeat(244)}@example.com`)).toContain('254')
  })

  it('bounds new passwords without changing their contents', () => {
    expect(validateNewPassword('short')).toBe('Use at least 12 characters.')
    expect(validateNewPassword('a secure passphrase')).toBeNull()
    expect(validateNewPassword('x'.repeat(1025))).toContain('1024')
  })

  it('validates profile values before the database request', () => {
    expect(validateProfile({ name: 'Alex', goal: '4', height: '' })).toBeNull()
    expect(validateProfile({ name: ' ', goal: '4', height: '' })).toContain(
      'preferred name',
    )
    expect(validateProfile({ name: 'Alex', goal: '8', height: '' })).toContain(
      '1 to 7',
    )
    expect(validateProfile({ name: 'Alex', goal: '4', height: '0' })).toContain(
      'greater than zero',
    )
  })
})
