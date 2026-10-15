import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getWordsForLang } from '../config/languages'
import { useAppState } from '../context/AppState'
import { usePracticeBack } from '../context/PracticeBackContext'
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
  topCommonWrongSpellings,
} from '../lib/progress'
import { LiveLetterFeedback } from '../components/LiveLetterFeedback'
import { MinigamePlayer } from '../components/MinigamePlayer'
import { loadLiveLetterHint } from '../lib/storage'
import { PaperDictationPlayer } from '../components/PaperDictationPlayer'
import { SectionListenGate } from '../components/SectionListenGate'
import { PracticeFinishScreen } from '../components/PracticeFinishScreen'
import {
  buildFreeMinigameRounds,
  buildWarmupRounds,
  pickMissionWarmupWords,
  type MinigamePlayMode,
} from '../lib/minigames'
import type { PracticeMode, SpellingLang } from '../types'

type DictationSession = 'pick' | 'practice' | 'exam'

function dictationPlayMode(session: DictationSession): 'free' | 'challenge' | null {
  if (session === 'practice') return 'free'
  if (session === 'exam') return 'challenge'
  return null
}

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
  const practiceBackCtx = usePracticeBack()

  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'idle' | 'ok' | 'bad'>('idle')
  const [showWord, setShowWord] = useState(false)
  const [finished, setFinished] = useState(false)
  const [score, setScore] = useState(0)
  const [missionPhase, setMissionPhase] = useState<'warmup' | 'dictation'>('warmup')
  const [dictationSession, setDictationSession] = useState<DictationSession>('pick')
  const [minigameRun, setMinigameRun] = useState(0)
  const [minigameSession, setMinigameSession] = useState<'pick' | 'play'>('pick')
  const [minigamePlayMode, setMinigamePlayMode] = useState<MinigamePlayMode>('mix')
  const [freeMinigamesDone, setFreeMinigamesDone] = useState(false)
  const [dictationStarted, setDictationStarted] = useState(false)
  const [missionAudioReady, setMissionAudioReady] = useState(false)
  const mistakeWordsSessionRef = useRef<{ key: string; words: string[] } | null>(null)

  useEffect(() => {
    setDictationStarted(false)
  }, [mode, practiceLang, missionPhase, dictationSession])

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

  const minigameRoundOptions = useMemo(() => {
    if (!practiceLang) return undefined
    return {
      lang: practiceLang,
      priorWrongForWord: (word: string) =>
        topCommonWrongSpellings(getWordProgress(progress, practiceLang, word), practiceLang, 2).map(
          (e) => e.spelling,
        ),
    }
  }, [progress, practiceLang])

  const warmupRounds = useMemo(() => {
    if (!week || !practiceLang || mode !== 'mission') return []
    const list = getWordsForLang(week, practiceLang)
    const candidates = pickMissionWarmupWords(list, (w) =>
      getWordProgress(progress, practiceLang, w).mastered,
    )
    return buildWarmupRounds(candidates, minigameRoundOptions)
  }, [week, practiceLang, mode, progress, minigameRoundOptions])

  useEffect(() => {
    if (mode !== 'mission') {
      setMissionPhase('dictation')
      return
    }
    setMissionPhase(warmupRounds.length > 0 ? 'warmup' : 'dictation')
  }, [mode, warmupRounds.length, practiceLang])

  useEffect(() => {
    if (mode === 'mission') {
      setMissionAudioReady(false)
      setDictationStarted(false)
    }
  }, [mode, practiceLang])

  useEffect(() => {
    if (mode === 'dictation') setDictationSession('pick')
    if (mode === 'minigames') {
      setMinigameSession('pick')
      setFreeMinigamesDone(false)
    }
  }, [mode, practiceLang])

  useEffect(() => {
    if (mode !== 'dictation' || dictationSession === 'pick') return
    setIndex(0)
    setInput('')
    setFeedback('idle')
    setFinished(false)
    setScore(0)
    setShowWord(false)
  }, [mode, dictationSession])

  const freeMinigameRounds = useMemo(() => {
    if (!week || !practiceLang || mode !== 'minigames' || minigameSession !== 'play') {
      return []
    }
    return buildFreeMinigameRounds(
      getWordsForLang(week, practiceLang),
      minigamePlayMode,
      minigameRoundOptions,
    )
  }, [
    week,
    practiceLang,
    mode,
    minigameRun,
    minigamePlayMode,
    minigameSession,
    minigameRoundOptions,
  ])

  function startMinigame(playMode: MinigamePlayMode) {
    setMinigamePlayMode(playMode)
    setMinigameSession('play')
    setFreeMinigamesDone(false)
    setMinigameRun((n) => n + 1)
  }

  function resetDictationPlayState() {
    setIndex(0)
    setInput('')
    setFeedback('idle')
    setFinished(false)
    setScore(0)
    setShowWord(false)
    setDictationStarted(false)
  }

  function backToDictationPick() {
    setDictationSession('pick')
    resetDictationPlayState()
  }

  function backToMinigamePick() {
    setMinigameSession('pick')
    setFreeMinigamesDone(false)
  }

  useEffect(() => {
    const ctx = practiceBackCtx
    if (!ctx) return

    if (mode === 'dictation' && dictationSession !== 'pick') {
      ctx.setHandler(() => backToDictationPick())
    } else if (mode === 'minigames' && minigameSession === 'play') {
      ctx.setHandler(() => backToMinigamePick())
    } else {
      ctx.setHandler(null)
    }

    return () => ctx.setHandler(null)
  }, [mode, dictationSession, minigameSession, practiceBackCtx])

  if (!week) return <Navigate to="/" replace />
  if (!practiceLang) return <Navigate to="/" replace />
  if (mode === 'free') return <Navigate to="/practice/dictation" replace />
  if (
    !['mission', 'free', 'challenge', 'mistakes', 'paper', 'dictation', 'minigames'].includes(
      mode,
    )
  ) {
    return <Navigate to="/" replace />
  }

  const dictationPlay = dictationPlayMode(dictationSession)
  const playMode: PracticeMode =
    mode === 'dictation' && dictationPlay ? dictationPlay : mode

  if (mode === 'paper') {
    return (
      <PaperDictationPlayer lang={practiceLang} words={getWordsForLang(week, practiceLang)} />
    )
  }

  const titleKey =
    playMode === 'mission'
      ? 'practice.missionTitle'
      : playMode === 'free'
        ? 'practice.freeTitle'
        : playMode === 'mistakes'
          ? 'practice.mistakesTitle'
          : playMode === 'challenge'
            ? 'practice.challengeTitle'
            : mode === 'minigames'
              ? 'practice.minigamesTitle'
              : 'practice.dictationTitle'
  const activeLang: SpellingLang = practiceLang
  const langWords = getWordsForLang(week, activeLang)
  const examUnlocked = challengeUnlocked(progress, activeLang, langWords)
  const examNeed = challengeThreshold(langWords.length)
  const masteredCount = langWords.filter(
    (w) => getWordProgress(progress, activeLang, w).mastered,
  ).length

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

  if (mode === 'mission' && !missionAudioReady) {
    const warmupFirst = warmupRounds[0]?.word
    const dictationFirst = words[0]
    return (
      <SectionListenGate
        lang={activeLang}
        word={warmupFirst ?? dictationFirst}
        title={t('practice.missionTitle')}
        subtitle={t('practice.missionGateSubtitle')}
        variant="dictation"
        onStart={() => {
          setMissionAudioReady(true)
          if (warmupFirst) {
            void speakWord(warmupFirst, activeLang, { preferPiper: true })
            return
          }
          setDictationStarted(true)
          if (dictationFirst) {
            void speakWord(dictationFirst, activeLang, { preferPiper: true })
          }
        }}
      />
    )
  }

  if (mode === 'mission' && missionPhase === 'warmup' && warmupRounds.length > 0) {
    return (
      <MinigamePlayer
        variant="warmup"
        rounds={warmupRounds}
        lang={activeLang}
        skipInitialGate
        onComplete={() => {
          setMissionPhase('dictation')
          setDictationStarted(true)
          const first = words[0]
          if (first) void speakWord(first, activeLang, { preferPiper: true })
        }}
      />
    )
  }

  if (mode === 'dictation' && dictationSession === 'pick') {
    const count =
      activeLang === 'english' ? week.english.length : week.spanish.length
    return (
      <main className="page">
        <h2 className="page-title">{t('practice.dictationTitle')}</h2>
        <p className="muted">{t('practice.dictationPickSubtitle', { count })}</p>
        <div className="activity-grid">
          <button
            type="button"
            className="activity-choice activity-choice--free"
            onClick={() => setDictationSession('practice')}
          >
            <span className="activity-choice__icon" aria-hidden>
              🎯
            </span>
            <span className="activity-choice__body">
              <span className="activity-choice__title">{t('practice.dictationPickPractice')}</span>
              <span className="activity-choice__sub">{t('practice.freeSubtitle', { count })}</span>
            </span>
            <span className="activity-choice__go" aria-hidden>
              →
            </span>
          </button>
          {examUnlocked ? (
            <button
              type="button"
              className="activity-choice activity-choice--dare"
              onClick={() => setDictationSession('exam')}
            >
              <span className="activity-choice__icon" aria-hidden>
                🚀
              </span>
              <span className="activity-choice__body">
                <span className="activity-choice__title">{t('practice.challengeTitle')}</span>
                <span className="activity-choice__sub">
                  {t('practice.challengeSubtitle', { count })}
                </span>
              </span>
              <span className="activity-choice__go" aria-hidden>
                →
              </span>
            </button>
          ) : (
            <div
              className="activity-choice activity-choice--dare activity-choice--locked"
              aria-disabled="true"
              aria-label={t('home.dareLockedA11y', {
                mastered: masteredCount,
                need: examNeed,
              })}
            >
              <span className="activity-choice__icon activity-choice__icon--locked" aria-hidden>
                🔒
              </span>
              <span className="activity-choice__body">
                <span className="activity-choice__title-row">
                  <span className="activity-choice__title">{t('practice.challengeTitle')}</span>
                  <span className="activity-choice__lock-badge">{t('home.dareLockedBadge')}</span>
                </span>
                <span className="activity-choice__sub activity-choice__sub--lock">
                  {t('home.dareLocked', { need: examNeed })}
                </span>
              </span>
              <span className="activity-choice__stat activity-choice__stat--lock" aria-hidden>
                {masteredCount}/{examNeed}
              </span>
            </div>
          )}
        </div>
        <p className="muted free-pick-hint">{t('practice.dictationPickHint')}</p>
      </main>
    )
  }

  if (mode === 'minigames' && minigameSession === 'pick') {
    const list = getWordsForLang(week, activeLang)
    return (
      <main className="page">
        <h2 className="page-title">{t('practice.minigamesTitle')}</h2>
        <p className="muted">{t('practice.minigamesPickSubtitle', { count: list.length })}</p>
        <div className="activity-grid">
          <button
            type="button"
            className="activity-choice activity-choice--minigames"
            onClick={() => startMinigame('mix')}
          >
            <span className="activity-choice__icon" aria-hidden>
              🎲
            </span>
            <span className="activity-choice__body">
              <span className="activity-choice__title">{t('practice.minigamesPickMix')}</span>
              <span className="activity-choice__sub">{t('practice.minigamesPickMixSub')}</span>
            </span>
            <span className="activity-choice__go" aria-hidden>
              →
            </span>
          </button>
          <button
            type="button"
            className="activity-choice activity-choice--free"
            onClick={() => startMinigame('blank')}
          >
            <span className="activity-choice__icon" aria-hidden>
              🧩
            </span>
            <span className="activity-choice__body">
              <span className="activity-choice__title">{t('practice.minigamesPickBlank')}</span>
              <span className="activity-choice__sub">{t('practice.minigamesPickBlankSub')}</span>
            </span>
            <span className="activity-choice__go" aria-hidden>
              →
            </span>
          </button>
          <button
            type="button"
            className="activity-choice activity-choice--dictation"
            onClick={() => startMinigame('scramble')}
          >
            <span className="activity-choice__icon" aria-hidden>
              🔤
            </span>
            <span className="activity-choice__body">
              <span className="activity-choice__title">{t('practice.minigamesPickScramble')}</span>
              <span className="activity-choice__sub">
                {t('practice.minigamesPickScrambleSub', { count: list.length })}
              </span>
            </span>
            <span className="activity-choice__go" aria-hidden>
              →
            </span>
          </button>
          <button
            type="button"
            className="activity-choice activity-choice--errors"
            onClick={() => startMinigame('match')}
          >
            <span className="activity-choice__icon" aria-hidden>
              👂
            </span>
            <span className="activity-choice__body">
              <span className="activity-choice__title">{t('practice.minigamesPickMatch')}</span>
              <span className="activity-choice__sub">
                {t('practice.minigamesPickMatchSub', { count: list.length })}
              </span>
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

  if (
    mode === 'minigames' &&
    minigameSession === 'play' &&
    freeMinigameRounds.length === 0
  ) {
    return (
      <main className="page card card--center">
        <h2 className="page-title">{t('practice.minigamesTitle')}</h2>
        <p className="muted">{t('practice.minigamesEmpty')}</p>
        <button type="button" className="btn btn--primary" onClick={() => setMinigameSession('pick')}>
          {t('practice.minigamesPickBack')}
        </button>
      </main>
    )
  }

  if (mode === 'minigames' && minigameSession === 'play' && !freeMinigamesDone) {
    return (
      <MinigamePlayer
        variant="free"
        rounds={freeMinigameRounds}
        lang={activeLang}
        onComplete={() => setFreeMinigamesDone(true)}
      />
    )
  }

  if (mode === 'minigames' && minigameSession === 'play' && freeMinigamesDone) {
    return (
      <PracticeFinishScreen
        kind="minigames"
        onPlayAgain={() => {
          setFreeMinigamesDone(false)
          setMinigameRun((n) => n + 1)
        }}
        playAgainLabel={t('practice.minigamesAgain')}
        onChangeMode={() => setMinigameSession('pick')}
        changeModeLabel={t('practice.minigamesPickBack')}
      />
    )
  }

  const current = words[index]

  const allowPeek = playMode !== 'challenge'
  const allowRetrySame = playMode === 'free' || playMode === 'mistakes' || feedback === 'bad'

  const currentProgress = getWordProgress(progress, activeLang, current)
  const masteredBefore = currentProgress.mastered
  const showPeekHint = playMode === 'mission' && !masteredBefore
  const showOftenMissedBadge =
    playMode !== 'mistakes' && isOftenMissedWord(currentProgress)

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
      playMode,
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
      if (playMode === 'mission') {
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
      playMode === 'mission'
        ? markMissionComplete(progress).missionStreak
        : progress.missionStreak

    return (
      <PracticeFinishScreen
        kind={playMode}
        score={score}
        total={total}
        medalLine={playMode === 'challenge' ? medal : undefined}
        missionStreak={missionStreak}
      />
    )
  }

  if (!current) return null

  const liveLetterHint = loadLiveLetterHint()

  if (!dictationStarted && !(mode === 'mission' && missionAudioReady)) {
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
      {playMode === 'mission' && warmupRounds.length > 0 && (
        <p className="warmup-badge warmup-badge--inline">{t('practice.dictationPhase')}</p>
      )}
      {playMode === 'mistakes' && (
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

        {liveLetterHint && feedback === 'idle' && playMode !== 'challenge' && (
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
              {playMode === 'free' || playMode === 'mistakes'
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
