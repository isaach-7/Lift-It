import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import App from './App.tsx'

describe('App', () => {
  it('renders the LiftIt starting screen', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Build strength. Keep momentum.' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Development environment ready'),
    ).toBeInTheDocument()
  })
})
