import { isValidChildName, normalizeChildName } from './childName'
import { migrateProgressWrongVariants } from './progress'
import type { AppProgress, SpeechEngine, SpellingLang, WeekPack } from '../types'

const KEYS = {
  week: 'spellings_week',
  progress: 'spellings_progress',
  uiLang: 'spellings_ui_lang',
  practiceLang: 'spellings_practice_lang',
  childName: 'spellings_child_name',
  liveLetters: 'spellings_live_letters',
  paperDictationShuffle: 'spellings_paper_dictation_shuffle',
  speechEngineEnglish: 'spellings_speech_engine_english',
  speechEngineSpanish: 'spellings_speech_engine_spanish',
  deviceVoiceEnglish: 'spellings_device_voice_english',
  deviceVoiceSpanish: 'spellings_device_voice_spanish',
} as const

function speechEngineKey(lang: SpellingLang): string {
  return lang === 'english' ? KEYS.speechEngineEnglish : KEYS.speechEngineSpanish
}

function deviceVoiceKey(lang: SpellingLang): string {
  return lang === 'english' ? KEYS.deviceVoiceEnglish : KEYS.deviceVoiceSpanish
}

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
  const v = localStorage.getItem(KEYS.liveLetters)
  if (v === null) return true
  return v === '1'
}

export function saveLiveLetterHint(enabled: boolean): void {
  localStorage.setItem(KEYS.liveLetters, enabled ? '1' : '0')
}

/** Dictado en papel: true = mezcladas; false = orden de la lista (predeterminado). */
export function loadPaperDictationShuffle(): boolean {
  return localStorage.getItem(KEYS.paperDictationShuffle) === '1'
}

export function savePaperDictationShuffle(shuffle: boolean): void {
  if (shuffle) localStorage.setItem(KEYS.paperDictationShuffle, '1')
  else localStorage.removeItem(KEYS.paperDictationShuffle)
}

/** Predeterminado: Piper (offline). */
export function loadSpeechEngine(lang: SpellingLang): SpeechEngine {
  const v = localStorage.getItem(speechEngineKey(lang))
  return v === 'device' ? 'device' : 'piper'
}

export function saveSpeechEngine(lang: SpellingLang, engine: SpeechEngine): void {
  if (engine === 'piper') localStorage.removeItem(speechEngineKey(lang))
  else localStorage.setItem(speechEngineKey(lang), 'device')
}

export function loadDeviceVoiceUri(lang: SpellingLang): string | null {
  const v = localStorage.getItem(deviceVoiceKey(lang))
  return v && v.length > 0 ? v : null
}

export function saveDeviceVoiceUri(lang: SpellingLang, voiceUri: string | null): void {
  if (voiceUri) localStorage.setItem(deviceVoiceKey(lang), voiceUri)
  else localStorage.removeItem(deviceVoiceKey(lang))
}

export function saveChildName(raw: string): void {
  const name = normalizeChildName(raw)
  if (!isValidChildName(name)) {
    localStorage.removeItem(KEYS.childName)
    return
  }
  localStorage.setItem(KEYS.childName, name)
}
