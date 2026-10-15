import type { SpellingLang } from '../types'
import { generateSpellingVariants } from './spellingVariants'
import { normalizeAnswer } from './words'

export type WarmupKind = 'blank' | 'scramble' | 'match'

export const MATCH_OPTION_COUNT = 3

/** Ordenar letras solo en palabras de esta longitud o menos (Y2). */
export const SCRAMBLE_MAX_WORD_LENGTH = 5

export type BlankWarmup = {
  kind: 'blank'
  word: string
  hiddenIndex: number
  display: string
  options: string[]
}

export type ScrambleWarmup = {
  kind: 'scramble'
  word: string
  tiles: { id: number; char: string }[]
}

export type MatchWarmup = {
  kind: 'match'
  word: string
  options: string[]
}

export type WarmupRound = BlankWarmup | ScrambleWarmup | MatchWarmup

export type BuildRoundsOptions = {
  scrambleMaxLength?: number
  lang?: SpellingLang
  /** Fallos previos en dictado por palabra (texto tal como lo escribió el niño). */
  priorWrongForWord?: (word: string) => string[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickHiddenIndex(word: string): number {
  if (word.length <= 1) return 0
  if (word.length === 2) return 1
  const inner = word.length - 2
  return 1 + Math.floor(Math.random() * inner)
}

/** Tres opciones en total: la correcta y dos distractoras. */
function blankOptions(word: string, hiddenIndex: number): string[] {
  const correct = word[hiddenIndex]
  const wrong = new Set<string>()
  const fromWord = [...word].filter((c, i) => i !== hiddenIndex && c !== correct)
  for (const c of shuffle(fromWord)) {
    if (wrong.size >= 2) break
    wrong.add(c)
  }
  const extras = 'aeioubcdfghjklmnpqrstvwxyzñáéíóú'
  while (wrong.size < 2) {
    const c = extras[Math.floor(Math.random() * extras.length)]
    if (c !== correct.toLowerCase() && c !== correct) wrong.add(c)
  }
  return shuffle([correct, ...wrong])
}

export function buildBlankRound(word: string): BlankWarmup {
  const hiddenIndex = pickHiddenIndex(word)
  const display = [...word]
    .map((c, i) => (i === hiddenIndex ? '_' : c))
    .join('')
  return {
    kind: 'blank',
    word,
    hiddenIndex,
    display,
    options: blankOptions(word, hiddenIndex),
  }
}

export function buildScrambleRound(word: string): ScrambleWarmup {
  const tiles = shuffle(
    [...word].map((char, id) => ({ id, char })),
  )
  return { kind: 'scramble', word, tiles }
}

function sameSpelling(a: string, b: string, lang: SpellingLang): boolean {
  return normalizeAnswer(a, lang) === normalizeAnswer(b, lang)
}

function matchWordOptions(
  word: string,
  lang: SpellingLang,
  priorWrong: string[] = [],
  count = MATCH_OPTION_COUNT,
): string[] {
  const distractors: string[] = []
  for (const raw of priorWrong) {
    if (distractors.length >= count - 1) break
    const trimmed = raw.trim()
    if (!trimmed || sameSpelling(trimmed, word, lang)) continue
    if (distractors.some((d) => sameSpelling(d, trimmed, lang))) continue
    distractors.push(trimmed)
  }
  const generated = generateSpellingVariants(
    word,
    lang,
    count - 1 - distractors.length,
  )
  for (const g of generated) {
    if (distractors.length >= count - 1) break
    distractors.push(g)
  }
  return shuffle([word, ...distractors])
}

export function buildMatchRound(
  word: string,
  lang: SpellingLang,
  priorWrong: string[] = [],
): MatchWarmup {
  return {
    kind: 'match',
    word,
    options: matchWordOptions(word, lang, priorWrong),
  }
}

function kindForWord(
  word: string,
  index: number,
  scrambleMaxLength: number,
): WarmupKind {
  const slot = index % 3
  if (slot === 1 && word.length <= scrambleMaxLength) return 'scramble'
  if (slot === 2) return 'match'
  return 'blank'
}

export const MISSION_WARMUP_WORD_COUNT = 5

/** Palabras para calentamiento de misión: prioriza no dominadas; rellena hasta `count`. */
export function pickMissionWarmupWords(
  words: string[],
  isMastered: (word: string) => boolean,
  count = MISSION_WARMUP_WORD_COUNT,
): string[] {
  if (words.length === 0 || count <= 0) return []
  const cap = Math.min(count, words.length)
  const unmastered = shuffle(words.filter((w) => !isMastered(w)))
  const mastered = shuffle(words.filter((w) => isMastered(w)))
  const picked: string[] = []
  for (const w of unmastered) {
    if (picked.length >= cap) break
    picked.push(w)
  }
  for (const w of mastered) {
    if (picked.length >= cap) break
    if (!picked.includes(w)) picked.push(w)
  }
  return picked
}

export function buildWarmupRounds(
  words: string[],
  options: BuildRoundsOptions = {},
): WarmupRound[] {
  const scrambleMaxLength = options.scrambleMaxLength ?? SCRAMBLE_MAX_WORD_LENGTH
  const lang = options.lang ?? 'english'
  return words.map((word, i) => {
    const kind = kindForWord(word, i, scrambleMaxLength)
    if (kind === 'scramble') return buildScrambleRound(word)
    if (kind === 'match') {
      const prior = options.priorWrongForWord?.(word) ?? []
      return buildMatchRound(word, lang, prior)
    }
    return buildBlankRound(word)
  })
}

export type MinigamePlayMode = 'mix' | 'blank' | 'scramble' | 'match'

export function wordsEligibleForScramble(
  words: string[],
  maxLength = SCRAMBLE_MAX_WORD_LENGTH,
): string[] {
  return words.filter((w) => w.length <= maxLength)
}

/** Todas las palabras (mezcladas) según el tipo de minijuego elegido. */
export function buildFreeMinigameRounds(
  words: string[],
  playMode: MinigamePlayMode = 'mix',
  options: BuildRoundsOptions = {},
): WarmupRound[] {
  if (words.length === 0) return []
  const lang = options.lang ?? 'english'
  if (playMode === 'blank') {
    return shuffle([...words]).map((word) => buildBlankRound(word))
  }
  if (playMode === 'scramble') {
    return shuffle([...words]).map((word) => buildScrambleRound(word))
  }
  if (playMode === 'match') {
    return shuffle([...words]).map((word) =>
      buildMatchRound(word, lang, options.priorWrongForWord?.(word) ?? []),
    )
  }
  return buildWarmupRounds(shuffle([...words]), {
    scrambleMaxLength: SCRAMBLE_MAX_WORD_LENGTH,
    ...options,
  })
}
