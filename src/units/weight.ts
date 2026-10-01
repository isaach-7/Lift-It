export type WeightUnit = 'kg' | 'lb'

export const POUNDS_PER_KILOGRAM = 2.2046226218

export function toKilograms(value: number, unit: WeightUnit) {
  return unit === 'kg' ? value : value / POUNDS_PER_KILOGRAM
}

export function fromKilograms(value: number, unit: WeightUnit) {
  return unit === 'kg' ? value : value * POUNDS_PER_KILOGRAM
}

export function roundWeight(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function displayWeight(valueKg: number, unit: WeightUnit) {
  const value = fromKilograms(valueKg, unit)
  return String(Math.round((value + Number.EPSILON) * 10) / 10)
}

export function parseWeight(value: string, unit: WeightUnit) {
  if (!value.trim()) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 100000) return null
  return roundWeight(toKilograms(parsed, unit))
}

export function convertWeightText(
  value: string,
  from: WeightUnit,
  to: WeightUnit,
) {
  if (!value.trim() || from === to) return value
  const kilograms = parseWeight(value, from)
  return kilograms === null ? value : displayWeight(kilograms, to)
}
