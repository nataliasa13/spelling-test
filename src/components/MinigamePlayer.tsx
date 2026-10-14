import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { WarmupRound } from '../lib/minigames'
import type { SpellingLang } from '../types'
import { ListenAgainButton } from './ListenAgainButton'
import { SectionListenGate } from './SectionListenGate'
import { speakWord } from '../lib/speech'

export type MinigameVariant = 'warmup' | 'free'

type Props = {
  variant: MinigameVariant
  rounds: WarmupRound[]
  lang: SpellingLang
  onComplete: () => void
}

export function MinigamePlayer({ variant, rounds, lang, onComplete }: Props) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<'idle' | 'ok' | 'bad'>('idle')
  const [started, setStarted] = useState(false)
  const round = rounds[index]

  if (!round) return null

  function goNext() {
    setFeedback('idle')
    if (index + 1 >= rounds.length) {
      onComplete()
      return
    }
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
          onAnswer={(ok) => {
            setFeedback(ok ? 'ok' : 'bad')
          }}
          onNext={goNext}
          onRetry={() => setFeedback('idle')}
        />
      ) : (
        <ScrambleRound
          round={round}
          lang={lang}
          feedback={feedback}
          onAnswer={(ok) => {
            setFeedback(ok ? 'ok' : 'bad')
          }}
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
  onNext,
  onRetry,
}: {
  feedback: 'idle' | 'ok' | 'bad'
  word: string
  onNext: () => void
  onRetry: () => void
}) {
  const { t } = useTranslation()
  if (feedback === 'idle') return null
  return (
    <>
      <p className={feedback === 'ok' ? 'feedback feedback--ok' : 'feedback feedback--bad'}>
        {feedback === 'ok' ? t('practice.correct') : t('practice.warmupTryAgain', { word })}
      </p>
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
  onAnswer,
  onNext,
  onRetry,
}: {
  round: Extract<WarmupRound, { kind: 'blank' }>
  lang: SpellingLang
  feedback: 'idle' | 'ok' | 'bad'
  onAnswer: (ok: boolean) => void
  onNext: () => void
  onRetry: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="practice-card practice-card--minigame">
      <p className="warmup-prompt">{t('practice.warmupBlankPrompt')}</p>
      <p className="warmup-display">{round.display}</p>
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
        onNext={onNext}
        onRetry={onRetry}
      />
    </div>
  )
}

function ScrambleRound({
  round,
  lang,
  feedback,
  onAnswer,
  onNext,
  onRetry,
}: {
  round: Extract<WarmupRound, { kind: 'scramble' }>
  lang: SpellingLang
  feedback: 'idle' | 'ok' | 'bad'
  onAnswer: (ok: boolean) => void
  onNext: () => void
  onRetry: () => void
}) {
  const { t } = useTranslation()
  const [picked, setPicked] = useState<number[]>([])
  const [used, setUsed] = useState<Set<number>>(() => new Set())

  useEffect(() => {
    setPicked([])
    setUsed(new Set())
  }, [round.word])

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
    const built = picked.map((id) => round.tiles.find((tile) => tile.id === id)!.char).join('')
    onAnswer(built === round.word)
  }

  const built = picked.map((id) => round.tiles.find((tile) => tile.id === id)!.char).join('')

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
        onNext={onNext}
        onRetry={retryScramble}
      />
    </div>
  )
}
