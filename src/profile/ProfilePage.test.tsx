import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { ProfilePage } from './ProfilePage.tsx'
import { ProfileContext } from './profile-context.ts'
import { AuthContext } from '../auth/auth-context.ts'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
const rpc = vi.fn()
const setSession = vi.fn()
const setProfile = vi.fn()
const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
} as Session
function renderProfile() {
  return render(
    <AuthContext
      value={{
        client: { rpc, auth: { setSession } } as unknown as SupabaseClient,
        state: { status: 'ready', session },
      }}
    >
      <ProfileContext
        value={{
          profile: {
            id: 'a',
            preferred_name: null,
            height_cm: null,
            weekly_goal: null,
            preferred_weight_unit: 'kg',
            onboarding_completed_at: null,
          },
          setProfile,
        }}
      >
        <ProfilePage onboarding />
      </ProfileContext>
    </AuthContext>,
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  setSession.mockResolvedValue({ data: { session }, error: null })
})
describe('onboarding', () => {
  it('allows skipped measurements and submits one atomic request', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: 'a',
          preferred_name: 'Alex',
          weekly_goal: 4,
          height_cm: null,
          preferred_weight_unit: 'kg',
          onboarding_completed_at: '2026-09-09',
        },
      ],
      error: null,
    })
    const user = userEvent.setup()
    renderProfile()
    await user.type(screen.getByLabelText('Preferred name'), 'Alex')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    await waitFor(() => expect(setProfile).toHaveBeenCalled())
    expect(rpc).toHaveBeenCalledWith(
      'save_profile',
      expect.objectContaining({
        p_name: 'Alex',
        p_goal: 4,
        p_height: null,
        p_weight: null,
      }),
    )
  })
  it('preserves measurements and the retry ID after failure', async () => {
    rpc.mockResolvedValue({ error: new Error('offline') })
    const user = userEvent.setup()
    renderProfile()
    await user.type(screen.getByLabelText('Preferred name'), 'Alex')
    await user.type(screen.getByLabelText('Body weight (kg, optional)'), '80')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'entries are still here',
    )
    expect(setProfile).not.toHaveBeenCalled()
    const first = rpc.mock.calls[0]?.[1]
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    expect(rpc.mock.calls[1]?.[1]).toEqual(first)
    expect(screen.getByLabelText('Body weight (kg, optional)')).toHaveValue(80)
  })
  it('restores the current session and retries an unauthorized save once', async () => {
    const savedProfile = {
      id: 'a',
      preferred_name: 'Alex',
      weekly_goal: 4,
      height_cm: null,
      preferred_weight_unit: 'kg',
      onboarding_completed_at: '2026-09-10',
    }
    rpc
      .mockResolvedValueOnce({
        data: null,
        error: new Error('unauthorized'),
        status: 401,
      })
      .mockResolvedValueOnce({ data: [savedProfile], error: null, status: 200 })
    const user = userEvent.setup()
    renderProfile()
    await user.type(screen.getByLabelText('Preferred name'), 'Alex')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    await waitFor(() => expect(setProfile).toHaveBeenCalledWith(savedProfile))
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    })
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[1]).toEqual(rpc.mock.calls[0])
  })
})
