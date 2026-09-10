import { useState } from 'react'
import type { FormEvent } from 'react'
import type { WorkoutTemplate } from './templates.ts'
import { validateTemplateName } from './templates.ts'

type Props = {
  initialName?: string
  inputId: string
  onSave: (name: string) => Promise<WorkoutTemplate>
  onSaved: (template: WorkoutTemplate) => void
  onCancel?: () => void
}

export function TemplateNameForm({
  initialName = '',
  inputId,
  onSave,
  onSaved,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const validation = validateTemplateName(name)
    if (validation) {
      setError(validation)
      return
    }
    setError('')
    setSaving(true)
    try {
      const template = await onSave(name)
      onSaved(template)
    } catch {
      setError(
        'We could not confirm the save. Your name is still here. Check your connection and try saving again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="template-form" onSubmit={submit} aria-busy={saving}>
      <label htmlFor={inputId}>Workout name</label>
      <input
        id={inputId}
        required
        maxLength={120}
        value={name}
        disabled={saving}
        aria-describedby={`${inputId}-feedback`}
        aria-invalid={!!error}
        onChange={(event) => {
          setName(event.target.value)
          setError('')
        }}
      />
      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : onCancel ? 'Save name' : 'Create workout'}
        </button>
        {onCancel && (
          <button
            type="button"
            className="secondary-button"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
      <div id={`${inputId}-feedback`} className="save-feedback">
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : (
          <p role="status">{saving ? 'Saving your workout...' : ''}</p>
        )}
      </div>
    </form>
  )
}
