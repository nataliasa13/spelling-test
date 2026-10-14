import { createHash } from 'node:crypto'

/** Debe coincidir con src/lib/spanishTtsKey.ts */
export function spanishTtsFileKey(word) {
  const n = String(word ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFC')
  if (!n) return ''

  const safe = n
    .replace(/[^a-záéíóúüñ0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')

  if (safe.length > 0 && safe.length <= 80) return safe
  return createHash('sha256').update(n).digest('hex').slice(0, 16)
}
