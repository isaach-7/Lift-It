export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value)
  if (!email) return 'Enter your email address.'
  if (email.length > 254)
    return 'Use an email address of 254 characters or fewer.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return 'Enter a valid email address.'
  return null
}

export function validateNewPassword(value: string): string | null {
  if (value.length < 12) return 'Use at least 12 characters.'
  if (value.length > 1024) return 'Use 1024 characters or fewer.'
  return null
}

export function validateProfile(values: {
  name: string
  goal: string
  height: string
}): string | null {
  const name = values.name.trim()
  if (!name) return 'Enter your preferred name.'
  if (name.length > 60) return 'Use 60 characters or fewer for your name.'

  const goal = Number(values.goal)
  if (!Number.isInteger(goal) || goal < 1 || goal > 7)
    return 'Choose a weekly goal from 1 to 7 days.'

  if (values.height !== '') {
    const height = Number(values.height)
    if (!Number.isFinite(height) || height <= 0 || height >= 1000)
      return 'Enter a height greater than zero and below 1000 cm.'
  }
  return null
}
