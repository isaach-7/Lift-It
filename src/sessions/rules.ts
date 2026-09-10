import type { SetType } from '../workouts/model.ts'
export function nextWeight(
  weight: number,
  reps: number,
  type: SetType,
  lower: number,
  upper: number,
  increment: number,
  available: number[],
  enabled = true,
) {
  if (!enabled || type === 'warmup' || (reps >= lower && reps <= upper))
    return weight
  const weights = [...available].sort((a, b) => a - b)
  if (weights.length)
    return reps > upper
      ? (weights.find((w) => w > weight) ?? weight)
      : (weights.filter((w) => w < weight).at(-1) ?? weight)
  return reps > upper
    ? Math.min(99999.99, weight + increment)
    : Math.max(0, weight - increment)
}
export function encouragement(days: number, goal: number, name: string) {
  if (days >= goal) return 'Weekly goal complete.'
  if (days === 0) return `Ready to train, ${name}? Start one today.`
  const remaining = goal - days
  if (remaining === 1) return 'One workout to go this week.'
  return `Nice work. ${days} this week, ${remaining} to go.`
}
export function weekBounds(now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}
export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
