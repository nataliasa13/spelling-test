import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LangFlag } from './LangFlag'
import { ListenAgainButton, ListenIcon } from './ListenAgainButton'
import { PracticeFinishScreen } from './PracticeFinishScreen'
import { useVoiceLoadingLabel } from '../hooks/useVoiceLoadingLabel'
import { markSentenceDictationUsed } from '../lib/storage'
import { buildSentenceChunks, getSentenceText } from '../lib/sentence'
import { ensureSpeechReady, speakWord, unlockAudio } from '../lib/speech'
import type { SpellingLang, WeekPack } from '../types'

type Props = {
  week: WeekPack
  lang: SpellingLang
}

/** Dictado en papel de la frase: trozo a trozo, diciendo los signos («coma», «punto»…). */
export function SentenceDictationPlayer({ week, lang }: Props) {
  const { t } = useTranslation()

  const text = useMemo(() => getSentenceText(week, lang), [week, lang])
  const chunks = useMemo(() => buildSentenceChunks(text, lang), [text, lang])

  const [phase, setPhase] = useState<'setup' | 'active' | 'done'>('setup')
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  const current = chunks[index]
  const langLabel = t(lang === 'english' ? 'words.english' : 'words.spanish')
  const setupCta = useVoiceLoadingLabel(loading, t('practice.sentenceStart'))

  function onStart() {
    unlockAudio()
    markSentenceDictationUsed()
    const first = chunks[0]
    setLoading(true)
    void (async () => {
      try {
        await ensureSpeechReady(lang)
        setIndex(0)
        setPhase('active')
        if (first) void speakWord(first.spoken, lang, { preferPiper: true })
      } finally {
        setLoading(false)
      }
    })()
  }

  function onNext() {
    if (index + 1 >= chunks.length) {
      setPhase('done')
      return
    }
    unlockAudio()
    const nextIndex = index + 1
    setIndex(nextIndex)
    const next = chunks[nextIndex]
    if (next) void speakWord(next.spoken, lang, { preferPiper: true })
  }

  function playAgain() {
    setIndex(0)
    setPhase('setup')
  }

  if (phase === 'done') {
    return (
      <PracticeFinishScreen
        kind="sentence"
        onPlayAgain={playAgain}
        playAgainLabel={t('practice.paperAgain')}
      >
        <div className="sentence-dictation__text">
          {text
            .split(/\r?\n/)
            .filter((p) => p.trim())
            .map((p, i) => (
              <p key={i}>{p.trim()}</p>
            ))}
        </div>
      </PracticeFinishScreen>
    )
  }

  if (phase === 'setup') {
    return (
      <main className="page practice-page gate-screen gate-screen--paper">
        <div
          className="gate-screen__card gate-screen--paper"
          role="region"
          aria-labelledby="sentence-dictation-title"
        >
          <h2 id="sentence-dictation-title" className="gate-screen__title">
            {t('practice.sentenceTitle')}
          </h2>
          <p className="gate-screen__lead">
            {loading
              ? t('practice.voiceLoadingHint')
              : t('practice.sentenceSetupLead', { count: chunks.length })}
          </p>
          <p className="gate-screen__order-hint muted">{t('practice.sentenceSetupHint')}</p>

          <div className={`gate-screen__visual ${loading ? 'gate-screen__visual--busy' : ''}`.trim()} aria-hidden>
            <span className="gate-screen__ring gate-screen__ring--outer" />
            <span className="gate-screen__ring gate-screen__ring--inner" />
            <span className="gate-screen__icon gate-screen__icon--paper" aria-hidden>
              🖊️
            </span>
          </div>

          <button
            type="button"
            className="btn btn--primary btn--large gate-screen__btn"
            onClick={onStart}
            disabled={loading || chunks.length === 0}
            aria-busy={loading}
          >
            {setupCta}
          </button>

          <p className="gate-screen__lang">
            <LangFlag lang={lang} size="sm" />
            <span>{langLabel}</span>
          </p>
        </div>
      </main>
    )
  }

  if (!current) return null

  const isLast = index + 1 >= chunks.length
  const nextLabel = isLast ? t('practice.paperDone') : t('practice.sentenceNext')

  return (
    <main className="page practice-page paper-dictation">
      <h2 className="page-title">{t('practice.sentenceTitle')}</h2>
      <p className="muted">{t('practice.progress', { current: index + 1, total: chunks.length })}</p>
      <p className="paper-dictation__hint muted">{t('practice.sentenceActiveHint')}</p>

      <div className="practice-card paper-dictation__card">
        <p className="practice-prompt" aria-hidden>
          <ListenIcon size="lg" />
        </p>
        <p className="sr-only">{t('practice.sentenceChunkA11y', { current: index + 1 })}</p>

        <div className="practice-actions">
          <ListenAgainButton word={current.spoken} lang={lang} />
        </div>

        <button type="button" className="btn btn--primary btn--block" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </main>
  )
}
