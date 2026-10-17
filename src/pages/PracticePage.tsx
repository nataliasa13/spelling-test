import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getWordsForLang } from '../config/languages'
import { useAppState } from '../context/AppState'
import { usePracticeBack } from '../context/PracticeBackContext'
import { answersMatch } from '../lib/words'
import { ListenAgainButton, ListenIcon } from '../components/ListenAgainButton'
import { CorrectFeedback } from '../components/CorrectFeedback'
import { TryAgainFeedback } from '../components/TryAgainFeedback'
import { speakCorrectFeedback } from '../lib/correctFeedback'
import { speakTryAgainEncourage } from '../lib/tryAgainFeedback'
import { speakWord } from '../lib/speech'
import { logNavDiag } from '../lib/navDiagnostics'
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
import { MinigamePlayer, type MinigamePersistedState } from '../components/MinigamePlayer'
import { loadLiveLetterHint } from '../lib/storage'
import { PaperDictationPlayer } from '../components/PaperDictationPlayer'
import { SectionListenGate } from '../components/SectionListenGate'
import { PracticeFinishScreen } from '../components/PracticeFinishScreen'
import {
  buildFreeMinigameRounds,
  buildWarmupRounds,
  pickMissionWarmupWords,
  type MinigamePlayMode,
  type WarmupRound,
} from '../lib/minigames'
import {
  clearPracticeSession,
  isSessionActivePayload,
  loadPracticeSession,
  matchesPracticeSessionScope,
  savePracticeSession,
  wordOrderMatchesWeek,
  type DictationSessionKind,
  type MinigameSessionPayload,
  type TypingSessionPayload,
} from '../lib/practiceSession'
import type { PracticeMode, SpellingLang } from '../types'

function dictationPlayMode(session: DictationSessionKind): 'free' | 'challenge' | null {
  if (session === 'practice') return 'free'
  if (session === 'exam') return 'challenge'
  return null
}

/** El sub-estado del dictado va en la URL para que recargas y atrás/adelante caigan en el mismo punto. */
function dictationSessionFromUrl(mode: string, sub: string | undefined): DictationSessionKind {
  if (mode !== 'dictation') return 'pick'
  return sub === 'practice' || sub === 'exam' ? sub : 'pick'
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
  const { mode: modeParam, sub } = useParams<{ mode: string; sub?: string }>()
  const mode = (modeParam as PracticeMode) || 'mission'
  const navigate = useNavigate()
  const dictationSession = dictationSessionFromUrl(mode, sub)
  const setDictationSession = useCallback(
    (next: DictationSessionKind) => {
      navigate(next === 'pick' ? '/practice/dictation' : `/practice/dictation/${next}`, {
        replace: true,
      })
    },
    [navigate],
  )
  const { t } = useTranslation()
  const { week, progress, setProgress, practiceLang, childName } = useAppState()
  const practiceBackSetHandler = usePracticeBack()?.setHandler

  const savedRef = useRef<
    | {
        typing: TypingSessionPayload | null
        minigame: MinigameSessionPayload | null
      }
    | undefined
  >(undefined)
  if (savedRef.current === undefined) {
    if (week && practiceLang) {
      const s = loadPracticeSession()
      const ok = s && matchesPracticeSessionScope(s, week, practiceLang, mode)
      const typingOk =
        ok &&
        s.payload.type === 'typing' &&
        (mode !== 'dictation' || s.payload.dictationSession === dictationSession)
      savedRef.current = {
        typing: typingOk && s.payload.type === 'typing' ? s.payload : null,
        minigame: ok && s.payload.type === 'minigame' ? s.payload : null,
      }
    } else {
      savedRef.current = { typing: null, minigame: null }
    }
  }
  const typingSaved = savedRef.current.typing
  const miniSaved = savedRef.current.minigame

  const progressAtOpenRef = useRef(progress)

  const [wordOrder, setWordOrder] = useState<string[] | null>(() => {
    if (
      typingSaved?.wordOrder &&
      week &&
      practiceLang &&
      wordOrderMatchesWeek(typingSaved.wordOrder, week, practiceLang)
    ) {
      return typingSaved.wordOrder
    }
    return null
  })
  const [index, setIndex] = useState(typingSaved?.index ?? 0)
  const [input, setInput] = useState(typingSaved?.input ?? '')
  const [feedback, setFeedback] = useState<'idle' | 'ok' | 'bad'>(typingSaved?.feedback ?? 'idle')
  const practiceInputRef = useRef<HTMLInputElement>(null)
  const [showWord, setShowWord] = useState(false)
  const [finished, setFinished] = useState(typingSaved?.finished ?? false)
  const [score, setScore] = useState(typingSaved?.score ?? 0)
  const [missionPhase, setMissionPhase] = useState<'warmup' | 'dictation'>(
    typingSaved?.missionPhase ?? 'warmup',
  )
  const [minigameRun, setMinigameRun] = useState(miniSaved?.minigameRun ?? 0)
  const [minigameSession, setMinigameSession] = useState<'pick' | 'play'>(
    miniSaved?.minigameSession ?? 'pick',
  )
  const [minigamePlayMode, setMinigamePlayMode] = useState<MinigamePlayMode>(
    miniSaved?.minigamePlayMode ?? 'mix',
  )
  const [freeMinigamesDone, setFreeMinigamesDone] = useState(miniSaved?.freeMinigamesDone ?? false)
  const [dictationStarted, setDictationStarted] = useState(typingSaved?.dictationStarted ?? false)
  const [missionAudioReady, setMissionAudioReady] = useState(
    typingSaved?.missionAudioReady ?? false,
  )
  const [pinnedWarmupRounds, setPinnedWarmupRounds] = useState<WarmupRound[] | null>(
    miniSaved?.variant === 'warmup' ? miniSaved.rounds : null,
  )
  const [pinnedFreeRounds, setPinnedFreeRounds] = useState<WarmupRound[] | null>(
    miniSaved?.variant === 'free' ? miniSaved.rounds : null,
  )
  const [minigameLive, setMinigameLive] = useState<MinigamePersistedState>(() => ({
    index: miniSaved?.index ?? 0,
    feedback: miniSaved?.feedback ?? 'idle',
    started: miniSaved?.started ?? false,
  }))
  const handleMinigamePersist = useCallback((state: MinigamePersistedState) => {
    setMinigameLive(state)
  }, [])

  useEffect(() => {
    logNavDiag('practice-mount', {
      restored: !!(typingSaved || miniSaved),
      index: typingSaved?.index,
    })
  }, [])

  const prevPracticeLangRef = useRef(practiceLang)
  const prevDictationSessionRef = useRef(dictationSession)
  const prevModeRef = useRef(mode)

  function applyTypingRestore(payload: TypingSessionPayload) {
    if (
      week &&
      practiceLang &&
      wordOrderMatchesWeek(payload.wordOrder, week, practiceLang)
    ) {
      setWordOrder(payload.wordOrder)
    } else {
      setWordOrder(null)
    }
    setIndex(payload.index)
    setInput(payload.input)
    setFeedback(payload.feedback)
    setScore(payload.score)
    setFinished(payload.finished)
    setDictationStarted(payload.dictationStarted)
    setMissionPhase(payload.missionPhase)
    setMissionAudioReady(payload.missionAudioReady)
  }

  function applyMinigameRestore(payload: MinigameSessionPayload) {
    setMinigameRun(payload.minigameRun)
    setMinigameSession(payload.minigameSession)
    setMinigamePlayMode(payload.minigamePlayMode)
    setFreeMinigamesDone(payload.freeMinigamesDone)
    setMinigameLive({
      index: payload.index,
      feedback: payload.feedback,
      started: payload.started,
    })
    if (payload.variant === 'warmup') setPinnedWarmupRounds(payload.rounds)
    if (payload.variant === 'free') setPinnedFreeRounds(payload.rounds)
  }

  useEffect(() => {
    if (prevModeRef.current === mode) return
    prevModeRef.current = mode
    prevDictationSessionRef.current = dictationSession

    if (!week || !practiceLang) return
    const s = loadPracticeSession()
    if (s && matchesPracticeSessionScope(s, week, practiceLang, mode)) {
      if (
        s.payload.type === 'typing' &&
        (mode !== 'dictation' || s.payload.dictationSession === dictationSession)
      ) {
        applyTypingRestore(s.payload)
        return
      }
      if (s.payload.type === 'minigame') {
        applyMinigameRestore(s.payload)
        return
      }
    }

    // Sin borrar la sesión guardada: un atrás/adelante a otro modo no debe perder el progreso.
    setWordOrder(null)
    setIndex(0)
    setInput('')
    setFeedback('idle')
    setFinished(false)
    setScore(0)
    setShowWord(false)
    setDictationStarted(false)
    setMissionAudioReady(false)
    setMissionPhase('warmup')
    setMinigameSession('pick')
    setFreeMinigamesDone(false)
    setPinnedWarmupRounds(null)
    setPinnedFreeRounds(null)
    setMinigameLive({ index: 0, feedback: 'idle', started: false })
  }, [mode, week, practiceLang])

  useEffect(() => {
    if (!week || !practiceLang || wordOrder?.length) return
    const list = getWordsForLang(week, practiceLang)
    if (mode === 'mistakes') {
      setWordOrder(
        shuffle(buildMistakeReviewWords(progressAtOpenRef.current, practiceLang, list)),
      )
      return
    }
    setWordOrder(shuffle(list))
  }, [week, practiceLang, mode, wordOrder])

  const words = useMemo(() => {
    if (!wordOrder?.length) return []
    return wordOrder
  }, [wordOrder])

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
    if (pinnedWarmupRounds) return pinnedWarmupRounds
    if (!week || !practiceLang || mode !== 'mission') return []
    const list = getWordsForLang(week, practiceLang)
    const candidates = pickMissionWarmupWords(list, (w) =>
      getWordProgress(progress, practiceLang, w).mastered,
    )
    return buildWarmupRounds(candidates, minigameRoundOptions)
  }, [pinnedWarmupRounds, week, practiceLang, mode, progress, minigameRoundOptions])

  useEffect(() => {
    if (mode !== 'mission' || pinnedWarmupRounds) return
    if (!week || !practiceLang) return
    const list = getWordsForLang(week, practiceLang)
    const candidates = pickMissionWarmupWords(list, (w) =>
      getWordProgress(progress, practiceLang, w).mastered,
    )
    const built = buildWarmupRounds(candidates, minigameRoundOptions)
    if (built.length > 0) setPinnedWarmupRounds(built)
  }, [mode, pinnedWarmupRounds, week, practiceLang, progress, minigameRoundOptions])

  useEffect(() => {
    if (mode !== 'mission') {
      setMissionPhase('dictation')
      return
    }
    setMissionPhase((prev) => {
      if (prev === 'dictation') return prev
      return warmupRounds.length > 0 ? 'warmup' : 'dictation'
    })
  }, [mode, warmupRounds.length, practiceLang])

  useEffect(() => {
    if (prevPracticeLangRef.current === practiceLang) return
    prevPracticeLangRef.current = practiceLang
    clearPracticeSession()
    setWordOrder(null)
    setPinnedWarmupRounds(null)
    setPinnedFreeRounds(null)
    if (mode === 'mission') {
      setMissionAudioReady(false)
      setDictationStarted(false)
    }
    if (mode === 'dictation') setDictationSession('pick')
    if (mode === 'minigames') {
      setMinigameSession('pick')
      setFreeMinigamesDone(false)
    }
  }, [mode, practiceLang, setDictationSession])

  useEffect(() => {
    if (mode !== 'dictation') return
    if (prevDictationSessionRef.current === dictationSession) return
    const wasPick = prevDictationSessionRef.current === 'pick'
    prevDictationSessionRef.current = dictationSession
    if (wasPick && dictationSession !== 'pick') {
      setIndex(0)
      setInput('')
      setFeedback('idle')
      setFinished(false)
      setScore(0)
      setShowWord(false)
      setDictationStarted(false)
    }
  }, [mode, dictationSession])

  const freeMinigameRounds = useMemo(() => {
    if (pinnedFreeRounds) return pinnedFreeRounds
    if (!week || !practiceLang || mode !== 'minigames' || minigameSession !== 'play') {
      return []
    }
    return buildFreeMinigameRounds(
      getWordsForLang(week, practiceLang),
      minigamePlayMode,
      minigameRoundOptions,
    )
  }, [
    pinnedFreeRounds,
    week,
    practiceLang,
    mode,
    minigameRun,
    minigamePlayMode,
    minigameSession,
    minigameRoundOptions,
  ])

  useEffect(() => {
    if (mode !== 'minigames' || minigameSession !== 'play' || pinnedFreeRounds) return
    if (!week || !practiceLang) return
    const built = buildFreeMinigameRounds(
      getWordsForLang(week, practiceLang),
      minigamePlayMode,
      minigameRoundOptions,
    )
    if (built.length > 0) setPinnedFreeRounds(built)
  }, [
    mode,
    minigameSession,
    pinnedFreeRounds,
    week,
    practiceLang,
    minigameRun,
    minigamePlayMode,
    minigameRoundOptions,
  ])

  useEffect(() => {
    if (!week || !practiceLang || mode === 'paper') return

    // En las pantallas de elegir no se guarda ni se borra: solo las acciones explícitas borran.
    if (mode === 'dictation' && dictationSession === 'pick') return
    if (mode === 'minigames' && minigameSession === 'pick') return
    if (finished) {
      clearPracticeSession()
      return
    }

    let payload: TypingSessionPayload | MinigameSessionPayload | null = null

    if (
      mode === 'minigames' &&
      minigameSession === 'play' &&
      pinnedFreeRounds &&
      pinnedFreeRounds.length > 0
    ) {
      payload = {
        type: 'minigame',
        variant: 'free',
        rounds: pinnedFreeRounds,
        index: minigameLive.index,
        feedback: minigameLive.feedback,
        started: minigameLive.started,
        minigameSession,
        minigamePlayMode,
        minigameRun,
        freeMinigamesDone,
      }
    } else if (
      mode === 'mission' &&
      missionPhase === 'warmup' &&
      missionAudioReady &&
      pinnedWarmupRounds &&
      pinnedWarmupRounds.length > 0
    ) {
      payload = {
        type: 'minigame',
        variant: 'warmup',
        rounds: pinnedWarmupRounds,
        index: minigameLive.index,
        feedback: minigameLive.feedback,
        started: minigameLive.started,
        minigameSession: 'play',
        minigamePlayMode: 'mix',
        minigameRun: 0,
        freeMinigamesDone: false,
      }
    } else if (wordOrder?.length) {
      const typingModes: PracticeMode[] = ['mission', 'dictation', 'challenge', 'mistakes']
      const inDictationPlay = mode === 'dictation' && dictationSession !== 'pick'
      if (typingModes.includes(mode) && (mode !== 'dictation' || inDictationPlay)) {
        payload = {
          type: 'typing',
          wordOrder,
          index,
          input,
          feedback,
          score,
          finished,
          dictationStarted,
          missionPhase,
          missionAudioReady,
          dictationSession: mode === 'dictation' ? dictationSession : 'pick',
        }
      }
    }

    if (!payload) return

    savePracticeSession({
      v: 1,
      weekLabel: week.weekLabel,
      publishedAt: week.publishedAt,
      lang: practiceLang,
      routeMode: mode,
      active: isSessionActivePayload(payload),
      payload,
    })
  }, [
    week,
    practiceLang,
    mode,
    dictationSession,
    minigameSession,
    finished,
    wordOrder,
    index,
    input,
    feedback,
    score,
    dictationStarted,
    missionPhase,
    missionAudioReady,
    pinnedFreeRounds,
    pinnedWarmupRounds,
    minigameLive,
    minigamePlayMode,
    minigameRun,
    freeMinigamesDone,
  ])

  function startMinigame(playMode: MinigamePlayMode) {
    setPinnedFreeRounds(null)
    setMinigamePlayMode(playMode)
    setMinigameSession('play')
    setFreeMinigamesDone(false)
    setMinigameRun((n) => n + 1)
    setMinigameLive({ index: 0, feedback: 'idle', started: false })
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
    clearPracticeSession()
    setDictationSession('pick')
    resetDictationPlayState()
  }

  function backToMinigamePick() {
    clearPracticeSession()
    setPinnedFreeRounds(null)
    setMinigameSession('pick')
    setFreeMinigamesDone(false)
  }

  useEffect(() => {
    // Solo setHandler (estable): depender del contexto entero entra en bucle al cambiar el handler.
    const setHandler = practiceBackSetHandler
    if (!setHandler) return

    if (mode === 'dictation' && dictationSession !== 'pick') {
      setHandler(() => backToDictationPick())
    } else if (mode === 'minigames' && minigameSession === 'play') {
      setHandler(() => backToMinigamePick())
    } else {
      setHandler(null)
    }

    return () => setHandler(null)
  }, [mode, dictationSession, minigameSession, practiceBackSetHandler])

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
      <PaperDictationPlayer
        week={week}
        lang={practiceLang}
        words={getWordsForLang(week, practiceLang)}
      />
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

  if (mode === 'dictation' && dictationSession === 'exam' && !examUnlocked) {
    return <Navigate to="/practice/dictation" replace />
  }

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
        <Link to="/" replace className="btn btn--primary">
          {t('nav.home')}
        </Link>
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
        initialPersisted={
          miniSaved?.variant === 'warmup'
            ? {
                index: miniSaved.index,
                feedback: miniSaved.feedback,
                started: miniSaved.started,
              }
            : undefined
        }
        onPersist={handleMinigamePersist}
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
        initialPersisted={
          miniSaved?.variant === 'free'
            ? {
                index: miniSaved.index,
                feedback: miniSaved.feedback,
                started: miniSaved.started,
              }
            : undefined
        }
        onPersist={handleMinigamePersist}
        onComplete={() => {
          clearPracticeSession()
          setFreeMinigamesDone(true)
        }}
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
  /** Reto: un intento por palabra; resto: corregir sin borrar el texto. */
  const allowCorrectInPlace = playMode !== 'challenge'

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
      void speakCorrectFeedback(activeLang, childName)
    } else {
      void speakTryAgainEncourage(activeLang, childName)
      if (allowCorrectInPlace) {
        requestAnimationFrame(() => practiceInputRef.current?.focus())
      }
    }
  }

  const tryAgainKind =
    playMode === 'free' || playMode === 'mistakes' ? 'encourage' : 'reveal'

  function goNext() {
    if (index + 1 >= words.length) {
      if (playMode === 'mission') {
        setProgress(markMissionComplete(progress))
      }
      clearPracticeSession()
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
          ref={practiceInputRef}
          className="practice-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            if (feedback === 'bad' && allowCorrectInPlace) setFeedback('idle')
          }}
          placeholder={t('practice.typePlaceholder')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && feedback === 'idle') checkAnswer()
            if (e.key === 'Enter' && feedback === 'bad') {
              if (allowCorrectInPlace) checkAnswer()
              else goNext()
            }
            if (e.key === 'Enter' && feedback === 'ok') goNext()
          }}
        />

        {liveLetterHint &&
          (feedback === 'idle' || feedback === 'ok' || feedback === 'bad') &&
          playMode !== 'challenge' && (
            <LiveLetterFeedback typed={input} expected={current} lang={activeLang} />
          )}

        {feedback === 'idle' && (
          <button type="button" className="btn btn--primary btn--block" onClick={checkAnswer}>
            {t('practice.submit')}
          </button>
        )}
        {feedback === 'ok' && (
          <>
            <CorrectFeedback lang={activeLang} childName={childName} word={current} />
            <button type="button" className="btn btn--primary btn--block" onClick={goNext}>
              {index + 1 >= words.length ? t('practice.finish') : t('practice.next')}
            </button>
          </>
        )}
        {feedback === 'bad' && (
          <>
            <TryAgainFeedback
              lang={activeLang}
              childName={childName}
              kind={tryAgainKind}
              word={current}
            />
            {allowCorrectInPlace ? (
              <div className="practice-retry-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  onClick={checkAnswer}
                >
                  {t('practice.submitAgain')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--block"
                  onClick={() => {
                    setInput('')
                    setFeedback('idle')
                    requestAnimationFrame(() => practiceInputRef.current?.focus())
                  }}
                >
                  {t('practice.clearAndRetry')}
                </button>
              </div>
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
