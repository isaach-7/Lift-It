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
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="eyebrow">Simple workout tracking</p>
            <h1>Train with intent. Track the work. See the progress.</h1>
            <p className="intro">
              Build routines, log each set while you train, and follow clear
              weight suggestions based on the rep range you choose.
            </p>
            <div className="landing-actions">
              <Link className="button-link" to="/register">
                Create account
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
          <div className="landing-image">
            <img
              src="/auth-strength-training.webp"
              width="1122"
              height="1402"
              alt="Athlete loading a weight plate onto a barbell in a gym"
            />
          </div>
        </section>
        <section className="landing-features" aria-labelledby="features-title">
          <div className="section-heading">
            <p className="eyebrow">What LiftIt does</p>
            <h2 id="features-title">The workout, without the noise.</h2>
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
              <h3>See what comes next</h3>
              <p>
                LiftIt uses your rep range and equipment settings to make a
                simple, explainable next-weight suggestion.
              </p>
            </article>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <Brand />
        <p>A focused workout tracker for a UK-first public beta.</p>
        <nav aria-label="Legal and support">
          <Link to="/privacy">Privacy</Link>
          <a href="mailto:support@lift-it.site">support@lift-it.site</a>
        </nav>
      </footer>
    </div>
  )
}
