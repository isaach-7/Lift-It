import { describe, expect, it } from 'vitest'
import {
  convertWeightText,
  displayWeight,
  parseWeight,
  POUNDS_PER_KILOGRAM,
} from './weight.ts'

describe('weight units', () => {
  it.each([
    [20, '44.09'],
    [50, '110.23'],
    [100, '220.46'],
  ])('displays %s kg as %s lb', (kg, pounds) => {
    expect(displayWeight(kg, 'lb')).toBe(pounds)
  })

  it('keeps canonical kilograms stable through a display round trip', () => {
    const pounds = displayWeight(100, 'lb')
    expect(parseWeight(pounds, 'lb')).toBeCloseTo(100, 2)
    expect(convertWeightText(pounds, 'lb', 'kg')).toBe('100')
  })

  it('uses the required conversion constant and accepts zero', () => {
    expect(POUNDS_PER_KILOGRAM).toBe(2.2046226218)
    expect(parseWeight('0', 'kg')).toBe(0)
  })

  it.each(['0', '0.5', '1', '2.5', '7.5', '20', '22.5', '82.5', '100'])(
    'accepts the realistic kilogram input %s',
    (value) => expect(parseWeight(value, 'kg')).toBe(Number(value)),
  )

  it('accepts a trailing decimal as an intermediate value', () => {
    expect(parseWeight('82.', 'kg')).toBe(82)
    expect(parseWeight('', 'kg')).toBeNull()
  })
})
