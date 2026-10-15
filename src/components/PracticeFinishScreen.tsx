import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PracticeMode } from '../types'

export type FinishKind = PracticeMode | 'minigames'

type Props = {
  kind: FinishKind
  score?: number
  total?: number
  medalLine?: string
  missionStreak?: number
  onPlayAgain?: () => void
  playAgainLabel?: string
  onChangeMode?: () => void
  changeModeLabel?: string
}

function celebrationEmoji(kind: FinishKind, score: number, total: number): string {
  if (kind === 'paper') return '📝'
  if (kind === 'minigames') return '🎮'
  if (kind === 'challenge') {
    if (score >= total) return '🥇'
    if (score >= total - 2) return '🥈'
    return '🥉'
  }
  if (total <= 0) return '⭐'
  if (score >= total) return '🌟'
  if (score >= total - 2) return '🎉'
  return '💪'
}

export function PracticeFinishScreen({
  kind,
  score = 0,
  total = 0,
  medalLine,
  missionStreak = 0,
  onPlayAgain,
  playAgainLabel,
  onChangeMode,
  changeModeLabel,
}: Props) {
  const { t } = useTranslation()
  const emoji = celebrationEmoji(kind, score, total)

  const titleKey =
    kind === 'mission'
      ? 'practice.finishMissionTitle'
      : kind === 'challenge'
        ? 'practice.finishChallengeTitle'
        : kind === 'mistakes'
          ? 'practice.finishMistakesTitle'
          : kind === 'minigames'
            ? 'practice.finishMinigamesTitle'
            : kind === 'paper'
              ? 'practice.finishPaperTitle'
              : 'practice.finishFreeTitle'

  const title =
    kind === 'challenge' && medalLine ? medalLine : t(titleKey)

  const showScore = kind !== 'minigames' && kind !== 'paper' && total > 0

  return (
    <main className={`page finish-screen finish-screen--${kind}`}>
      <div className="finish-screen__card">
        <p className="finish-screen__confetti" aria-hidden>
          ✨ 🎊 ✨
        </p>
        <p className="finish-screen__emoji" aria-hidden>
          {emoji}
        </p>
        <h2 className="finish-screen__title">{title}</h2>
        {showScore && (
          <p className="finish-screen__score">
            {t('practice.scoreLine', { score, total })}
          </p>
        )}
        {kind === 'mission' && missionStreak > 1 && (
          <p className="finish-screen__streak">
            {t('practice.finishStreak', { count: missionStreak })}
          </p>
        )}
        {kind === 'minigames' && (
          <p className="finish-screen__hint muted">{t('practice.minigamesDoneHint')}</p>
        )}
        {kind === 'mission' && (
          <p className="finish-screen__hint muted">{t('practice.finishMissionHint')}</p>
        )}
        {kind === 'mistakes' && (
          <p className="finish-screen__hint muted">{t('practice.finishMistakesHint')}</p>
        )}
        {kind === 'paper' && (
          <p className="finish-screen__hint muted">{t('practice.finishPaperHint')}</p>
        )}
        <div className="finish-screen__actions btn-row">
          {onPlayAgain && playAgainLabel && (
            <button type="button" className="btn btn--primary" onClick={onPlayAgain}>
              {playAgainLabel}
            </button>
          )}
          {onChangeMode && changeModeLabel && (
            <button type="button" className="btn" onClick={onChangeMode}>
              {changeModeLabel}
            </button>
          )}
          {kind === 'mistakes' ? (
            <>
              <Link to="/words#word-mistakes" className="btn btn--primary">
                {t('practice.mistakesViewList')}
              </Link>
              <Link to="/" className="btn">
                {t('nav.home')}
              </Link>
            </>
          ) : (
            <Link to="/" className={`btn ${onPlayAgain ? '' : 'btn--primary'}`}>
              {t('nav.home')}
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
