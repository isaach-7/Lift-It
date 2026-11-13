import { useEffect, useState } from 'react'

export function WorkoutWalkthrough() {
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return
    const update = () => {
      setReduced(media.matches)
      if (media.matches) setStep(9)
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (paused || reduced) return
    const timer = window.setTimeout(
      () => setStep(step === 9 ? 0 : step + 1),
      step === 9 ? 3200 : step === 0 ? 1000 : 700,
    )
    return () => window.clearTimeout(timer)
  }, [step, paused, reduced])
  const saved = step === 9
  const weight = step < 2 ? '' : step === 2 ? '2' : '20'
  const reps = step < 5 ? '' : step === 5 ? '1' : '11'
  return (
    <section className="walkthrough" aria-label="Workout demonstration">
      <header className="walkthrough-bar">
        <strong>LiftIt</strong>
        {!reduced && (
          <button
            className="demo-pause"
            type="button"
            aria-label={paused ? 'Play animation' : 'Pause animation'}
            onClick={() => setPaused(!paused)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {paused ? (
                <path d="M4 2 14 8 4 14Z" />
              ) : (
                <path d="M3 2h3v12H3zM10 2h3v12h-3z" />
              )}
            </svg>
          </button>
        )}
      </header>
      <div className="walkthrough-body">
        <div className="walkthrough-title">
          <h2>Upper body</h2>
          <span>12:48</span>
        </div>
        <h3>Bench press</h3>
        <p className="muted">3 sets / 6-10 reps / 90s rest</p>
        <div className="demo-columns demo-labels" aria-hidden="true">
          <span>Set</span>
          <span>kg</span>
          <span>Reps</span>
          <span>Done</span>
        </div>
        <div
          className={`demo-columns demo-row ${saved ? 'demo-saved' : ''}`}
          aria-hidden="true"
        >
          <span>1</span>
          <span
            className={`demo-input ${step >= 1 && step <= 3 ? 'demo-focused' : ''}`}
          >
            {weight}
          </span>
          <span
            className={`demo-input ${step >= 4 && step <= 6 ? 'demo-focused' : ''}`}
          >
            {reps}
          </span>
          <span className={`demo-complete ${step === 7 ? 'demo-click' : ''}`}>
            {saved ? 'Saved' : step === 8 ? '...' : ''}
          </span>
          {step < 9 && (
            <svg
              className={`demo-cursor cursor-${step < 4 ? 'weight' : step < 7 ? 'reps' : 'done'}`}
              viewBox="0 0 24 32"
            >
              <path d="M3 2v24l6-6 5 10 5-3-5-9h8Z" />
            </svg>
          )}
        </div>
        <p className="demo-feedback" aria-hidden="true">
          {saved ? 'Next set: 22.5 kg' : step === 8 ? 'Saving set...' : ''}
        </p>
        <div
          className={`demo-columns demo-row demo-next ${saved ? 'demo-progressed' : ''}`}
          aria-hidden="true"
        >
          <span>2</span>
          <span className="demo-input">{saved ? '22.5' : ''}</span>
          <span className="demo-input" />
          <span className="demo-complete" />
        </div>
        <p className="sr-only">
          Example: enter 20 kilograms and 11 reps, complete the set, then
          receive a 22.5 kilogram suggestion because 11 is above the 6-10 rep
          target.
        </p>
      </div>
    </section>
  )
}
