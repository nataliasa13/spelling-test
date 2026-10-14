import type { SpellingLang, WeekPack } from '../types'

/** Añade aquí nuevos idiomas (y extiende tipos, week pack, progreso, voz, etc.). */
export type SpellingLanguageDef = {
  id: SpellingLang
  labelKey: 'words.english' | 'words.spanish'
  /** Bandera local (SVG en /public) — los emojis no se ven en muchos Windows. */
  flagSrc: string
  weekKey: 'english' | 'spanish'
}

export const spellingLanguages: SpellingLanguageDef[] = [
  { id: 'english', labelKey: 'words.english', flagSrc: `${import.meta.env.BASE_URL}flags/gb.svg`, weekKey: 'english' },
  { id: 'spanish', labelKey: 'words.spanish', flagSrc: `${import.meta.env.BASE_URL}flags/es.svg`, weekKey: 'spanish' },
]

export function getLanguageDef(lang: SpellingLang): SpellingLanguageDef {
  const def = spellingLanguages.find((l) => l.id === lang)
  if (!def) throw new Error(`Unknown language: ${lang}`)
  return def
}

export function getWordsForLang(week: WeekPack, lang: SpellingLang): string[] {
  return week[getLanguageDef(lang).weekKey]
}

export function getLanguagesWithWords(week: WeekPack): SpellingLanguageDef[] {
  return spellingLanguages.filter((def) => week[def.weekKey].length > 0)
}

/** Idioma de práctica: el guardado si sigue válido, si no inglés (si hay palabras), si no otro disponible. */
export function resolvePracticeLangForWeek(
  week: WeekPack,
  current: SpellingLang | null,
): SpellingLang | null {
  const available = getLanguagesWithWords(week)
  if (available.length === 0) return null
  if (current && available.some((d) => d.id === current)) return current
  if (available.some((d) => d.id === 'english')) return 'english'
  return available[0].id
}
