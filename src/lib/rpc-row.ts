// PostgREST returns composite SQL values as row arrays by default.
export function rpcRow<T extends { id: string }>(value: unknown): T {
  const row = Array.isArray(value)
    ? value.length === 1
      ? value[0]
      : null
    : value
  if (
    !row ||
    typeof row !== 'object' ||
    !('id' in row) ||
    typeof row.id !== 'string'
  ) {
    throw new Error('The server did not return one confirmed row')
  }
  return row as T
}
