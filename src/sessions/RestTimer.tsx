import { useEffect, useState } from 'react'
export function RestTimer({
  end,
  onSkip,
}: {
  end: number | null
  onSkip: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!end) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [end])
  const seconds = Math.max(0, Math.ceil(((end ?? now) - now) / 1000))
  return (
    <aside className="rest-timer">
      <span>Rest</span>
      <strong aria-label="Rest time remaining">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
      </strong>
      <span>
        {end
          ? seconds
            ? 'Recover for your next set.'
            : 'Ready when you are.'
          : 'Starts after a saved set.'}
      </span>
      {end && (
        <button type="button" className="secondary-button" onClick={onSkip}>
          Skip rest
        </button>
      )}
    </aside>
  )
}
