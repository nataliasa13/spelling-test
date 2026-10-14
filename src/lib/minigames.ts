export type WarmupKind = 'blank' | 'scramble'

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

export type WarmupRound = BlankWarmup | ScrambleWarmup

export type BuildRoundsOptions = {
  scrambleMaxLength?: number
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

function kindForWord(
  word: string,
  index: number,
  scrambleMaxLength: number,
): WarmupKind {
  const preferScramble = index % 3 === 1
  if (preferScramble && word.length <= scrambleMaxLength) return 'scramble'
  return 'blank'
}

export function buildWarmupRounds(
  words: string[],
  options: BuildRoundsOptions = {},
): WarmupRound[] {
  const scrambleMaxLength = options.scrambleMaxLength ?? SCRAMBLE_MAX_WORD_LENGTH
  return words.map((word, i) => {
    const kind = kindForWord(word, i, scrambleMaxLength)
    return kind === 'blank' ? buildBlankRound(word) : buildScrambleRound(word)
  })
}

/** All words in random order as minigame rounds (free play). */
export function buildFreeMinigameRounds(words: string[]): WarmupRound[] {
  return buildWarmupRounds(shuffle([...words]), {
    scrambleMaxLength: SCRAMBLE_MAX_WORD_LENGTH,
  })
}
