import type { WeightUnit } from '../units/weight.ts'

export function UnitToggle({
  value,
  onChange,
  label = 'Weight unit',
}: {
  value: WeightUnit
  onChange: (unit: WeightUnit) => void
  label?: string
}) {
  return (
    <fieldset className="unit-toggle">
      <legend className="sr-only">{label}</legend>
      {(['kg', 'lb'] as const).map((unit) => (
        <button
          key={unit}
          type="button"
          className={value === unit ? 'active' : ''}
          aria-pressed={value === unit}
          onClick={() => onChange(unit)}
        >
          {unit}
        </button>
      ))}
    </fieldset>
  )
}
