export const MAX_CHILD_NAME_LEN = 40

export function normalizeChildName(raw: string): string {
  return raw.trim().slice(0, MAX_CHILD_NAME_LEN)
}

export function isValidChildName(raw: string): boolean {
  return normalizeChildName(raw).length > 0
}
