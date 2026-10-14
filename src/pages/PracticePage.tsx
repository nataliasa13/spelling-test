import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getWordsForLang } from '../config/languages'
import { useAppState } from '../context/AppState'
import { answersMatch } from '../lib/words'
import { ListenAgainButton, ListenIcon } from '../components/ListenAgainButton'
import { speakWord } from '../lib/speech'
import {
  buildMistakeReviewWords,
  challengeThreshold,
  challengeUnlocked,
  getWordProgress,
  isOftenMissedWord,
  markMissionComplete,
  recordAttempt,
} from '../lib/progress'
import { LiveLetterFeedback } from '../components/LiveLetterFeedback'
import { MinigamePlayer } from '../components/MinigamePlayer'
import { loadLiveLetterHint } from '../lib/storage'
import { PaperDictationPlayer } from '../components/PaperDictationPlayer'
import { SectionListenGate } from '../components/SectionListenGate'
import { PracticeFinishScreen } from '../components/PracticeFinishScreen'
import { buildFreeMinigameRounds, buildWarmupRounds } from '../lib/minigames'
import type { PracticeMode, SpellingLang } from '../types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function PracticePage() {
  const { mode: modeParam } = useParams<{ mode: string }>()
  const mode = (modeParam as PracticeMode) || 'mission'
  const { t } = useTranslation()
  const { week, progress, setProgress, practiceLang } = useAppState()

  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'idle' | 'ok' | 'bad'>('idle')
  const [showWord, setShowWord] = useState(false)
  const [finished, setFinished] = useState(false)
  const [score, setScore] = useState(0)
  const [missionPhase, setMissionPhase] = useState<'warmup' | 'dictation'>('warmup')
  const [freeActivity, setFreeActivity] = useState<'pick' | 'dictation' | 'minigames'>('pick')
  const [minigameRun, setMinigameRun] = useState(0)
  const [freeMinigamesDone, setFreeMinigamesDone] = useState(false)
  const [dictationStarted, setDictationStarted] = useState(false)
  const mistakeWordsSessionRef = useRef<{ key: string; words: string[] } | null>(null)

  useEffect(() => {
    setDictationStarted(false)
  }, [mode, practiceLang, missionPhase, freeActivity])

  useEffect(() => {
    return () => {
      mistakeWordsSessionRef.current = null
    }
  }, [])

  const words = useMemo(() => {
    if (!week || !practiceLang) return []
    const list = getWordsForLang(week, practiceLang)
    if (mode === 'mistakes') {
      const sessionKey = `mistakes:${practiceLang}:${week.weekLabel}`
      const cached = mistakeWordsSessionRef.current
      if (cached?.key === sessionKey) return cached.words
      const built = shuffle(buildMistakeReviewWords(progress, practiceLang, list))
      mistakeWordsSessionRef.current = { key: sessionKey, words: built }
      return built
    }
    mistakeWordsSessionRef.current = null
    return shuffle(list)
  }, [week, practiceLang, mode]) // eslint-disable-line react-hooks/exhaustive-deps -- progress al abrir sesión de repaso

  const warmupRounds = useMemo(() => {
    if (!week || !practiceLang || mode !== 'mission') return []
    const list = getWordsForLang(week, practiceLang)
    const candidates = shuffle(
      list.filter((w) => !getWordProgress(progress, practiceLang, w).mastered),
    ).slice(0, 3)
    return buildWarmupRounds(candidates)
  }, [week, practiceLang, mode, progress])

  useEffect(() => {
    if (mode !== 'mission') {
      setMissionPhase('dictation')
      return
    }
    setMissionPhase(warmupRounds.length > 0 ? 'warmup' : 'dictation')
  }, [mode, warmupRounds.length, practiceLang])

  useEffect(() => {
    if (mode === 'free') {
      setFreeActivity('pick')
      setFreeMinigamesDone(false)
    }
  }, [mode, practiceLang])

  const freeMinigameRounds = useMemo(() => {
    if (!week || !practiceLang || mode !== 'free') return []
    return buildFreeMinigameRounds(getWordsForLang(week, practiceLang))
  }, [week, practiceLang, mode, minigameRun])

  if (!week) return <Navigate to="/" replace />
  if (!practiceLang) return <Navigate to="/" replace />
  if (!['mission', 'free', 'challenge', 'mistakes', 'paper'].includes(mode)) {
    return <Navigate to="/" replace />
  }

  if (mode === 'paper') {
    return (
      <PaperDictationPlayer lang={practiceLang} words={getWordsForLang(week, practiceLang)} />
    )
  }

  const titleKey =
    mode === 'mission'
      ? 'practice.missionTitle'
      : mode === 'free'
        ? 'practice.freeTitle'
        : mode === 'mistakes'
          ? 'practice.mistakesTitle'
          : 'practice.challengeTitle'
  const activeLang: SpellingLang = practiceLang
  const langWords = getWordsForLang(week, activeLang)

  if (mode === 'mistakes' && words.length === 0) {
    return (
      <main className="page card card--center">
        <h2 className="page-title">{t('practice.mistakesTitle')}</h2>
        <p className="muted">{t('practice.mistakesEmpty')}</p>
        <div className="btn-row">
          <Link to="/" className="btn btn--primary">
            {t('nav.home')}
          </Link>
          <Link to="/words#word-mistakes" className="btn">
            {t('practice.mistakesViewList')}
          </Link>
        </div>
      </main>
    )
  }

  if (
    mode === 'challenge' &&
    !challengeUnlocked(progress, activeLang, langWords)
  ) {
    return (
      <main className="page card card--center">
        <h2 className="page-title">{t('practice.challengeTitle')}</h2>
        <p className="muted">
          {t('home.dareLocked', { need: challengeThreshold(langWords.length) })}
        </p>
        <p className="muted">{t('practice.challengeLockedHint')}</p>
        <a href="/" className="btn btn--primary">
          {t('nav.home')}
        </a>
      </main>
    )
  }

  if (mode === 'mission' && missionPhase === 'warmup' && warmupRounds.length > 0) {
    return (
      <MinigamePlayer
        variant="warmup"
        rounds={warmupRounds}
        lang={activeLang}
        onComplete={() => setMissionPhase('dictation')}
      />
    )
  }

  if (mode === 'free' && freeActivity === 'pick') {
    const count =
      activeLang === 'english' ? week.english.length : week.spanish.length
    return (
      <main className="page">
        <h2 className="page-title">{t('practice.freeTitle')}</h2>
        <p className="muted">{t('practice.freePickSubtitle', { count })}</p>
        <div className="activity-grid">
          <button
            type="button"
            className="activity-choice activity-choice--free"
            onClick={() => setFreeActivity('dictation')}
          >
            <span className="activity-choice__icon" aria-hidden>
              ✏️
            </span>
            <span className="activity-choice__body">
              <span className="activity-choice__title">{t('practice.freePickDictation')}</span>
              <span className="activity-choice__sub">{t('practice.freePickDictationSub')}</span>
            </span>
            <span className="activity-choice__go" aria-hidden>
              →
            </span>
          </button>
          <button
            type="button"
            className="activity-choice activity-choice--minigames"
            onClick={() => {
              setFreeMinigamesDone(false)
              setMinigameRun((n) => n + 1)
              setFreeActivity('minigames')
            }}
          >
            <span className="activity-choice__icon" aria-hidden>
              🎮
            </span>
            <span className="activity-choice__body">
              <span className="activity-choice__title">{t('practice.freePickMinigames')}</span>
              <span className="activity-choice__sub">{t('practice.freePickMinigamesSub')}</span>
            </span>
            <span className="activity-choice__go" aria-hidden>
              →
            </span>
          </button>
        </div>
        <p className="muted free-pick-hint">{t('practice.warmupHint')}</p>
      </main>
    )
  }

  if (mode === 'free' && freeActivity === 'minigames' && !freeMinigamesDone) {
    return (
      <MinigamePlayer
        variant="free"
        rounds={freeMinigameRounds}
        lang={activeLang}
        onComplete={() => setFreeMinigamesDone(true)}
      />
    )
  }

  if (mode === 'free' && freeActivity === 'minigames' && freeMinigamesDone) {
    return (
      <PracticeFinishScreen
        kind="minigames"
        onPlayAgain={() => {
          setFreeMinigamesDone(false)
          setMinigameRun((n) => n + 1)
        }}
        playAgainLabel={t('practice.minigamesAgain')}
      />
    )
  }

  const current = words[index]

  const allowPeek = mode !== 'challenge'
  const allowRetrySame = mode === 'free' || mode === 'mistakes' || feedback === 'bad'

  const currentProgress = getWordProgress(progress, activeLang, current)
  const masteredBefore = currentProgress.mastered
  const showPeekHint = mode === 'mission' && !masteredBefore
  const showOftenMissedBadge =
    mode !== 'mistakes' && isOftenMissedWord(currentProgress)

  function onPeek() {
    setShowWord(true)
    window.setTimeout(() => setShowWord(false), 2000)
  }

  function checkAnswer() {
    const ok = answersMatch(input, current, activeLang)
    setFeedback(ok ? 'ok' : 'bad')
    const nextProgress = recordAttempt(
      progress,
      activeLang,
      current,
      ok,
      mode,
      ok ? undefined : input,
    )
    setProgress(nextProgress)
    if (ok) setScore((s) => s + 1)

    if (ok) {
      speakWord(current, activeLang, { preferPiper: true })
    }
  }

  function goNext() {
    if (index + 1 >= words.length) {
      if (mode === 'mission') {
        setProgress(markMissionComplete(progress))
      }
      setFinished(true)
      return
    }
    setIndex((i) => i + 1)
    setInput('')
    setFeedback('idle')
    speakWord(words[index + 1], activeLang, { preferPiper: true })
  }

  if (finished) {
    const total = words.length
    let medal = t('practice.medalBronze')
    if (score >= total) medal = t('practice.medalGold', { total })
    else if (score >= total - 2) medal = t('practice.medalSilver')

    const missionStreak =
      mode === 'mission' ? markMissionComplete(progress).missionStreak : progress.missionStreak

    return (
      <PracticeFinishScreen
        kind={mode}
        score={score}
        total={total}
        medalLine={mode === 'challenge' ? medal : undefined}
        missionStreak={missionStreak}
      />
    )
  }

  if (!current) return null

  const liveLetterHint = loadLiveLetterHint()

  if (!dictationStarted) {
    return (
      <SectionListenGate
        lang={activeLang}
        word={current}
        title={t(titleKey)}
        variant="dictation"
        onStart={() => setDictationStarted(true)}
      />
    )
  }

  return (
    <main className="page practice-page">
      <h2 className="page-title">{t(titleKey)}</h2>
      {mode === 'mission' && warmupRounds.length > 0 && (
        <p className="warmup-badge warmup-badge--inline">{t('practice.dictationPhase')}</p>
      )}
      {mode === 'mistakes' && (
        <p className="muted mistakes-practice-lead">{t('practice.mistakesSubtitle')}</p>
      )}
      {showOftenMissedBadge && (
        <p className="practice-tricky-badge" role="status">
          <span aria-hidden>✏️ </span>
          {t('practice.oftenMissedBadge')}
        </p>
      )}
      <p className="muted">{t('practice.progress', { current: index + 1, total: words.length })}</p>

      <div className="practice-card">
        {showWord ? (
          <p className="peek-word">{current}</p>
        ) : (
          <p className="practice-prompt" aria-hidden>
            <ListenIcon size="lg" />
          </p>
        )}

        <div className="practice-actions">
          <ListenAgainButton word={current} lang={activeLang} />
          {allowPeek && showPeekHint && (
            <button type="button" className="btn btn--ghost" onClick={onPeek}>
              {t('practice.peek')}
            </button>
          )}
        </div>

        <input
          className="practice-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('practice.typePlaceholder')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && feedback === 'idle') checkAnswer()
            if (e.key === 'Enter' && feedback === 'ok') goNext()
          }}
        />

        {liveLetterHint && feedback === 'idle' && mode !== 'challenge' && (
          <LiveLetterFeedback typed={input} expected={current} lang={activeLang} />
        )}

        {feedback === 'idle' && (
          <button type="button" className="btn btn--primary btn--block" onClick={checkAnswer}>
            {t('practice.submit')}
          </button>
        )}
        {feedback === 'ok' && (
          <>
            <p className="feedback feedback--ok">{t('practice.correct')}</p>
            <button type="button" className="btn btn--primary btn--block" onClick={goNext}>
              {index + 1 >= words.length ? t('practice.finish') : t('practice.next')}
            </button>
          </>
        )}
        {feedback === 'bad' && (
          <>
            <p className="feedback feedback--bad">
              {mode === 'free' || mode === 'mistakes'
                ? t('practice.tryAgain')
                : t('practice.almost', { word: current })}
            </p>
            {allowRetrySame ? (
              <button
                type="button"
                className="btn btn--block"
                onClick={() => {
                  setFeedback('idle')
                  setInput('')
                }}
              >
                {t('practice.tryAgain')}
              </button>
            ) : (
              <button type="button" className="btn btn--primary btn--block" onClick={goNext}>
                {t('practice.next')}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  )
}
