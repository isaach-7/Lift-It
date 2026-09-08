import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="welcome-card" aria-labelledby="not-found-title">
        <p className="eyebrow">404</p>
        <h1 id="not-found-title">Page not found</h1>
        <p className="intro">The page you requested does not exist.</p>
        <Link className="text-link" to="/">
          Return home
        </Link>
      </section>
    </main>
  )
}
