import { schoolConfig } from '../config/school'
import type { WeekPack } from '../types'
import { parseWordList } from './words'

const IMPORT_PARAM = 'import'

/** Huella estable de las listas (ignora espacios / formato); no usa el nombre visible. */
export function weekContentFingerprint(pack: WeekPack): string {
  const english = parseWordList(pack.english.join('\n'))
  const spanish = parseWordList(pack.spanish.join('\n'))
  return JSON.stringify({ english, spanish })
}

export function isSameWeekContent(a: WeekPack | null, b: WeekPack): boolean {
  if (!a) return false
  return weekContentFingerprint(a) === weekContentFingerprint(b)
}

export function createWeekPack(
  weekLabel: string,
  english: string[],
  spanish: string[],
): WeekPack {
  return {
    classId: schoolConfig.classId,
    weekLabel,
    english,
    spanish,
    publishedAt: new Date().toISOString(),
  }
}

function encodePack(pack: WeekPack): string {
  const json = JSON.stringify(pack)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodePack(encoded: string): WeekPack | null {
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) b64 += '='
    const binary = atob(b64)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(json) as WeekPack
    if (parsed.classId !== schoolConfig.classId) return null
    if (!Array.isArray(parsed.english) || !Array.isArray(parsed.spanish)) return null
    return parsed
  } catch {
    return null
  }
}

export function buildShareUrl(pack: WeekPack): string {
  const base = window.location.origin + window.location.pathname
  return `${base}?${IMPORT_PARAM}=${encodePack(pack)}`
}

export function readPackFromUrl(): WeekPack | null {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get(IMPORT_PARAM)
  if (!encoded) return null
  return decodePack(encoded)
}

export function clearImportParam(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete(IMPORT_PARAM)
  window.history.replaceState({}, '', url.pathname + url.search)
}

