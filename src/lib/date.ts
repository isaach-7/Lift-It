const mediumDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })

export function formatDate(value: Date | string) {
  return mediumDate
    .format(typeof value === 'string' ? new Date(value) : value)
    .replace('Sept', 'Sep')
}
