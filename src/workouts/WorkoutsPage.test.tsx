import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, it, expect, vi } from 'vitest'
import { WorkoutsPage } from './WorkoutsPage.tsx'
import { listWorkoutSummaries } from './templates.ts'
import { AuthContext } from '../auth/auth-context.ts'
vi.mock('./templates.ts', () => ({ listWorkoutSummaries: vi.fn() }))
function view(path = '/workouts') {
  return render(
    <AuthContext
      value={{
        client: {} as SupabaseClient,
        state: { status: 'ready', session: { user: { id: 'a' } } as Session },
      }}
    >
      <RouterProvider
        router={createMemoryRouter(
          [
            { path: '/workouts', element: <WorkoutsPage /> },
            { path: '/workouts/new', element: <h1>New workout editor</h1> },
          ],
          { initialEntries: [path] },
        )}
      />
    </AuthContext>,
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listWorkoutSummaries).mockResolvedValue([
    { id: 'draft', name: 'Upper', created_at: '2026-09-09', ready: false },
  ])
})
it('offers editing for drafts without a misleading start button', async () => {
  view()
  expect(
    await screen.findByRole('link', { name: 'Add sets to this draft' }),
  ).toHaveAttribute('href', '/workouts/draft/edit')
  expect(
    screen.queryByRole('button', { name: 'Start workout' }),
  ).not.toBeInTheDocument()
})
it('routes the start chooser to creation when no template can start', async () => {
  view('/workouts?start=1')
  expect(
    await screen.findByRole('heading', { name: 'New workout editor' }),
  ).toBeInTheDocument()
})
