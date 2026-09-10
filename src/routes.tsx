import { Route, createRoutesFromElements } from 'react-router-dom'
import {
  Root,
  PrivateLayout,
  EditorRoute,
  SessionRoute,
  HomePage,
  ProfilePage,
  WorkoutsPage,
} from './App.tsx'
import { AuthCallbackPage } from './pages/AuthCallbackPage.tsx'

import { LoginPage } from './pages/LoginPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

export const routes = createRoutesFromElements(
  <Route
    element={<Root />}
    errorElement={
      <main className="page-shell">
        <section className="panel">
          <h1>Page unavailable</h1>
          <p role="alert">
            We could not open this page. Check your connection and reload.
          </p>
          <a href={window.location.pathname}>Reload page</a>
        </section>
      </main>
    }
  >
    {['/login', '/register', '/forgot-password', '/update-password'].map(
      (path) => (
        <Route key={path} path={path} element={<LoginPage key={path} />} />
      ),
    )}
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route element={<PrivateLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/onboarding" element={<ProfilePage onboarding />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/workouts" element={<WorkoutsPage />} />
      <Route path="/workouts/new" element={<EditorRoute />} />
      <Route path="/workouts/:id/edit" element={<EditorRoute />} />
      <Route path="/sessions/:id" element={<SessionRoute />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Route>,
)
