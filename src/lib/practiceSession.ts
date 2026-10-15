import type { WarmupRound } from './minigames'
import type { MinigamePlayMode } from './minigames'
import type { SpellingLang, WeekPack } from '../types'

const SESSION_KEY = 'spellings_practice_session'
const PENDING_BUILD_KEY = 'spellings_pending_app_build'

export type DictationSessionKind = 'pick' | 'practice' | 'exam'

export type TypingSessionPayload = {
  type: 'typing'
  wordOrder: string[]
  index: number
  input: string
  feedback: 'idle' | 'ok' | 'bad'
  score: number
  finished: boolean
  dictationStarted: boolean
  missionPhase: 'warmup' | 'dictation'
  missionAudioReady: boolean
  dictationSession: DictationSessionKind
}

export type MinigameSessionPayload = {
  type: 'minigame'
  variant: 'warmup' | 'free'
  rounds: WarmupRound[]
  index: number
  feedback: 'idle' | 'ok' | 'bad'
  started: boolean
  minigameSession: 'pick' | 'play'
  minigamePlayMode: MinigamePlayMode
  minigameRun: number
  freeMinigamesDone: boolean
}

export type PaperSessionPayload = {
  type: 'paper'
  phase: 'setup' | 'active' | 'done'
  shuffle: boolean
  wordOrder: string[]
  runId: number
  index: number
}

export type PracticeSessionPayload =
  | TypingSessionPayload
  | MinigameSessionPayload
  | PaperSessionPayload

export type StoredPracticeSession = {
  v: 1
  weekLabel: string
  publishedAt: string
  lang: SpellingLang
  routeMode: string
  active: boolean
  payload: PracticeSessionPayload
}

export function practiceSessionScopeKey(
  week: WeekPack,
  lang: SpellingLang,
  routeMode: string,
): string {
  return `${week.weekLabel}\0${week.publishedAt}\0${lang}\0${routeMode}`
}

export function matchesPracticeSessionScope(
  session: StoredPracticeSession,
  week: WeekPack,
  lang: SpellingLang,
  routeMode: string,
): boolean {
  return (
    session.weekLabel === week.weekLabel &&
    session.publishedAt === week.publishedAt &&
    session.lang === lang &&
    session.routeMode === routeMode
  )
}

export function wordOrderMatchesWeek(order: string[], week: WeekPack, lang: SpellingLang): boolean {
  const fromWeek = lang === 'english' ? week.english : week.spanish
  if (order.length !== fromWeek.length) return false
  const a = [...order].sort()
  const b = [...fromWeek].sort()
  return a.every((w, i) => w === b[i])
}

export function loadPracticeSession(): StoredPracticeSession | null {
  if (typeof sessionStorage === 'undefined') return null
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredPracticeSession
    if (parsed.v !== 1 || !parsed.payload?.type) return null
    return parsed
  } catch {
    return null
  }
}

export function savePracticeSession(session: StoredPracticeSession): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* quota */
  }
}

export function clearPracticeSession(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(SESSION_KEY)
  void applyPendingAppBuildIfAny()
}

export function hasActivePracticeSession(): boolean {
  const s = loadPracticeSession()
  return !!(s?.active)
}

export function deferAppBuildUpdate(remoteBuild: string): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(PENDING_BUILD_KEY, remoteBuild)
}

declare const __APP_BUILD_ID__: string

/** Tras terminar práctica, aplicar recarga pendiente por versión nueva. */
export async function applyPendingAppBuildIfAny(): Promise<void> {
  if (typeof sessionStorage === 'undefined') return
  const pending = sessionStorage.getItem(PENDING_BUILD_KEY)
  if (!pending) return
  const embedded = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev'
  if (pending === embedded) {
    sessionStorage.removeItem(PENDING_BUILD_KEY)
    return
  }
  if (hasActivePracticeSession()) return

  sessionStorage.removeItem(PENDING_BUILD_KEY)
  const base = import.meta.env.BASE_URL
  const root = base.endsWith('/') ? base : `${base}/`
  const url = new URL(root, window.location.origin)
  url.searchParams.set('app_build', pending)
  sessionStorage.setItem('spellings_app_reload_for', pending)
  window.location.replace(url.toString())
  await new Promise<void>(() => {})
}

export function isSessionActivePayload(payload: PracticeSessionPayload): boolean {
  switch (payload.type) {
    case 'paper':
      return payload.phase === 'active'
    case 'minigame':
      return (
        payload.minigameSession === 'play' &&
        !payload.freeMinigamesDone &&
        payload.started &&
        payload.index < payload.rounds.length
      )
    case 'typing':
      if (payload.finished) return false
      if (payload.dictationSession === 'pick') return false
      return true
    default:
      return false
  }
}
