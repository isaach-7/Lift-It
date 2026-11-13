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
    if (paused || reduced || step === 9) return
    const timer = window.setTimeout(
      () => setStep(step + 1),
      step === 0 ? 1000 : 700,
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
        <span>Example workout</span>
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
          {saved
            ? 'Set saved / Next weight: 22.5 kg'
            : step === 8
              ? 'Saving set...'
              : step >= 4
                ? 'Enter reps, then complete the set'
                : 'Enter the weight you lifted'}
        </p>
        <div className="demo-columns demo-row demo-next" aria-hidden="true">
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
      <footer className="walkthrough-controls">
        <span>Workout walkthrough</span>
        {!reduced && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              if (saved) {
                setStep(0)
                setPaused(false)
              } else setPaused(!paused)
            }}
          >
            {saved ? 'Replay demo' : paused ? 'Play demo' : 'Pause demo'}
          </button>
        )}
      </footer>
    </section>
  )
}
