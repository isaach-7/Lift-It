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
  if (days >= goal)
    return `Smashed it, ${name}! Don't forget, you've always got room for one more...`
  if (days === 0) return `Your first workout of the week starts here, ${name}.`
  if (goal - days === 1) return "Only one more workout, and you've smashed it!"
  if (2 * days >= goal) return "Halfway there! Don't stop now!"
  return `You've made a start, ${name}. Keep it going!`
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
