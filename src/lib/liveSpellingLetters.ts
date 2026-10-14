import { normalizeAnswer } from './words'
import type { SpellingLang } from '../types'

export type LiveLetterStatus = 'ok' | 'bad'

export type LiveLetter = {
  char: string
  status: LiveLetterStatus
}

/** Colores letra a letra mientras escribe (comparación igual que al comprobar). */
export function buildLiveLetters(
  typed: string,
  expected: string,
  lang: SpellingLang,
): LiveLetter[] {
  if (!typed) return []

  const nExpected = normalizeAnswer(expected, lang)
  const nTyped = normalizeAnswer(typed, lang)

  return [...typed].map((char, i) => ({
    char,
    status:
      i < nExpected.length && i < nTyped.length && nTyped[i] === nExpected[i] ? 'ok' : 'bad',
  }))
}
