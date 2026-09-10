import { useEffect, useState } from 'react'

function elapsedLabel(startedAt: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
  )
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`
}

export function SessionElapsed({ startedAt }: { startedAt: string }) {
  const [label, setLabel] = useState(() => elapsedLabel(startedAt))
  useEffect(() => {
    const update = () => setLabel(elapsedLabel(startedAt))
    const timer = window.setInterval(update, 1000)
    window.addEventListener('focus', update)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', update)
    }
  }, [startedAt])
  return <strong className="session-elapsed">{label}</strong>
}
