import i18n from '../i18n'
import { speakWord } from './speech'
import type { SpellingLang } from '../types'

function uiLngForSpellingLang(lang: SpellingLang): 'es' | 'en' {
  return lang === 'spanish' ? 'es' : 'en'
}

export type TryAgainFeedbackKind = 'encourage' | 'reveal' | 'minigame'

/** Mensaje en pantalla (puede incluir la palabra en reto/misión o minijuegos). */
export function getTryAgainFeedbackMessage(
  lang: SpellingLang,
  childName: string | null | undefined,
  kind: TryAgainFeedbackKind,
  word?: string,
): string {
  const t = i18n.getFixedT(uiLngForSpellingLang(lang))
  if (kind === 'reveal' && word?.trim()) {
    return t('practice.almost', { word: word.trim() })
  }
  if (kind === 'minigame' && word?.trim()) {
    return t('practice.warmupTryAgain', { word: word.trim() })
  }
  const name = childName?.trim()
  if (name) return t('practice.tryAgainWithName', { name })
  return t('practice.tryAgain')
}

/** Voz de ánimo — sin leer la solución en voz alta. */
export function getTryAgainEncourageSpeakMessage(
  lang: SpellingLang,
  childName: string | null | undefined,
): string {
  const t = i18n.getFixedT(uiLngForSpellingLang(lang))
  const name = childName?.trim()
  if (name) return t('practice.tryAgainWithName', { name })
  return t('practice.tryAgain')
}

export function speakTryAgainEncourage(
  lang: SpellingLang,
  childName: string | null | undefined,
): Promise<void> {
  return speakWord(getTryAgainEncourageSpeakMessage(lang, childName), lang, { preferPiper: true })
}
