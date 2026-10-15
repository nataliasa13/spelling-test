import type { AppProgress, PracticeMode, SpellingLang, WeekPack, WordProgress } from '../types'
import { weekContentFingerprint } from './weekContent'
import { normalizeAnswer } from './words'

function bucket(lang: SpellingLang): 'english' | 'spanish' {
  return lang
}

export function getWordProgress(
  progress: AppProgress,
  lang: SpellingLang,
  word: string,
): WordProgress {
  return progress[bucket(lang)][word] ?? { correctStreak: 0, mastered: false }
}

const MAX_COMMON_WRONG = 2

/** Máximo de palabras en una sesión «Repasar errores». */
export const MISTAKE_REVIEW_WORD_CAP = 8

function legacyVariantsFromRecent(
  recentWrong: string[] | undefined,
  lang: SpellingLang,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const raw of recentWrong ?? []) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const key = normalizeAnswer(trimmed, lang)
    if (!key) continue
    out[key] = (out[key] ?? 0) + 1
  }
  return out
}

/** Convierte `recentWrong` antiguo en contadores persistentes (evita perder detalle al acertar). */
export function withMigratedWrongVariants(
  wp: WordProgress,
  lang: SpellingLang,
): WordProgress {
  const recent = wp.recentWrong
  if (!recent?.length) return wp

  const hasVariants = wp.wrongVariants && Object.keys(wp.wrongVariants).length > 0
  if (hasVariants) {
    const { recentWrong: _legacy, ...rest } = wp
    return rest
  }

  const wrongVariants: Record<string, number> = {}
  const wrongVariantForms: Record<string, string> = {}
  for (const raw of recent) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const key = normalizeAnswer(trimmed, lang)
    if (!key) continue
    wrongVariants[key] = (wrongVariants[key] ?? 0) + 1
    wrongVariantForms[key] = trimmed
  }
  if (Object.keys(wrongVariants).length === 0) return wp

  const { recentWrong: _legacy, ...rest } = wp
  return { ...rest, wrongVariants, wrongVariantForms }
}

export function migrateProgressWrongVariants(progress: AppProgress): AppProgress {
  const out = structuredClone(progress)
  for (const word of Object.keys(out.english)) {
    out.english[word] = withMigratedWrongVariants(out.english[word]!, 'english')
  }
  for (const word of Object.keys(out.spanish)) {
    out.spanish[word] = withMigratedWrongVariants(out.spanish[word]!, 'spanish')
  }
  return out
}

function resolvedWrongVariants(wp: WordProgress, lang: SpellingLang): Record<string, number> {
  const migrated = withMigratedWrongVariants(wp, lang)
  const variants = migrated.wrongVariants
  if (variants && Object.keys(variants).length > 0) return variants
  return legacyVariantsFromRecent(migrated.recentWrong, lang)
}

function bumpWrongVariant(
  prev: WordProgress,
  wrongAnswer: string | undefined,
  lang: SpellingLang,
): Pick<WordProgress, 'wrongVariants' | 'wrongVariantForms'> {
  const trimmed = wrongAnswer?.trim() ?? ''
  if (!trimmed) {
    return {
      wrongVariants: prev.wrongVariants,
      wrongVariantForms: prev.wrongVariantForms,
    }
  }
  const key = normalizeAnswer(trimmed, lang)
  if (!key) {
    return {
      wrongVariants: prev.wrongVariants,
      wrongVariantForms: prev.wrongVariantForms,
    }
  }
  const wrongVariants = {
    ...(prev.wrongVariants ?? {}),
    [key]: (prev.wrongVariants?.[key] ?? 0) + 1,
  }
  const wrongVariantForms = {
    ...(prev.wrongVariantForms ?? {}),
    [key]: trimmed,
  }
  return { wrongVariants, wrongVariantForms }
}

export type CommonWrongSpelling = {
  spelling: string
  count: number
}

export function topCommonWrongSpellings(
  wp: WordProgress,
  lang: SpellingLang,
  limit = MAX_COMMON_WRONG,
): CommonWrongSpelling[] {
  const migrated = withMigratedWrongVariants(wp, lang)
  const variants = resolvedWrongVariants(migrated, lang)
  const forms = migrated.wrongVariantForms ?? {}
  const entries = Object.entries(variants)
    .filter(([, count]) => count > 0)
    .sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }),
    )
    .slice(0, limit)

  return entries.map(([key, count]) => ({
    spelling: forms[key] ?? key,
    count,
  }))
}

export function recordAttempt(
  progress: AppProgress,
  lang: SpellingLang,
  word: string,
  correct: boolean,
  mode: PracticeMode,
  wrongAnswer?: string,
): AppProgress {
  const next = structuredClone(progress)
  const key = bucket(lang)
  const prev = withMigratedWrongVariants(
    next[key][word] ?? { correctStreak: 0, mastered: false },
    lang,
  )

  if (correct) {
    const streak = prev.correctStreak + 1
    const mastered =
      mode === 'challenge' ? streak >= 1 : streak >= 2 || prev.mastered
    next[key][word] = {
      correctStreak: streak,
      mastered,
      wrongCount: prev.wrongCount,
      wrongVariants: prev.wrongVariants,
      wrongVariantForms: prev.wrongVariantForms,
    }
  } else {
    const trimmedWrong = wrongAnswer?.trim() ?? ''
    if (!trimmedWrong) return next

    const variantBump = bumpWrongVariant(prev, wrongAnswer, lang)
    next[key][word] = {
      correctStreak: 0,
      mastered: prev.mastered && (mode === 'free' || mode === 'mistakes'),
      wrongCount: (prev.wrongCount ?? 0) + 1,
      ...variantBump,
    }
  }

  return next
}

export type FrequentMistake = {
  word: string
  wrongCount: number
  commonWrong: CommonWrongSpelling[]
  mastered: boolean
}

/** Palabras con más fallos en dictado, para repasar con el niño. */
export function getFrequentMistakes(
  progress: AppProgress,
  lang: SpellingLang,
  words: string[],
  limit = 6,
): FrequentMistake[] {
  const items: FrequentMistake[] = []
  for (const word of words) {
    const wp = getWordProgress(progress, lang, word)
    const wrongCount = wp.wrongCount ?? 0
    if (wrongCount <= 0) continue
    items.push({
      word,
      wrongCount,
      commonWrong: topCommonWrongSpellings(wp, lang),
      mastered: wp.mastered,
    })
  }
  items.sort((a, b) => b.wrongCount - a.wrongCount || a.word.localeCompare(b.word))
  return items.slice(0, limit)
}

export function countWordsWithMistakes(
  progress: AppProgress,
  lang: SpellingLang,
  words: string[],
): number {
  return getFrequentMistakes(progress, lang, words, words.length).length
}

/** Palabra con historial de fallos que aún no está dominada. */
export function isOftenMissedWord(wp: WordProgress): boolean {
  return (wp.wrongCount ?? 0) > 0 && !wp.mastered
}

/** Lista acotada para dictado de repaso (más fallos primero; prioriza no dominadas). */
export function buildMistakeReviewWords(
  progress: AppProgress,
  lang: SpellingLang,
  words: string[],
  limit = MISTAKE_REVIEW_WORD_CAP,
): string[] {
  const candidates: { word: string; wrongCount: number; mastered: boolean }[] = []
  for (const word of words) {
    const wp = getWordProgress(progress, lang, word)
    const wrongCount = wp.wrongCount ?? 0
    if (wrongCount <= 0) continue
    candidates.push({ word, wrongCount, mastered: wp.mastered })
  }
  candidates.sort(
    (a, b) =>
      Number(a.mastered) - Number(b.mastered) ||
      b.wrongCount - a.wrongCount ||
      a.word.localeCompare(b.word),
  )
  return candidates.slice(0, limit).map((c) => c.word)
}

export function countMastered(progress: AppProgress, lang: SpellingLang, words: string[]): number {
  return words.filter((w) => getWordProgress(progress, lang, w).mastered).length
}

export function challengeThreshold(wordCount: number): number {
  if (wordCount <= 0) return 0
  return Math.min(7, Math.max(1, wordCount - 2))
}

export function challengeUnlocked(
  progress: AppProgress,
  lang: SpellingLang,
  words: string[],
): boolean {
  return countMastered(progress, lang, words) >= challengeThreshold(words.length)
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Semana distinta = listas de palabras distintas (el nombre visible puede cambiar sin ser «nueva semana»). */
export function isNewSpellingWeek(previous: WeekPack | null, next: WeekPack): boolean {
  if (!previous) return true
  return weekContentFingerprint(previous) !== weekContentFingerprint(next)
}

export function pruneProgressToWeek(progress: AppProgress, week: WeekPack): AppProgress {
  const out = structuredClone(progress)
  const en = new Set(week.english)
  const es = new Set(week.spanish)
  for (const word of Object.keys(out.english)) {
    if (!en.has(word)) delete out.english[word]
  }
  for (const word of Object.keys(out.spanish)) {
    if (!es.has(word)) delete out.spanish[word]
  }
  return out
}

function clearWordMistakes(wp: WordProgress): WordProgress {
  const {
    wrongCount: _w,
    wrongVariants: _v,
    wrongVariantForms: _f,
    recentWrong: _r,
    ...rest
  } = wp
  return rest
}

export function clearMistakesForWeekWords(progress: AppProgress, week: WeekPack): AppProgress {
  const out = structuredClone(progress)
  for (const word of week.english) {
    const wp = out.english[word]
    if (wp) out.english[word] = clearWordMistakes(wp)
  }
  for (const word of week.spanish) {
    const wp = out.spanish[word]
    if (wp) out.spanish[word] = clearWordMistakes(wp)
  }
  return out
}

export function reconcileProgressForWeek(
  progress: AppProgress,
  week: WeekPack,
  options: { prune: boolean; resetMistakes: boolean },
): AppProgress {
  let next = progress
  if (options.prune) next = pruneProgressToWeek(next, week)
  if (options.resetMistakes) next = clearMistakesForWeekWords(next, week)
  return next
}

export function isMissionCompleteToday(progress: AppProgress): boolean {
  return progress.lastMissionDate === todayKey()
}

export function markMissionComplete(progress: AppProgress): AppProgress {
  const today = todayKey()
  const next = structuredClone(progress)
  if (next.lastMissionDate === today) return next

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yKey = yesterday.toISOString().slice(0, 10)

  next.missionStreak =
    next.lastMissionDate === yKey ? next.missionStreak + 1 : 1
  next.lastMissionDate = today
  return next
}
