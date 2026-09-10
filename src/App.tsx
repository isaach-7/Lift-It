import { Route, Routes } from 'react-router-dom'
import { AuthGate } from './auth/AuthGate.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { AuthCallbackPage } from './pages/AuthCallbackPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/"
          element={
            <AuthGate>
              <HomePage />
            </AuthGate>
          }
        />
        <Route
          path="/login"
          element={
            <AuthGate>
              <LoginPage />
            </AuthGate>
          }
        />
        <Route
          path="/auth/callback"
          element={
            <AuthGate>
              <AuthCallbackPage />
            </AuthGate>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
