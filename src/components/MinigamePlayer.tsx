import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { WarmupRound } from '../lib/minigames'
import type { SpellingLang } from '../types'
import { useAppState } from '../context/AppState'
import { speakCorrectFeedback } from '../lib/correctFeedback'
import { speakTryAgainEncourage } from '../lib/tryAgainFeedback'
import { speakWord, unlockAudio } from '../lib/speech'
import { CorrectFeedback } from './CorrectFeedback'
import { TryAgainFeedback } from './TryAgainFeedback'
import { ListenAgainButton, ListenIcon } from './ListenAgainButton'
import { SectionListenGate } from './SectionListenGate'

export type MinigameVariant = 'warmup' | 'free'

export type MinigamePersistedState = {
  index: number
  feedback: 'idle' | 'ok' | 'bad'
  started: boolean
}

type Props = {
  variant: MinigameVariant
  rounds: WarmupRound[]
  lang: SpellingLang
  onComplete: () => void
  /** Misión: el sonido ya se activó en la pantalla única de empezar. */
  skipInitialGate?: boolean
  initialPersisted?: MinigamePersistedState
  onPersist?: (state: MinigamePersistedState) => void
}

export function MinigamePlayer({
  variant,
  rounds,
  lang,
  onComplete,
  skipInitialGate = false,
  initialPersisted,
  onPersist,
}: Props) {
  const { t } = useTranslation()
  const { childName } = useAppState()
  const [index, setIndex] = useState(initialPersisted?.index ?? 0)
  const [feedback, setFeedback] = useState<'idle' | 'ok' | 'bad'>(initialPersisted?.feedback ?? 'idle')
  const [started, setStarted] = useState(initialPersisted?.started ?? skipInitialGate)
  const round = rounds[index]

  useEffect(() => {
    onPersist?.({ index, feedback, started })
  }, [index, feedback, started, onPersist])

  if (!round) return null

  function onRoundAnswer(ok: boolean) {
    setFeedback(ok ? 'ok' : 'bad')
    if (ok) void speakCorrectFeedback(lang, childName)
    else void speakTryAgainEncourage(lang, childName)
  }

  function goNext() {
    setFeedback('idle')
    if (index + 1 >= rounds.length) {
      onComplete()
      return
    }
    unlockAudio()
    const nextIndex = index + 1
    const nextWord = rounds[nextIndex]?.word
    setIndex(nextIndex)
    if (nextWord) void speakWord(nextWord, lang, { preferPiper: true })
  }

  const badgeKey =
    variant === 'warmup' ? 'practice.warmupBadge' : 'practice.minigamesBadge'
  const titleKey =
    variant === 'warmup' ? 'practice.warmupTitle' : 'practice.minigamesTitle'

  if (!started) {
    return (
      <SectionListenGate
        lang={lang}
        word={round.word}
        title={t(titleKey)}
        subtitle={t(badgeKey)}
        variant="minigame"
        onStart={() => setStarted(true)}
      />
    )
  }

  return (
    <main className="page practice-page">
      <p className="warmup-badge">{t(badgeKey)}</p>
      <h2 className="page-title">{t(titleKey)}</h2>
      <p className="muted">{t('practice.warmupHint')}</p>
      <p className="muted">
        {t('practice.warmupProgress', { current: index + 1, total: rounds.length })}
      </p>

      {round.kind === 'blank' ? (
        <BlankRound
          round={round}
          lang={lang}
          feedback={feedback}
          childName={childName}
          onAnswer={onRoundAnswer}
          onNext={goNext}
          onRetry={() => setFeedback('idle')}
        />
      ) : round.kind === 'scramble' ? (
        <ScrambleRound
          key={`${index}-${round.word}`}
          round={round}
          lang={lang}
          feedback={feedback}
          childName={childName}
          onAnswer={onRoundAnswer}
          onNext={goNext}
          onRetry={() => setFeedback('idle')}
        />
      ) : (
        <MatchRound
          round={round}
          lang={lang}
          feedback={feedback}
          childName={childName}
          onAnswer={onRoundAnswer}
          onNext={goNext}
          onRetry={() => setFeedback('idle')}
        />
      )}
    </main>
  )
}

function FeedbackBlock({
  feedback,
  word,
  lang,
  childName,
  onNext,
  onRetry,
}: {
  feedback: 'idle' | 'ok' | 'bad'
  word: string
  lang: SpellingLang
  childName: string | null
  onNext: () => void
  onRetry: () => void
}) {
  const { t } = useTranslation()
  if (feedback === 'idle') return null
  return (
    <>
      {feedback === 'ok' ? (
        <CorrectFeedback lang={lang} childName={childName} word={word} />
      ) : (
        <TryAgainFeedback lang={lang} childName={childName} kind="minigame" word={word} />
      )}
      {feedback === 'bad' ? (
        <div className="warmup-feedback-actions">
          <button type="button" className="btn btn--primary btn--block" onClick={onRetry}>
            {t('practice.tryAgain')}
          </button>
          <button type="button" className="btn btn--block" onClick={onNext}>
            {t('practice.next')}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn--primary btn--block" onClick={onNext}>
          {t('practice.next')}
        </button>
      )}
    </>
  )
}

function BlankRound({
  round,
  lang,
  feedback,
  childName,
  onAnswer,
  onNext,
  onRetry,
}: {
  round: Extract<WarmupRound, { kind: 'blank' }>
  lang: SpellingLang
  feedback: 'idle' | 'ok' | 'bad'
  childName: string | null
  onAnswer: (ok: boolean) => void
  onNext: () => void
  onRetry: () => void
}) {
  const { t } = useTranslation()
  const displayWord = feedback === 'ok' ? round.word : round.display

  return (
    <div className="practice-card practice-card--minigame">
      <p className="warmup-prompt">{t('practice.warmupBlankPrompt')}</p>
      <p className="warmup-display">{displayWord}</p>
      <ListenAgainButton word={round.word} lang={lang} className="listen-again-btn--minigame" />
      {feedback !== 'ok' && (
        <div className="warmup-options">
          {round.options.map((opt, i) => (
            <button
              key={`${opt}-${i}`}
              type="button"
              className="btn warmup-option"
              onClick={() => onAnswer(opt === round.word[round.hiddenIndex])}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      <FeedbackBlock
        feedback={feedback}
        word={round.word}
        lang={lang}
        childName={childName}
        onNext={onNext}
        onRetry={onRetry}
      />
    </div>
  )
}

function MatchRound({
  round,
  lang,
  feedback,
  childName,
  onAnswer,
  onNext,
  onRetry,
}: {
  round: Extract<WarmupRound, { kind: 'match' }>
  lang: SpellingLang
  feedback: 'idle' | 'ok' | 'bad'
  childName: string | null
  onAnswer: (ok: boolean) => void
  onNext: () => void
  onRetry: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="practice-card practice-card--minigame">
      <p className="warmup-prompt">{t('practice.warmupMatchPrompt')}</p>
      <p className="practice-prompt" aria-hidden>
        <ListenIcon size="lg" />
      </p>
      <ListenAgainButton word={round.word} lang={lang} className="listen-again-btn--minigame" />
      {feedback !== 'ok' && (
        <div className="warmup-options">
          {round.options.map((opt, i) => (
            <button
              key={`${opt}-${i}`}
              type="button"
              className="btn warmup-option warmup-option--phrase"
              onClick={() => onAnswer(opt === round.word)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      <FeedbackBlock
        feedback={feedback}
        word={round.word}
        lang={lang}
        childName={childName}
        onNext={onNext}
        onRetry={onRetry}
      />
    </div>
  )
}

function scrambleBuilt(
  picked: number[],
  tiles: Extract<WarmupRound, { kind: 'scramble' }>['tiles'],
): string {
  return picked
    .map((id) => tiles.find((tile) => tile.id === id)?.char ?? '')
    .join('')
}

function ScrambleRound({
  round,
  lang,
  feedback,
  childName,
  onAnswer,
  onNext,
  onRetry,
}: {
  round: Extract<WarmupRound, { kind: 'scramble' }>
  lang: SpellingLang
  feedback: 'idle' | 'ok' | 'bad'
  childName: string | null
  onAnswer: (ok: boolean) => void
  onNext: () => void
  onRetry: () => void
}) {
  const { t } = useTranslation()
  const [picked, setPicked] = useState<number[]>([])
  const [used, setUsed] = useState<Set<number>>(() => new Set())

  function toggleTile(id: number) {
    if (feedback !== 'idle') return
    if (used.has(id)) {
      setUsed((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setPicked((p) => p.filter((x) => x !== id))
      return
    }
    setUsed((prev) => new Set(prev).add(id))
    setPicked((p) => [...p, id])
  }

  function check() {
    const built = scrambleBuilt(picked, round.tiles)
    onAnswer(built === round.word)
  }

  const built = scrambleBuilt(picked, round.tiles)

  function retryScramble() {
    setPicked([])
    setUsed(new Set())
    onRetry()
  }

  return (
    <div className="practice-card practice-card--minigame">
      <p className="warmup-prompt">{t('practice.warmupScramblePrompt')}</p>
      <p className="warmup-built">{built || '—'}</p>
      <ListenAgainButton word={round.word} lang={lang} className="listen-again-btn--minigame" />
      {feedback === 'idle' && (
        <>
          <div className="warmup-tiles">
            {round.tiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                className={`warmup-tile ${used.has(tile.id) ? 'warmup-tile--used' : ''}`}
                onClick={() => toggleTile(tile.id)}
              >
                {tile.char}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={picked.length !== round.word.length}
            onClick={check}
          >
            {t('practice.submit')}
          </button>
        </>
      )}
      <FeedbackBlock
        feedback={feedback}
        word={round.word}
        lang={lang}
        childName={childName}
        onNext={onNext}
        onRetry={retryScramble}
      />
    </div>
  )
}
