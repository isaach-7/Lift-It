import { createContext, useContext } from 'react'
import type { Profile } from './profile.ts'
export const ProfileContext = createContext<{
  profile: Profile
  setProfile: (profile: Profile) => void
} | null>(null)
export function useProfile() {
  const value = useContext(ProfileContext)
  if (!value) throw new Error('Profile required')
  return value
}
