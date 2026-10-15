import type { SpellingLang } from '../types'
import { normalizeAnswer } from './words'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sameSpelling(a: string, b: string, lang: SpellingLang): boolean {
  return normalizeAnswer(a, lang) === normalizeAnswer(b, lang)
}

function replaceOnce(word: string, from: string, to: string): string | null {
  const lower = word.toLowerCase()
  const idx = lower.indexOf(from)
  if (idx === -1) return null
  return word.slice(0, idx) + to + word.slice(idx + from.length)
}

function replaceAt(word: string, index: number, char: string): string {
  return word.slice(0, index) + char + word.slice(index + 1)
}

function vowelSwapCandidates(word: string, lang: SpellingLang): string[] {
  const confusions: Record<string, string[]> =
    lang === 'english'
      ? {
          a: ['e', 'o'],
          e: ['a', 'i'],
          i: ['e', 'y'],
          o: ['a', 'u'],
          u: ['o', 'oo'],
          y: ['i', 'e'],
        }
      : {
          a: ['e', 'á'],
          e: ['i', 'é'],
          i: ['e', 'í', 'y'],
          o: ['u', 'ó'],
          u: ['o', 'ú'],
          á: ['a', 'é'],
          é: ['e', 'a'],
          í: ['i', 'e'],
          ó: ['o', 'u'],
          ú: ['u', 'o'],
        }

  const out: string[] = []
  for (let i = 0; i < word.length; i++) {
    const c = word[i]!
    const lower = c.toLowerCase()
    const alts = confusions[lower]
    if (!alts) continue
    for (const alt of alts) {
      const repl = c === c.toUpperCase() ? alt.toUpperCase() : alt
      out.push(replaceAt(word, i, repl))
    }
  }
  return out
}

function englishVariantRules(word: string): string[] {
  const out: string[] = []
  const push = (v: string | null) => {
    if (v) out.push(v)
  }

  push(replaceOnce(word, 'ie', 'ei'))
  push(replaceOnce(word, 'ei', 'ie'))
  push(replaceOnce(word, 'ph', 'f'))
  push(replaceOnce(word, 'tion', 'sion'))
  push(replaceOnce(word, 'tion', 'shun'))
  push(replaceOnce(word, 'sion', 'tion'))
  push(replaceOnce(word, 'ck', 'k'))
  if (word.endsWith('k') && word.length > 2) push(word.slice(0, -1) + 'ck')
  if (word.endsWith('e') && word.length > 3) push(word.slice(0, -1))
  if (!word.endsWith('e') && word.length > 2) push(word + 'e')
  if (word.endsWith('y') && word.length > 2) push(word.slice(0, -1) + 'ie')
  if (word.endsWith('ie') && word.length > 3) push(word.slice(0, -2) + 'y')
  push(replaceOnce(word, 'ou', 'ow'))
  push(replaceOnce(word, 'ow', 'ou'))
  push(replaceOnce(word, 'ce', 'se'))
  push(replaceOnce(word, 'ci', 'si'))
  push(replaceOnce(word, 'ge', 'je'))
  push(replaceOnce(word, 'gi', 'ji'))

  const double = word.match(/([b-df-hj-np-tv-z])\1/i)
  if (double?.[1]) {
    const letter = double[1]
    const idx = word.toLowerCase().indexOf(letter + letter)
    if (idx !== -1) push(word.slice(0, idx) + word[idx] + word.slice(idx + 2))
  }

  for (let i = 1; i < word.length - 1; i++) {
    const c = word[i]!
    if (/[aeiou]/i.test(c)) continue
    if (word[i - 1]?.toLowerCase() === c.toLowerCase()) continue
    push(word.slice(0, i) + c + word.slice(i))
    break
  }

  for (let i = 0; i < word.length - 1; i++) {
    push(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2))
  }

  if (word.length > 2) {
    for (let i = 1; i < word.length - 1; i++) {
      push(word.slice(0, i) + word.slice(i + 1))
    }
  }

  out.push(...vowelSwapCandidates(word, 'english'))
  return out
}

function stripSpanishAccents(word: string): string {
  return word.normalize('NFD').replace(/\p{M}/gu, '')
}

function spanishVariantRules(word: string): string[] {
  const out: string[] = []
  const push = (v: string | null) => {
    if (v) out.push(v)
  }

  const stripped = stripSpanishAccents(word)
  if (stripped !== word) push(stripped)

  if (/^[aeiouáéíóú]/i.test(word)) push('h' + word)
  if (/^h[aeiouáéíóú]/i.test(word)) push(word.slice(1))

  push(replaceOnce(word, 'll', 'y'))
  push(replaceOnce(word, 'y', 'll'))
  push(replaceOnce(word, 'qu', 'cu'))
  push(replaceOnce(word, 'gue', 'ge'))
  push(replaceOnce(word, 'gui', 'gi'))
  push(replaceOnce(word, 'ce', 'se'))
  push(replaceOnce(word, 'ci', 'si'))
  push(replaceOnce(word, 'z', 'c'))

  for (let i = 0; i < word.length; i++) {
    const c = word[i]!.toLowerCase()
    if (c === 'b') {
      push(replaceAt(word, i, word[i] === 'B' ? 'V' : 'v'))
      break
    }
    if (c === 'v') {
      push(replaceAt(word, i, word[i] === 'V' ? 'B' : 'b'))
      break
    }
  }

  const rr = word.toLowerCase().indexOf('rr')
  if (rr !== -1) push(word.slice(0, rr) + word.slice(rr + 1))
  for (let i = 1; i < word.length - 1; i++) {
    if (/[aeiouáéíóú]/i.test(word[i]!)) continue
    if (word[i]?.toLowerCase() === 'r' && word[i + 1]?.toLowerCase() !== 'r') {
      push(word.slice(0, i) + word[i] + word.slice(i))
      break
    }
  }

  for (let i = 0; i < word.length - 1; i++) {
    push(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2))
  }

  if (word.length > 2) {
    for (let i = 1; i < word.length - 1; i++) {
      push(word.slice(0, i) + word.slice(i + 1))
    }
  }

  out.push(...vowelSwapCandidates(word, 'spanish'))
  return out
}

/**
 * Distractores de deletreo plausibles (misma palabra, forma incorrecta).
 * Prioriza reglas fonéticas habituales; mezcla el orden en cada partida.
 */
export function generateSpellingVariants(
  word: string,
  lang: SpellingLang,
  need: number,
): string[] {
  if (need <= 0 || !word.trim()) return []

  const raw =
    lang === 'english' ? englishVariantRules(word) : spanishVariantRules(word)
  const seen: string[] = []
  const accept = (candidate: string) => {
    const trimmed = candidate.trim()
    if (!trimmed || sameSpelling(trimmed, word, lang)) return false
    if (seen.some((x) => sameSpelling(x, trimmed, lang))) return false
    seen.push(trimmed)
    return true
  }

  for (const c of shuffle(raw)) {
    if (seen.length >= need) break
    accept(c)
  }
  for (const c of raw) {
    if (seen.length >= need) break
    accept(c)
  }

  return shuffle(seen).slice(0, need)
}
