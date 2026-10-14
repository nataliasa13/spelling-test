import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { buildLiveLetters } from '../lib/liveSpellingLetters'
import type { SpellingLang } from '../types'

type Props = {
  typed: string
  expected: string
  lang: SpellingLang
}

export function LiveLetterFeedback({ typed, expected, lang }: Props) {
  const { t } = useTranslation()
  const letters = useMemo(
    () => buildLiveLetters(typed, expected, lang),
    [typed, expected, lang],
  )

  if (letters.length === 0) return null

  return (
    <div
      className="live-letters"
      role="status"
      aria-label={t('practice.liveLettersA11y')}
    >
      <p className="live-letters__hint muted">{t('practice.liveLettersHint')}</p>
      <div className="live-letters__row" aria-hidden>
        {letters.map((item, index) => (
          <span
            key={`${index}-${item.char}`}
            className={`live-letters__char live-letters__char--${item.status}`}
          >
            {item.char === ' ' ? '\u00a0' : item.char}
          </span>
        ))}
      </div>
    </div>
  )
}
