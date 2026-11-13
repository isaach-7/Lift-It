import { WorkoutWalkthrough } from './WorkoutWalkthrough.tsx'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/auth-context.ts'
import { Brand } from '../ui/Brand.tsx'

export function LandingPage() {
  const { state } = useAuth()
  const signedIn = state.status === 'ready' && state.session

  return (
    <div className="public-shell">
      <header className="public-header">
        <Brand />
        <nav aria-label="Account navigation">
          {signedIn ? (
            <Link className="button-link" to="/app">
              Open app
            </Link>
          ) : (
            <>
              <Link className="public-sign-in" to="/login">
                Sign in
              </Link>
              <Link className="button-link" to="/register">
                Start training
              </Link>
            </>
          )}
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <h1>Your next weight. Worked out.</h1>
            <p className="intro">
              Log your reps. LiftIt suggests the next weight automatically,
              using your rep range and the equipment you train with.
            </p>
            <div className="landing-actions">
              <Link className="button-link" to="/register">
                Start training
              </Link>
              <Link className="button-link secondary-button" to="/login">
                Sign in
              </Link>
            </div>
            <p className="landing-note">
              Open registration for people aged 16 and over. Height and body
              weight are optional.
            </p>
          </div>
          <div className="landing-visual">
            <div className="landing-image">
              <img
                src="/auth-strength-training.webp"
                width="1122"
                height="1402"
                alt="Athlete loading a weight plate onto a barbell in a gym"
              />
            </div>
            <WorkoutWalkthrough />
          </div>
        </section>
        <section className="landing-features" aria-labelledby="features-title">
          <div className="section-heading">
            <h2 id="features-title">Progression built into every set.</h2>
          </div>
          <div className="feature-grid">
            <article>
              <span>01</span>
              <h3>Build your routine</h3>
              <p>
                Choose exercises, order your session, and set reps, rest times
                and the weights available to you.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>Log while you lift</h3>
              <p>
                Record completed sets as you go. An active workout can be
                refreshed and resumed without losing confirmed work.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Automatic weight progression</h3>
              <p>
                Set a 6-10 rep range and a 2.5 kg increment. Log 11 reps at 20
                kg and LiftIt suggests 22.5 kg next; log 8 and it stays at 20
                kg.
              </p>
            </article>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <Brand />
        <nav aria-label="Legal and support">
          <Link to="/privacy">Privacy</Link>
          <a href="mailto:support@lift-it.site">support@lift-it.site</a>
        </nav>
      </footer>
    </div>
  )
}
