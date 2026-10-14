import type { WeekPack } from '../types'
import { parseWordList } from './words'

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
