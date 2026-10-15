import i18n from '../i18n'
import { speakWord } from './speech'
import type { SpellingLang } from '../types'

function uiLngForSpellingLang(lang: SpellingLang): 'es' | 'en' {
  return lang === 'spanish' ? 'es' : 'en'
}

/** Mensaje de acierto en el idioma del dictado (no solo UI). */
export function getCorrectFeedbackMessage(
  lang: SpellingLang,
  childName: string | null | undefined,
): string {
  const t = i18n.getFixedT(uiLngForSpellingLang(lang))
  const name = childName?.trim()
  if (name) return t('practice.correctWithName', { name })
  return t('practice.correct')
}

export function speakCorrectFeedback(
  lang: SpellingLang,
  childName: string | null | undefined,
): Promise<void> {
  return speakWord(getCorrectFeedbackMessage(lang, childName), lang, { preferPiper: true })
}
