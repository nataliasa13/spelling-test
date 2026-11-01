import type { SpellingLang, WeekPack } from '../types'
import { getWordsForLang } from '../config/languages'

/** Trozo de la frase que se dicta de una vez, con el signo que lo cierra (si hay). */
export type SentenceChunk = {
  text: string
  /** Texto para la voz: el trozo + el nombre del signo («el gato, coma»). */
  spoken: string
}

export function hasSentence(week: WeekPack, lang: SpellingLang): boolean {
  return week.sentence?.[lang] === true && getSentenceText(week, lang).length > 0
}

/**
 * Texto de la frase: `sentenceText` si viene en el JSON; si no, las palabras
 * de la lista separadas por comas y con punto final (un solo párrafo).
 */
export function getSentenceText(week: WeekPack, lang: SpellingLang): string {
  const explicit = week.sentenceText?.[lang]?.trim()
  if (explicit) return explicit
  const words = getWordsForLang(week, lang)
  if (words.length === 0) return ''
  const joined = words.join(', ')
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`
}

const PUNCT_NAMES: Record<SpellingLang, Record<string, string>> = {
  spanish: {
    ',': 'coma',
    ';': 'punto y coma',
    ':': 'dos puntos',
    '.': 'punto y seguido',
    paragraph: 'punto y aparte',
    end: 'punto',
  },
  english: {
    ',': 'comma',
    ';': 'semicolon',
    ':': 'colon',
    '.': 'full stop',
    paragraph: 'full stop, new paragraph',
    end: 'full stop',
  },
}

/** Parte el texto en trozos que terminan en , ; : o . — cada párrafo es una línea. */
export function buildSentenceChunks(text: string, lang: SpellingLang): SentenceChunk[] {
  const names = PUNCT_NAMES[lang]
  const paragraphs = text
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const chunks: SentenceChunk[] = []
  paragraphs.forEach((paragraph, pIndex) => {
    const isLastParagraph = pIndex === paragraphs.length - 1
    const parts = paragraph.match(/[^,;:.]+[,;:.]*/g) ?? []
    parts.forEach((part, i) => {
      const trimmed = part.trim()
      const punct = trimmed.match(/[,;:.]$/)?.[0]
      const words = trimmed.replace(/[,;:.]+$/, '').trim()
      if (!words) return
      const isLastInParagraph = i === parts.length - 1
      let name: string | undefined
      if (punct === '.') {
        name = !isLastInParagraph ? names['.'] : isLastParagraph ? names.end : names.paragraph
      } else if (punct) {
        name = names[punct]
      }
      chunks.push({ text: trimmed, spoken: name ? `${words}, ${name}.` : words })
    })
  })
  return chunks
}
