import {
  deviceSpeechBcp47,
  isAppleTouchWebKit,
  primeAppleDeviceSpeech,
  resolveSpeechVoice,
  waitForSpeechVoices,
} from './deviceSpeech'
import {
  installPiperLocalFetch,
  piperWasmPaths,
  resetPiperSingleton,
} from './piperLocal'
import { loadDeviceVoiceUri, loadSpeechEngine } from './storage'
import type { SpellingLang } from '../types'

/** Misma voz Piper en todos los dispositivos (offline). */
const PIPER_VOICE = {
  english: 'en_GB-jenny_dioco-medium',
  /** Sharvard F: 22 kHz, mejor equilibrio calidad / palabras sueltas en es_ES. */
  spanish: 'es_ES-sharvard-medium',
} as const

/** Sharvard: 1 = F. Inglés es mono-speaker — no fijar sid (0 en Sharvard = masculino). */
const PIPER_SPEAKER: Partial<Record<keyof typeof PIPER_VOICE, number>> = {
  spanish: 1,
}

const PLAYBACK_RATE: Record<SpellingLang, number> = {
  english: 1,
  /** Castellano: 1.0 como en https://rhasspy.github.io/piper-samples/ */
  spanish: 1,
}

type PiperModule = typeof import('@mintplex-labs/piper-tts-web')
type PiperSession = InstanceType<PiperModule['TtsSession']>
type PiperLangKey = keyof typeof PIPER_VOICE

declare global {
  // eslint-disable-next-line no-var
  var __spellingsPiperSpeakerId: number | undefined
  // eslint-disable-next-line no-var
  var __spellingsPiperLengthScale: number | undefined
  // eslint-disable-next-line no-var
  var __spellingsPiperNoiseScale: number | undefined
}

let piperModule: PiperModule | null = null
let activeSession: PiperSession | null = null
let activeSessionKey: PiperLangKey | null = null
const initPromises: Partial<Record<PiperLangKey, Promise<void>>> = {}
let piperCacheReady: Promise<void> | null = null
let sessionSwitch: Promise<PiperSession | null> = Promise.resolve(null)

const PIPER_OPFS_CACHE_KEY = 'spellings_piper_opfs_v'
const PIPER_OPFS_CACHE_VERSION = '18-voice-reload-en'

let audioContext: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null
const activeSources = new Set<AudioBufferSourceNode>()
/** Nuevo clic = cancelar reproducción y síntesis en curso (no encolar). */
let speakToken = 0

/** Primera carga en móvil: ONNX + WASM pueden tardar varios minutos. */
const PIPER_READY_TIMEOUT_MS = 240_000
const PIPER_FLUSH_TIMEOUT_MS = 20_000

const piperUnavailable = new Set<PiperLangKey>()

type PrepProgress = { loaded: number; total: number }
let prepProgress: PrepProgress | null = null
const prepProgressListeners = new Set<() => void>()

function notifyPrepProgress(): void {
  for (const fn of prepProgressListeners) fn()
}

export function subscribeSpeechPrepProgress(listener: () => void): () => void {
  prepProgressListeners.add(listener)
  return () => prepProgressListeners.delete(listener)
}

export type SpeechPrepProgressView =
  | { kind: 'pct'; pct: number }
  | { kind: 'loaded'; mb: number }

/** Avance de descarga del .onnx ( algunos servidores no envían Content-Length ). */
export function getSpeechPrepProgress(): SpeechPrepProgressView | null {
  if (!prepProgress) return null
  if (prepProgress.total > 0) {
    const pct = Math.min(100, Math.round((prepProgress.loaded / prepProgress.total) * 100))
    if (pct > 0 && pct < 100) return { kind: 'pct', pct }
  }
  const mb = prepProgress.loaded / (1024 * 1024)
  if (mb >= 0.3) return { kind: 'loaded', mb: Math.round(mb * 10) / 10 }
  return null
}

function onPiperAssetProgress(info: { url: string; loaded: number; total: number }): void {
  if (!info.url.includes('.onnx')) return
  prepProgress = { loaded: info.loaded, total: info.total }
  notifyPrepProgress()
}

function markPiperUnavailable(key: PiperLangKey): void {
  piperUnavailable.add(key)
  initPromises[key] = undefined
}

function piperLangKey(lang: SpellingLang): PiperLangKey {
  return lang === 'english' ? 'english' : 'spanish'
}

function piperPlatformSupported(): boolean {
  return !isAppleTouchWebKit()
}

function shouldUsePiper(lang: SpellingLang, preferPiper: boolean): boolean {
  if (!preferPiper) return false
  if (!piperPlatformSupported()) return false
  if (loadSpeechEngine(lang) === 'device') return false
  return !piperUnavailable.has(piperLangKey(lang))
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms)
      }),
    ])
  } finally {
    if (timer !== undefined) window.clearTimeout(timer)
  }
}

async function speakWithDeviceVoice(text: string, lang: SpellingLang): Promise<void> {
  if (!('speechSynthesis' in window)) return
  stopPlayback()
  const synth = window.speechSynthesis
  synth.cancel()
  if (synth.paused) synth.resume()
  const voices = await waitForSpeechVoices()
  const voice = resolveSpeechVoice(voices, lang, loadDeviceVoiceUri(lang))
  const u = new SpeechSynthesisUtterance(text)
  u.lang = voice?.lang ?? deviceSpeechBcp47(lang)
  if (voice) u.voice = voice
  u.rate = 0.82
  await new Promise<void>((resolve) => {
    u.onend = () => resolve()
    u.onerror = () => resolve()
    synth.speak(u)
    if (!synth.speaking && isAppleTouchWebKit()) {
      window.setTimeout(() => resolve(), 120)
    }
  })
}

installPiperLocalFetch()

async function ensureAudioContext(): Promise<AudioContext | null> {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    audioContext = new Ctx()
  }
  if (audioContext.state === 'suspended') {
    await audioContext.resume().catch(() => {})
  }
  return audioContext
}

export function unlockAudio(): void {
  primeAppleDeviceSpeech()
  void ensureAudioContext()
}

export function preloadSpanishWeekWords(_words: string[]): void {
  if (loadSpeechEngine('spanish') === 'piper') void ensureSpeechReady('spanish')
}

async function loadPiper(): Promise<PiperModule> {
  if (!piperModule) {
    piperModule = await import('@mintplex-labs/piper-tts-web')
  }
  return piperModule
}

async function ensurePiperOpfsCache(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!piperCacheReady) {
    piperCacheReady = (async () => {
      if (localStorage.getItem(PIPER_OPFS_CACHE_KEY) === PIPER_OPFS_CACHE_VERSION) return
      localStorage.setItem(PIPER_OPFS_CACHE_KEY, PIPER_OPFS_CACHE_VERSION)
      const tts = await loadPiper()
      await withTimeout(tts.flush(), PIPER_FLUSH_TIMEOUT_MS, 'piper flush').catch((err) => {
        console.warn('Piper OPFS flush skipped:', err)
      })
    })().catch((err) => {
      piperCacheReady = null
      console.warn('Piper OPFS flush skipped:', err)
    })
  }
  await piperCacheReady
}

function isCorruptPiperConfigError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    err instanceof SyntaxError ||
    msg.includes('Unexpected token') ||
    msg.includes('<!doctype') ||
    msg.includes('not valid JSON')
  )
}

function stopPlayback(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  for (const source of activeSources) {
    try {
      source.stop(0)
    } catch {
      /* already stopped */
    }
    try {
      source.disconnect()
    } catch {
      /* */
    }
  }
  activeSources.clear()
  currentSource = null
}

function isCurrentSpeak(token: number): boolean {
  return token === speakToken
}

function applyPiperRuntime(key: PiperLangKey): void {
  const sid = PIPER_SPEAKER[key]
  if (sid != null) globalThis.__spellingsPiperSpeakerId = sid
  else delete globalThis.__spellingsPiperSpeakerId
  globalThis.__spellingsPiperNoiseScale = undefined
  globalThis.__spellingsPiperLengthScale = undefined
}

/** Al cambiar 🇬🇧/🇪🇸: no reutilizar ONNX de la otra lengua. */
export function invalidatePiperOnLangChange(): void {
  speakToken++
  stopPlayback()
  activeSession = null
  activeSessionKey = null
  for (const k of Object.keys(initPromises) as PiperLangKey[]) {
    delete initPromises[k]
  }
  void loadPiper().then((tts) => resetPiperSingleton(tts))
}

async function createSession(voiceId: string, key: PiperLangKey, retried = false): Promise<PiperSession> {
  await ensurePiperOpfsCache()
  applyPiperRuntime(key)
  const tts = await loadPiper()
  resetPiperSingleton(tts)
  try {
    return await tts.TtsSession.create({
      voiceId,
      wasmPaths: piperWasmPaths(),
      progress: onPiperAssetProgress,
    })
  } catch (err) {
    if (!retried && isCorruptPiperConfigError(err)) {
      console.warn(`Corrupt Piper cache for ${voiceId}, clearing and retrying…`)
      await tts.remove(voiceId)
      resetPiperSingleton(tts)
      return createSession(voiceId, key, true)
    }
    throw err
  }
}

function sessionMatchesKey(session: PiperSession, key: PiperLangKey): boolean {
  return session.voiceId === PIPER_VOICE[key]
}

function isSessionWarm(key: PiperLangKey): boolean {
  return !!(activeSession && activeSessionKey === key && sessionMatchesKey(activeSession, key))
}

export function isSpeechSessionWarm(lang: SpellingLang): boolean {
  const key: PiperLangKey = lang === 'english' ? 'english' : 'spanish'
  return isSessionWarm(key)
}

/** Guarda ONNX en OPFS sin cambiar la voz activa (precarga del otro idioma). */
export async function prefetchSpeechAssets(lang: SpellingLang): Promise<void> {
  await ensurePiperOpfsCache()
  const piperKey: PiperLangKey = lang === 'english' ? 'english' : 'spanish'
  const tts = await loadPiper()
  await tts.download(PIPER_VOICE[piperKey]).catch((err) => {
    console.warn(`Piper prefetch failed (${lang}):`, err)
  })
}

async function getPiperSession(key: PiperLangKey): Promise<PiperSession> {
  if (activeSession && activeSessionKey === key && sessionMatchesKey(activeSession, key)) {
    return activeSession
  }

  sessionSwitch = sessionSwitch.then(async () => {
    if (activeSession && activeSessionKey === key && sessionMatchesKey(activeSession, key)) {
      return activeSession
    }
    activeSession = await createSession(PIPER_VOICE[key], key)
    activeSessionKey = key
    return activeSession
  })

  const session = await sessionSwitch
  if (!session) throw new Error('piper session unavailable')
  return session
}

function ensurePiperReady(key: PiperLangKey): Promise<void> {
  if (piperUnavailable.has(key)) {
    return Promise.reject(new Error(`piper unavailable (${key})`))
  }
  if (isSessionWarm(key)) return Promise.resolve()

  if (!initPromises[key]) {
    initPromises[key] = getPiperSession(key)
      .then(() => {
        if (!isSessionWarm(key)) throw new Error('piper session not ready')
      })
      .catch((err) => {
        markPiperUnavailable(key)
        console.warn(`Piper voice failed (${key}):`, err)
        throw err
      })
  }
  return initPromises[key]!
}

/** Prepara Piper; devuelve false si hay que usar la voz del dispositivo. */
export async function ensureSpeechReady(lang?: SpellingLang): Promise<boolean> {
  const key: PiperLangKey =
    lang === 'spanish' ? 'spanish' : lang === 'english' ? 'english' : 'english'

  if (lang && loadSpeechEngine(lang) === 'device') return true

  if (!piperPlatformSupported()) return true

  if (piperUnavailable.has(key)) return false

  prepProgress = null
  notifyPrepProgress()

  try {
    await withTimeout(ensurePiperReady(key), PIPER_READY_TIMEOUT_MS, 'piper ready')
    return true
  } catch (err) {
    markPiperUnavailable(key)
    console.warn(`Speech prep failed (${key}):`, err)
    return false
  } finally {
    prepProgress = null
    notifyPrepProgress()
  }
}

/** eSpeak/Piper sueltan palabras aisladas sin entonación española; una frase mínima ayuda. */
function piperTextForSpelling(word: string, lang: SpellingLang): string {
  const w = word.trim()
  if (!w) return w
  if (/[.!?…]$/.test(w)) return w
  return lang === 'spanish' ? `${w}.` : `${w}.`
}

function trimLeadingTrailingSilence(
  ctx: AudioContext,
  buffer: AudioBuffer,
  threshold = 0.012,
  padMs = 35,
): AudioBuffer {
  const sampleRate = buffer.sampleRate
  const ch0 = buffer.getChannelData(0)
  let start = 0
  let end = ch0.length - 1
  while (start < ch0.length && Math.abs(ch0[start]!) < threshold) start++
  while (end > start && Math.abs(ch0[end]!) < threshold) end--
  const pad = Math.floor((padMs / 1000) * sampleRate)
  start = Math.max(0, start - pad)
  end = Math.min(ch0.length - 1, end + pad)
  const length = Math.max(1, end - start + 1)
  const out = ctx.createBuffer(buffer.numberOfChannels, length, sampleRate)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c)
    const dst = out.getChannelData(c)
    for (let i = 0; i < length; i++) dst[i] = src[start + i]!
  }
  return out
}

async function playPiperBlob(blob: Blob, lang: SpellingLang, token: number): Promise<boolean> {
  if (!isCurrentSpeak(token)) return false

  const ctx = await ensureAudioContext()
  if (!ctx) return false

  stopPlayback()

  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
  } catch {
    return false
  }

  if (!isCurrentSpeak(token)) return false

  if (lang === 'spanish') {
    decoded = trimLeadingTrailingSilence(ctx, decoded)
  }

  const source = ctx.createBufferSource()
  source.buffer = decoded
  source.playbackRate.value = PLAYBACK_RATE[lang]
  source.connect(ctx.destination)
  activeSources.add(source)
  currentSource = source

  return new Promise((resolve) => {
    source.onended = () => {
      activeSources.delete(source)
      if (currentSource === source) currentSource = null
      resolve(true)
    }
    if (!isCurrentSpeak(token)) {
      activeSources.delete(source)
      currentSource = null
      resolve(false)
      return
    }
    try {
      source.start(0)
    } catch {
      activeSources.delete(source)
      currentSource = null
      resolve(false)
    }
  })
}

export type SpeakOptions = {
  preferPiper?: boolean
}

async function speakWordAsync(
  word: string,
  lang: SpellingLang,
  { preferPiper = true }: SpeakOptions,
  token: number,
): Promise<void> {
  const text = word.trim()
  if (!text || !isCurrentSpeak(token)) return

  if (!shouldUsePiper(lang, preferPiper)) {
    await speakWithDeviceVoice(text, lang)
    return
  }

  try {
    const piperKey = piperLangKey(lang)
    applyPiperRuntime(piperKey)
    let session = await getPiperSession(piperKey)
    if (!isCurrentSpeak(token)) return
    if (!sessionMatchesKey(session, piperKey)) {
      activeSession = null
      activeSessionKey = null
      session = await getPiperSession(piperKey)
    }
    if (!isCurrentSpeak(token)) return

    const blob = await session.predict(piperTextForSpelling(text, lang))
    if (!isCurrentSpeak(token)) return
    if (blob.size < 100) throw new Error('empty audio')

    await playPiperBlob(blob, lang, token)
  } catch (err) {
    if (!isCurrentSpeak(token)) return
    console.warn(`Speak failed (${lang}):`, err)
    markPiperUnavailable(piperLangKey(lang))
    await speakWithDeviceVoice(text, lang)
  }
}

export function speakWord(word: string, lang: SpellingLang, options?: SpeakOptions): Promise<void> {
  const token = ++speakToken
  stopPlayback()
  unlockAudio()
  return speakWordAsync(word, lang, options ?? {}, token).catch((err) => {
    if (!isCurrentSpeak(token)) return
    console.warn('Speak error:', err)
  })
}
