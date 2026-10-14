import { isValidChildName, normalizeChildName } from './childName'
import { migrateProgressWrongVariants } from './progress'
import type { AppProgress, SpellingLang, WeekPack } from '../types'

const KEYS = {
  week: 'spellings_week',
  progress: 'spellings_progress',
  uiLang: 'spellings_ui_lang',
  practiceLang: 'spellings_practice_lang',
  childName: 'spellings_child_name',
  liveLetters: 'spellings_live_letters',
  paperDictationShuffle: 'spellings_paper_dictation_shuffle',
} as const

const defaultProgress = (): AppProgress => ({
  english: {},
  spanish: {},
  lastMissionDate: null,
  missionStreak: 0,
})

export function loadWeek(): WeekPack | null {
  const raw = localStorage.getItem(KEYS.week)
  if (!raw) return null
  try {
    return JSON.parse(raw) as WeekPack
  } catch {
    return null
  }
}

export function saveWeek(pack: WeekPack): void {
  localStorage.setItem(KEYS.week, JSON.stringify(pack))
}

export function loadProgress(): AppProgress {
  const raw = localStorage.getItem(KEYS.progress)
  if (!raw) return defaultProgress()
  try {
    return migrateProgressWrongVariants({
      ...defaultProgress(),
      ...(JSON.parse(raw) as AppProgress),
    })
  } catch {
    return defaultProgress()
  }
}

export function saveProgress(progress: AppProgress): void {
  localStorage.setItem(KEYS.progress, JSON.stringify(progress))
}

export function resetProgressForNewWeek(): void {
  saveProgress(defaultProgress())
}

export function getUiLang(): 'en' | 'es' | null {
  const v = localStorage.getItem(KEYS.uiLang)
  if (v === 'en' || v === 'es') return v
  return null
}

export function setUiLang(lang: 'en' | 'es'): void {
  localStorage.setItem(KEYS.uiLang, lang)
}

export function loadPracticeLang(): SpellingLang | null {
  const v = localStorage.getItem(KEYS.practiceLang)
  if (v === 'english' || v === 'spanish') return v
  return null
}

export function savePracticeLang(lang: SpellingLang | null): void {
  if (lang) localStorage.setItem(KEYS.practiceLang, lang)
  else localStorage.removeItem(KEYS.practiceLang)
}

export function loadChildName(): string | null {
  const raw = localStorage.getItem(KEYS.childName)
  if (!raw) return null
  const name = normalizeChildName(raw)
  return name.length > 0 ? name : null
}

export function loadLiveLetterHint(): boolean {
  return localStorage.getItem(KEYS.liveLetters) === '1'
}

export function saveLiveLetterHint(enabled: boolean): void {
  if (enabled) localStorage.setItem(KEYS.liveLetters, '1')
  else localStorage.removeItem(KEYS.liveLetters)
}

/** Dictado en papel: true = mezcladas; false = orden de la lista (predeterminado). */
export function loadPaperDictationShuffle(): boolean {
  return localStorage.getItem(KEYS.paperDictationShuffle) === '1'
}

export function savePaperDictationShuffle(shuffle: boolean): void {
  if (shuffle) localStorage.setItem(KEYS.paperDictationShuffle, '1')
  else localStorage.removeItem(KEYS.paperDictationShuffle)
}

export function saveChildName(raw: string): void {
  const name = normalizeChildName(raw)
  if (!isValidChildName(name)) {
    localStorage.removeItem(KEYS.childName)
    return
  }
  localStorage.setItem(KEYS.childName, name)
}
