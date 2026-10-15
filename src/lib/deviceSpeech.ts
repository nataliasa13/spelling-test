import type { SpellingLang } from '../types'

const LANG_PREFIX: Record<SpellingLang, string> = {
  english: 'en',
  spanish: 'es',
}

/** Voces “de broma” de Apple (Susurro, Violonchelo, Malas noticias…). */
const APPLE_NOVELTY_VOICE_ID = new Set([
  'badnews',
  'bahh',
  'bells',
  'boing',
  'bubbles',
  'cellos',
  'deranged',
  'goodnews',
  'hysterical',
  'junior',
  'kathy',
  'organ',
  'princess',
  'ralph',
  'trinoids',
  'whisper',
  'wobble',
  'zarvox',
  'superstar',
])

const NOVELTY_VOICE_NAME = new Set(
  [
    'whisper',
    'susurro',
    'bad news',
    'malas noticias',
    'good news',
    'buenas noticias',
    'cellos',
    'violonchelo',
    'violonchelos',
    'bahh',
    'bells',
    'campanas',
    'boing',
    'bubbles',
    'burbujas',
    'deranged',
    'hysterical',
    'organ',
    'organo',
    'princess',
    'princesa',
    'ralph',
    'trinoids',
    'zarvox',
    'wobble',
    'superstar',
    'junior',
    'kathy',
  ].map((s) => s.toLowerCase()),
)

function normalizeVoiceLabel(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

function voiceTokenFromUri(voiceURI: string): string {
  const tail = voiceURI.split(/[/\\]/).pop() ?? voiceURI
  const last = tail.split('.').pop() ?? tail
  return last.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function dedupeVoiceNameKey(name: string): string {
  return normalizeVoiceLabel(name)
    .replace(/\s*\([^)]*(enhanced|mejorada|premium|compact|quality|calidad)[^)]*\)\s*/gi, '')
    .trim()
}

function voiceKindScore(voiceURI: string): number {
  const uri = voiceURI.toLowerCase()
  if (uri.includes('enhanced') || uri.includes('premium')) return 3
  if (uri.includes('compact')) return 1
  return 2
}

function langAffinity(voiceLang: string, lang: SpellingLang): number {
  const l = voiceLang.toLowerCase()
  if (lang === 'english') {
    if (l.startsWith('en-gb')) return 3
    if (l.startsWith('en-us')) return 2
    if (l.startsWith('en')) return 1
    return 0
  }
  if (l.startsWith('es-es')) return 3
  if (l.startsWith('es-mx') || l.startsWith('es-419')) return 2
  if (l.startsWith('es')) return 1
  return 0
}

function voiceRank(voice: SpeechSynthesisVoice, lang: SpellingLang): number {
  let score = 0
  if (voice.localService) score += 1_000
  score += voiceKindScore(voice.voiceURI) * 100
  score += langAffinity(voice.lang, lang) * 10
  return score
}

function preferDeviceVoice(
  kept: SpeechSynthesisVoice,
  candidate: SpeechSynthesisVoice,
  lang: SpellingLang,
): SpeechSynthesisVoice {
  return voiceRank(candidate, lang) > voiceRank(kept, lang) ? candidate : kept
}

function voiceDedupeKey(voice: SpeechSynthesisVoice): string {
  const token = voiceTokenFromUri(voice.voiceURI)
  if (token.length >= 2) return `id:${token}`
  return `name:${dedupeVoiceNameKey(voice.name)}`
}

function dedupeDeviceVoices(voices: SpeechSynthesisVoice[], lang: SpellingLang): SpeechSynthesisVoice[] {
  const byUri = new Map<string, SpeechSynthesisVoice>()
  for (const v of voices) {
    const prev = byUri.get(v.voiceURI)
    byUri.set(v.voiceURI, prev ? preferDeviceVoice(prev, v, lang) : v)
  }

  const byKey = new Map<string, SpeechSynthesisVoice>()
  for (const v of byUri.values()) {
    const key = voiceDedupeKey(v)
    const prev = byKey.get(key)
    byKey.set(key, prev ? preferDeviceVoice(prev, v, lang) : v)
  }

  return [...byKey.values()]
}

export function isNoveltyDeviceVoice(voice: SpeechSynthesisVoice): boolean {
  const uri = voice.voiceURI
  if (/com\.apple\.speech\.synthesis\.voice/i.test(uri)) return true
  const id = voiceTokenFromUri(uri)
  if (APPLE_NOVELTY_VOICE_ID.has(id)) return true
  const label = normalizeVoiceLabel(voice.name)
  if (NOVELTY_VOICE_NAME.has(label)) return true
  return false
}

/** iPhone/iPad (Safari, Chrome/CriOS, etc.) — WebKit, sin Piper fiable. */
export function isAppleTouchWebKit(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/**
 * iOS/WebKit: hay que tocar speechSynthesis en el mismo gesto del usuario;
 * luego puede hablar tras awaits. Llamar de forma síncrona en unlockAudio.
 */
export function primeAppleDeviceSpeech(): void {
  if (!isAppleTouchWebKit() || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }
  const synth = window.speechSynthesis
  synth.getVoices()
  if (synth.paused) synth.resume()
  const u = new SpeechSynthesisUtterance('\u200b')
  u.volume = 0.01
  u.rate = 1
  synth.speak(u)
}

export function waitForSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([])
  }
  const synth = window.speechSynthesis
  const existing = synth.getVoices()
  if (existing.length > 0) return Promise.resolve(existing)

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      synth.removeEventListener('voiceschanged', finish)
      if (iosTimer !== undefined) window.clearTimeout(iosTimer)
      resolve(synth.getVoices())
    }
    synth.addEventListener('voiceschanged', finish)
    synth.getVoices()
    const iosTimer = isAppleTouchWebKit()
      ? window.setTimeout(finish, 2_500)
      : undefined
  })
}

export function filterVoicesForSpellingLang(
  voices: SpeechSynthesisVoice[],
  lang: SpellingLang,
): SpeechSynthesisVoice[] {
  const prefix = LANG_PREFIX[lang]
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix))
  const pool = matching.length > 0 ? matching : voices
  const usable = pool.filter((v) => !isNoveltyDeviceVoice(v))
  const list = usable.length > 0 ? usable : pool
  const unique = dedupeDeviceVoices(list, lang)
  return [...unique].sort((a, b) => {
    const localDiff = Number(b.localService) - Number(a.localService)
    if (localDiff !== 0) return localDiff
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

export function resolveSpeechVoice(
  voices: SpeechSynthesisVoice[],
  lang: SpellingLang,
  voiceUri: string | null,
): SpeechSynthesisVoice | undefined {
  if (voiceUri) {
    const exact = voices.find((v) => v.voiceURI === voiceUri)
    if (exact && !isNoveltyDeviceVoice(exact)) return exact
  }
  const pool = filterVoicesForSpellingLang(voices, lang)
  return pool.find((v) => v.localService) ?? pool[0]
}

export function deviceSpeechBcp47(lang: SpellingLang): string {
  return lang === 'english' ? 'en-GB' : 'es-ES'
}
