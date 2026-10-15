import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LangFlag } from './LangFlag'
import { ListenAgainButton, ListenIcon } from './ListenAgainButton'
import { PracticeFinishScreen } from './PracticeFinishScreen'
import { loadPaperDictationShuffle, savePaperDictationShuffle } from '../lib/storage'
import {
  clearPracticeSession,
  isSessionActivePayload,
  loadPracticeSession,
  matchesPracticeSessionScope,
  savePracticeSession,
  wordOrderMatchesWeek,
  type PaperSessionPayload,
} from '../lib/practiceSession'
import { useVoiceLoadingLabel } from '../hooks/useVoiceLoadingLabel'
import { ensureSpeechReady, speakWord, unlockAudio } from '../lib/speech'
import type { SpellingLang, WeekPack } from '../types'

function shuffleWords<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Props = {
  week: WeekPack
  lang: SpellingLang
  words: string[]
}

const ROUTE_MODE = 'paper'

export function PaperDictationPlayer({ week, lang, words: sourceWords }: Props) {
  const { t } = useTranslation()

  const savedRef = useRef<PaperSessionPayload | null | undefined>(undefined)
  if (savedRef.current === undefined) {
    const s = loadPracticeSession()
    savedRef.current =
      s?.payload.type === 'paper' &&
      matchesPracticeSessionScope(s, week, lang, ROUTE_MODE) &&
      wordOrderMatchesWeek(s.payload.wordOrder, week, lang)
        ? s.payload
        : null
  }
  const paperSaved = savedRef.current

  const [phase, setPhase] = useState<'setup' | 'active' | 'done'>(paperSaved?.phase ?? 'setup')
  const [shuffle, setShuffle] = useState(() => paperSaved?.shuffle ?? loadPaperDictationShuffle())
  const [runId, setRunId] = useState(paperSaved?.runId ?? 0)
  const [index, setIndex] = useState(paperSaved?.index ?? 0)
  const [loading, setLoading] = useState(false)
  const [wordOrder, setWordOrder] = useState<string[] | null>(paperSaved?.wordOrder ?? null)

  const words = useMemo(() => {
    if (wordOrder?.length) return wordOrder
    const base = [...sourceWords]
    return shuffle ? shuffleWords(base) : base
  }, [sourceWords, shuffle, runId, wordOrder])

  useEffect(() => {
    if (wordOrder?.length) return
    const base = [...sourceWords]
    setWordOrder(shuffle ? shuffleWords(base) : base)
  }, [sourceWords, shuffle, runId, wordOrder])

  useEffect(() => {
    if (!wordOrder?.length) return
    const payload: PaperSessionPayload = {
      type: 'paper',
      phase,
      shuffle,
      wordOrder,
      runId,
      index,
    }
    savePracticeSession({
      v: 1,
      weekLabel: week.weekLabel,
      publishedAt: week.publishedAt,
      lang,
      routeMode: ROUTE_MODE,
      active: isSessionActivePayload(payload),
      payload,
    })
  }, [week.weekLabel, week.publishedAt, lang, phase, shuffle, wordOrder, runId, index])

  const current = words[index]
  const langLabel = t(lang === 'english' ? 'words.english' : 'words.spanish')
  const setupCta = useVoiceLoadingLabel(loading, t('practice.paperStart'))

  function setShufflePref(on: boolean) {
    setShuffle(on)
    savePaperDictationShuffle(on)
  }

  function onStart() {
    unlockAudio()
    const first = words[0]
    setLoading(true)
    void (async () => {
      try {
        await ensureSpeechReady(lang)
        setIndex(0)
        setPhase('active')
        if (first) void speakWord(first, lang, { preferPiper: true })
      } finally {
        setLoading(false)
      }
    })()
  }

  function onNext() {
    if (index + 1 >= words.length) {
      setPhase('done')
      clearPracticeSession()
      return
    }
    unlockAudio()
    const nextIndex = index + 1
    setIndex(nextIndex)
    const next = words[nextIndex]
    if (next) void speakWord(next, lang, { preferPiper: true })
  }

  function playAgain() {
    clearPracticeSession()
    setWordOrder(null)
    setRunId((n) => n + 1)
    setIndex(0)
    setPhase('setup')
  }

  if (phase === 'done') {
    return (
      <PracticeFinishScreen
        kind="paper"
        total={words.length}
        onPlayAgain={playAgain}
        playAgainLabel={t('practice.paperAgain')}
      />
    )
  }

  if (phase === 'setup') {
    return (
      <main className="page practice-page gate-screen gate-screen--paper">
        <div
          className="gate-screen__card gate-screen--paper"
          role="region"
          aria-labelledby="paper-dictation-title"
        >
          <h2 id="paper-dictation-title" className="gate-screen__title">
            {t('practice.paperTitle')}
          </h2>
          <p className="gate-screen__lead">
            {loading
              ? t('practice.voiceLoadingHint')
              : t('practice.paperSetupLead', { count: sourceWords.length })}
          </p>
          <p className="gate-screen__order-hint muted">{t('practice.paperSetupHint')}</p>

          <div className={`gate-screen__visual ${loading ? 'gate-screen__visual--busy' : ''}`.trim()} aria-hidden>
            <span className="gate-screen__ring gate-screen__ring--outer" />
            <span className="gate-screen__ring gate-screen__ring--inner" />
            <span className="gate-screen__icon gate-screen__icon--paper" aria-hidden>
              📝
            </span>
          </div>

          <label className="settings-toggle gate-screen__order">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShufflePref(e.target.checked)}
            />
            <span className="settings-toggle__label">{t('practice.paperShuffleToggle')}</span>
          </label>
          {!shuffle ? (
            <p className="gate-screen__order-hint muted">{t('practice.paperOrderListHint')}</p>
          ) : null}

          <button
            type="button"
            className="btn btn--primary btn--large gate-screen__btn"
            onClick={onStart}
            disabled={loading || sourceWords.length === 0}
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

  const isLast = index + 1 >= words.length
  const nextLabel = isLast ? t('practice.paperDone') : t('practice.paperNext')

  return (
    <main className="page practice-page paper-dictation">
      <h2 className="page-title">{t('practice.paperTitle')}</h2>
      <p className="muted">{t('practice.progress', { current: index + 1, total: words.length })}</p>
      <p className="paper-dictation__hint muted">{t('practice.paperActiveHint')}</p>

      <div className="practice-card paper-dictation__card">
        <p className="practice-prompt" aria-hidden>
          <ListenIcon size="lg" />
        </p>
        <p className="sr-only">{t('practice.paperWordA11y', { current: index + 1 })}</p>

        <div className="practice-actions">
          <ListenAgainButton word={current} lang={lang} />
        </div>

        <button type="button" className="btn btn--primary btn--block" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </main>
  )
}
