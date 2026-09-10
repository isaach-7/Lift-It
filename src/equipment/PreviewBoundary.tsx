import { MachinePoster } from './MachinePoster.tsx'
import { Component } from 'react'
import type { ReactNode } from 'react'
export class PreviewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <MachinePoster message="Interactive preview unavailable. Workout settings still work." />
    ) : (
      this.props.children
    )
  }
}
