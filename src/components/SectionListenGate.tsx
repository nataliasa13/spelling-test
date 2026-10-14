import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LangFlag } from './LangFlag'
import { ListenIcon } from './ListenAgainButton'
import { useVoiceLoadingLabel } from '../hooks/useVoiceLoadingLabel'
import { ensureSpeechReady, speakWord, unlockAudio } from '../lib/speech'
import type { SpellingLang } from '../types'

export type SectionListenVariant = 'dictation' | 'minigame'

type Props = {
  lang: SpellingLang
  word?: string
  title?: string
  subtitle?: string
  variant?: SectionListenVariant
  onStart: () => void
}

export function SectionListenGate({
  lang,
  word,
  title,
  subtitle,
  variant = 'dictation',
  onStart,
}: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const langLabel = t(lang === 'english' ? 'words.english' : 'words.spanish')
  const cta = useVoiceLoadingLabel(loading, t('practice.sectionPlay'))

  function onPlay() {
    unlockAudio()
    setLoading(true)
    void (async () => {
      try {
        await ensureSpeechReady(lang)
        unlockAudio()
        onStart()
        if (word?.trim()) void speakWord(word, lang, { preferPiper: true })
      } finally {
        setLoading(false)
      }
    })()
  }

  const toneClass = variant === 'minigame' ? 'gate-screen--minigame' : 'gate-screen--dictation'

  return (
    <main className={`page practice-page gate-screen ${toneClass}`.trim()}>
      <div className={`gate-screen__card ${toneClass}`.trim()} role="region" aria-labelledby="gate-screen-title">
        {subtitle ? <p className="gate-screen__kicker">{subtitle}</p> : null}
        {title ? (
          <h2 id="gate-screen-title" className="gate-screen__title">
            {title}
          </h2>
        ) : null}

        <div className={`gate-screen__visual ${loading ? 'gate-screen__visual--busy' : ''}`.trim()} aria-hidden>
          <span className="gate-screen__ring gate-screen__ring--outer" />
          <span className="gate-screen__ring gate-screen__ring--inner" />
          <span className="gate-screen__icon">
            <ListenIcon size="lg" />
          </span>
        </div>

        <p className="gate-screen__lead">
          {loading ? t('practice.voiceLoadingHint') : t('practice.sectionPlayLead')}
        </p>

        <button
          type="button"
          className="btn btn--primary btn--large gate-screen__btn"
          onClick={onPlay}
          disabled={loading}
          aria-busy={loading}
        >
          {cta}
        </button>

        <p className="gate-screen__lang">
          <LangFlag lang={lang} size="sm" />
          <span>{langLabel}</span>
        </p>
      </div>
    </main>
  )
}
