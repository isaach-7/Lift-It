import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { TemplateNameForm } from './TemplateNameForm.tsx'
import {
  listWorkoutTemplates,
  saveWorkoutTemplate,
  sortTemplates,
} from './templates.ts'
import type { WorkoutTemplate } from './templates.ts'

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; templates: WorkoutTemplate[] }

export function WorkoutTemplates({
  client,
  userId,
}: {
  client: SupabaseClient
  userId: string
}) {
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [draftId, setDraftId] = useState(() => crypto.randomUUID())
  const [editing, setEditing] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    listWorkoutTemplates(client, userId).then(
      (templates) => {
        if (active) setList({ status: 'ready', templates })
      },
      () => {
        if (active) setList({ status: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [client, userId, attempt])

  function mergeSaved(template: WorkoutTemplate) {
    setList((current) =>
      current.status === 'ready'
        ? {
            status: 'ready',
            templates: sortTemplates([
              ...current.templates.filter((item) => item.id !== template.id),
              template,
            ]),
          }
        : current,
    )
  }

  return (
    <section className="workouts" aria-labelledby="workouts-title">
      <div className="section-heading">
        <h2 id="workouts-title">Your workouts</h2>
        <p>Create a reusable workout. Exercise selection is coming next.</p>
      </div>
      {list.status === 'loading' && (
        <div className="workouts-loading" role="status">
          <p>Loading your workouts...</p>
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      )}
      {list.status === 'error' && (
        <div className="workouts-loading">
          <p role="alert" className="error">
            We could not load your workouts. Check your connection and try
            again.
          </p>
          <button
            onClick={() => {
              setList({ status: 'loading' })
              setAttempt((value) => value + 1)
            }}
          >
            Retry loading
          </button>
        </div>
      )}
      {list.status === 'ready' && (
        <>
          <div className="new-workout">
            <h3>New workout</h3>
            <TemplateNameForm
              key={draftId}
              inputId="new-workout-name"
              onSave={(name) =>
                saveWorkoutTemplate(client, userId, draftId, name, true)
              }
              onSaved={(template) => {
                mergeSaved(template)
                setDraftId(crypto.randomUUID())
                setNotice(`Created ${template.name}.`)
              }}
            />
          </div>
          <p className="workout-notice" role="status">
            {notice}
          </p>
          {list.templates.length === 0 ? (
            <div className="empty-workouts">
              <h3>No workouts yet</h3>
              <p>
                Give your first workout a name, such as Push day or Full body.
              </p>
            </div>
          ) : (
            <ul className="workout-list">
              {list.templates.map((template) => (
                <li key={template.id} className="workout-card">
                  <h3>{template.name}</h3>
                  {editing === template.id ? (
                    <TemplateNameForm
                      inputId={`rename-${template.id}`}
                      initialName={template.name}
                      onSave={(name) =>
                        saveWorkoutTemplate(
                          client,
                          userId,
                          template.id,
                          name,
                          false,
                        )
                      }
                      onSaved={(saved) => {
                        mergeSaved(saved)
                        setEditing(null)
                        setNotice(`Renamed workout to ${saved.name}.`)
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <button
                      className="secondary-button"
                      disabled={editing !== null}
                      aria-label={`Rename ${template.name}`}
                      onClick={() => {
                        setNotice('')
                        setEditing(template.id)
                      }}
                    >
                      Rename
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
