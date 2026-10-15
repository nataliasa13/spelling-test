import { appConfig } from '../config/app'

export type SpellingLang = 'english' | 'spanish'

/** Voz para practicar: Piper offline o speechSynthesis del dispositivo. */
export type SpeechEngine = 'piper' | 'device'

export type WeekPack = {
  classId: typeof appConfig.classId
  weekLabel: string
  english: string[]
  spanish: string[]
  publishedAt: string
}

export type WordProgress = {
  correctStreak: number
  mastered: boolean
  /** Fallos en dictado (misión / reto / libre clásico). */
  wrongCount?: number
  /** Respuestas incorrectas agrupadas (clave normalizada → veces). */
  wrongVariants?: Record<string, number>
  /** Texto mostrado por variante (último intento con esa forma). */
  wrongVariantForms?: Record<string, string>
  /** @deprecated Solo datos antiguos; migración al leer. */
  recentWrong?: string[]
}

export type AppProgress = {
  english: Record<string, WordProgress>
  spanish: Record<string, WordProgress>
  lastMissionDate: string | null
  missionStreak: number
}

export type PracticeMode =
  | 'mission'
  | 'free'
  | 'challenge'
  | 'mistakes'
  | 'paper'
  | 'dictation'
  | 'minigames'
