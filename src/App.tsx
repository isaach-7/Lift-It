import { lazy } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { AuthGate } from './auth/AuthGate.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { ProfileProvider } from './profile/ProfileProvider.tsx'
import { Layout } from './ui/Layout.tsx'
import { PageMetadata } from './ui/PageMetadata.tsx'
const WorkoutEditor = lazy(() =>
  import('./workouts/WorkoutEditor.tsx').then((m) => ({
    default: m.WorkoutEditor,
  })),
)
const SessionPage = lazy(() =>
  import('./sessions/SessionPage.tsx').then((m) => ({
    default: m.SessionPage,
  })),
)
import { useAuth } from './auth/auth-context.ts'
export function PrivateLayout() {
  const { state } = useAuth()
  const id = state.status === 'ready' ? state.session?.user.id : undefined
  return (
    <ProfileProvider key={id}>
      <Layout />
    </ProfileProvider>
  )
}
export function Root() {
  return (
    <AuthProvider>
      <PageMetadata />
      <AuthGate>
        <Outlet />
      </AuthGate>
    </AuthProvider>
  )
}
export function EditorRoute() {
  const { id } = useParams()
  return <WorkoutEditor key={id ?? 'new'} />
}
export function SessionRoute() {
  const { id } = useParams()
  return <SessionPage key={id} />
}

export const HomePage = lazy(() =>
  import('./pages/HomePage.tsx').then((m) => ({ default: m.HomePage })),
)
export const ProfilePage = lazy(() =>
  import('./profile/ProfilePage.tsx').then((m) => ({ default: m.ProfilePage })),
)
export const WorkoutsPage = lazy(() =>
  import('./workouts/WorkoutsPage.tsx').then((m) => ({
    default: m.WorkoutsPage,
  })),
)
