import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
export function useUnsavedChanges(dirty: boolean, message: string) {
  const blocker = useBlocker(dirty)
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm(message)) blocker.proceed()
      else blocker.reset()
    }
  }, [blocker, message])
  useEffect(() => {
    if (!dirty) return
    const unload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', unload)
    return () => window.removeEventListener('beforeunload', unload)
  }, [dirty])
}
