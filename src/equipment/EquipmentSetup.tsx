import { MachinePoster } from './MachinePoster.tsx'
import { PreviewBoundary } from './PreviewBoundary.tsx'
import { lazy, Suspense, useState } from 'react'
import type { Exercise } from '../exercises/exercise-library.ts'
import type { ExercisePlan } from '../workouts/model.ts'
import { equipmentReferences, machineType } from './presets.ts'
const MachinePreview = lazy(() => import('./MachinePreview.tsx'))
export function EquipmentSetup({
  exercise,
  plan,
  onChange,
}: {
  exercise: Exercise
  plan: ExercisePlan
  onChange: (patch: Partial<ExercisePlan>) => void
}) {
  const [list, setList] = useState(plan.available_weights.join(', '))
  const [reference, setReference] = useState('')
  const [firstWeight, setFirstWeight] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [preview, setPreview] = useState(false)
  const preset = equipmentReferences.find((p) => p.id === reference)
  const type = machineType(exercise.name)
  return (
    <div className="equipment-setup">
      <label>
        Equipment name
        <input
          required
          maxLength={120}
          value={plan.equipment_label}
          onChange={(e) => onChange({ equipment_label: e.target.value })}
        />
      </label>
      <small>
        Use a name such as "Gym A chest press" to keep different machines
        separate.
      </small>
      {type === 'chest' && (
        <>
          <label>
            Manufacturer reference
            <select
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            >
              <option value="">Custom equipment</option>
              {equipmentReferences.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.manufacturer} {p.model}
                </option>
              ))}
            </select>
          </label>
          {preset && (
            <div className="panel">
              <strong>
                {preset.manufacturer} {preset.model}: {preset.variant}
              </strong>
              <p>{preset.note}</p>
              {preset.increment !== null && (
                <>
                  <label>
                    First main plate label on your machine (kg)
                    <input
                      type="number"
                      min="0.01"
                      max="108"
                      step="0.01"
                      value={firstWeight}
                      onChange={(e) => {
                        setFirstWeight(e.target.value)
                        setConfirmed(false)
                      }}
                    />
                  </label>
                  <p>
                    Main-plate preset: start at your confirmed first label,
                    increase by 4.5 kg, and stop at 108 kg. Add-on selectors are
                    excluded; use a custom list to include them.
                  </p>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    These main-plate labels match my installed machine.
                  </label>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      !confirmed ||
                      !Number.isFinite(Number(firstWeight)) ||
                      Number(firstWeight) <= 0 ||
                      Number(firstWeight) > 108
                    }
                    onClick={() => {
                      const weights: number[] = []
                      for (
                        let value = Number(firstWeight);
                        value <= 108;
                        value += 4.5
                      )
                        weights.push(Math.round(value * 100) / 100)
                      onChange({
                        equipment_label:
                          'Matrix Ultra G7-S13-AS2007 / 108 kg / main plates',
                        increment_amount: 4.5,
                        available_weights: weights,
                      })
                      setList(weights.join(', '))
                      setReference('')
                    }}
                  >
                    Apply confirmed main-plate preset
                  </button>
                </>
              )}
              <a href={preset.source} target="_blank" rel="noreferrer">
                Manufacturer specifications
              </a>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  onChange({
                    equipment_label: `${preset.manufacturer} ${preset.model} / ${preset.variant}`,
                  })
                  setReference('')
                }}
              >
                Use this name; I will confirm the stack labels
              </button>
            </div>
          )}
        </>
      )}
      <label>
        Regular increment (kg)
        <input
          type="number"
          required
          min="0.01"
          max="99999"
          step="0.01"
          value={plan.increment_amount}
          onChange={(e) =>
            onChange({ increment_amount: Number(e.target.value) })
          }
        />
      </label>
      <label>
        Available weights (optional, kg)
        <input
          value={list}
          placeholder="e.g. 5, 7.5, 10, 12.5"
          onChange={(e) => {
            setList(e.target.value)
            onChange({
              available_weights: e.target.value.trim()
                ? e.target.value
                    .split(',')
                    .map((w) => (w.trim() === '' ? NaN : Number(w)))
                : [],
            })
          }}
        />
      </label>
      <small>
        A list takes priority over the regular increment and sets the equipment
        limits. Check the labels on your machine; custom values are always
        supported.
      </small>
      {type && (
        <>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setPreview(!preview)}
          >
            {preview ? 'Close 3D preview' : 'View generic machine in 3D'}
          </button>
          {preview ? (
            <PreviewBoundary>
              <Suspense fallback={<MachinePoster />}>
                <MachinePreview type={type} />
              </Suspense>
            </PreviewBoundary>
          ) : null}
        </>
      )}
    </div>
  )
}
