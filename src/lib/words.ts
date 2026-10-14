export function parseWordList(raw: string): string[] {
  const lines = raw.split(/\r?\n/)
  const words: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.includes(',')) {
      words.push(
        ...trimmed
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean),
      )
      continue
    }

    const withoutNumber = trimmed.replace(/^\d+[\).\-\s]+/, '').trim()
    if (withoutNumber) words.push(withoutNumber.trim())
  }

  return words
}

export function normalizeAnswer(value: string, lang: 'english' | 'spanish'): string {
  const trimmed = value.trim()
  if (lang === 'english') return trimmed.toLowerCase()
  return trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function answersMatch(
  typed: string,
  expected: string,
  lang: 'english' | 'spanish',
): boolean {
  if (lang === 'english') {
    return normalizeAnswer(typed, lang) === normalizeAnswer(expected, lang)
  }
  const nTyped = normalizeAnswer(typed, lang)
  const nExpected = normalizeAnswer(expected, lang)
  if (nTyped === nExpected) return true
  return typed.trim().toLowerCase() === expected.trim().toLowerCase()
}
