export function HomePage() {
  return (
    <main className="page-shell">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <p className="eyebrow">LiftIt</p>
        <h1 id="welcome-title">Build strength. Keep momentum.</h1>
        <p className="intro">
          A reliable workout tracker with simple, explainable weight
          progression.
        </p>
        <p className="status" role="status">
          <span className="status-dot" aria-hidden="true" />
          Development environment ready
        </p>
      </section>
    </main>
  )
}
