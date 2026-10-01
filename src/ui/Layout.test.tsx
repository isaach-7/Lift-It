import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/auth-context.ts'
import { Layout } from './Layout.tsx'

function view(path: string) {
  return render(
    <AuthContext
      value={{
        client: null,
        state: { status: 'ready', session: null },
        passwordRecoveryUserId: null,
        completePasswordRecovery: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="*" element={<p>Page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}

describe('Layout', () => {
  it.each(['/workouts/new', '/workouts/workout-a/edit', '/sessions/session-a'])(
    'marks %s as a focused workout route',
    (path) => {
      const { container } = view(path)
      expect(container.querySelector('.app-shell')).toHaveClass(
        'focused-workout-route',
      )
    },
  )

  it('keeps normal app routes out of focused workout mode', () => {
    const { container } = view('/app')
    expect(container.querySelector('.app-shell')).not.toHaveClass(
      'focused-workout-route',
    )
  })
})
