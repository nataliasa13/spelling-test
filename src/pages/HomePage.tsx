import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SpellingLangSwitcher } from '../components/SpellingLangSwitcher'
import { getWordsForLang } from '../config/languages'
import { useAppState } from '../context/AppState'
import {
  countMastered,
  countWordsWithMistakes,
  isMissionCompleteToday,
} from '../lib/progress'
import type { SpellingLang } from '../types'

export function HomePage() {
  const { t } = useTranslation()
  const { week, progress, practiceLang, setPracticeLang } = useAppState()

  function pickLang(lang: SpellingLang) {
    setPracticeLang(lang)
  }

  const langList =
    practiceLang && week ? getWordsForLang(week, practiceLang) : []

  const masteredCount =
    practiceLang && week ? countMastered(progress, practiceLang, langList) : 0
  const wordsTotal = langList.length
  const mistakeWordCount =
    practiceLang && week ? countWordsWithMistakes(progress, practiceLang, langList) : 0
  const missionDoneToday = isMissionCompleteToday(progress)

  return (
    <main
      className={`page home-page ${practiceLang ? `home-page--${practiceLang}` : ''}`}
    >
      {!week ? (
        <section className="card">
          <h2>{t('home.noWeekTitle')}</h2>
          <p className="muted">{t('home.noWeekHint')}</p>
        </section>
      ) : practiceLang ? (
        <>
          <SpellingLangSwitcher
            week={week}
            practiceLang={practiceLang}
            onSelect={pickLang}
          />
          <p className="home-week-line muted">
            {t('home.weekLabel', { label: week.weekLabel })}
          </p>

          <nav
            key={practiceLang}
            className="activity-grid activity-grid--home activity-grid--lang-swap"
            aria-label={t('home.activitiesNav')}
          >
            <Link
              to="/practice/paper"
              className="activity-choice activity-choice--paper activity-choice--full"
            >
              <span className="activity-choice__icon activity-choice__icon--lg" aria-hidden>
                📝
              </span>
              <span className="activity-choice__body">
                <span className="activity-choice__title">{t('home.paperDictation')}</span>
                <span className="activity-choice__sub">{t('home.activityPaperSub')}</span>
              </span>
              <span className="activity-choice__go" aria-hidden>
                →
              </span>
            </Link>

            <Link
              to="/practice/mission"
              className={`activity-choice activity-choice--mission activity-choice--full${missionDoneToday ? ' activity-choice--mission-done' : ''}`}
              aria-label={
                missionDoneToday
                  ? t('home.missionDoneA11y')
                  : t('home.dailyMission')
              }
            >
              <span className="activity-choice__icon activity-choice__icon--lg" aria-hidden>
                {missionDoneToday ? '✅' : '⭐'}
              </span>
              <span className="activity-choice__body">
                <span className="activity-choice__title">{t('home.dailyMission')}</span>
                <span className="activity-choice__sub">
                  {missionDoneToday
                    ? t('home.activityMissionDoneSub')
                    : t('home.activityMissionSub')}
                </span>
              </span>
              {missionDoneToday ? (
                <span className="activity-choice__stat activity-choice__done-badge">
                  {t('home.missionDoneBadge')}
                </span>
              ) : null}
              <span className="activity-choice__go" aria-hidden>
                →
              </span>
            </Link>

            <div className="activity-grid__pair">
              <Link
                to="/words"
                className="activity-choice activity-choice--words"
                aria-label={t('home.wordsProgressA11y', {
                  mastered: masteredCount,
                  total: wordsTotal,
                })}
              >
                <span className="activity-choice__icon" aria-hidden>
                  📋
                </span>
                <span className="activity-choice__body">
                  <span className="activity-choice__title">{t('home.thisWeek')}</span>
                  <span className="activity-choice__sub">{t('home.activityWordsSub')}</span>
                </span>
                <span className="activity-choice__stat" aria-hidden>
                  {masteredCount}/{wordsTotal}
                </span>
                <span className="activity-choice__go" aria-hidden>
                  →
                </span>
              </Link>
              <Link
                to="/words#word-mistakes"
                className="activity-choice activity-choice--errors"
                aria-label={t('home.errorsA11y', { count: mistakeWordCount })}
              >
                <span className="activity-choice__icon" aria-hidden>
                  ✏️
                </span>
                <span className="activity-choice__body">
                  <span className="activity-choice__title">{t('home.errorsTitle')}</span>
                  <span className="activity-choice__sub">{t('home.errorsSub')}</span>
                </span>
                <span className="activity-choice__stat" aria-hidden>
                  {mistakeWordCount}
                </span>
                <span className="activity-choice__go" aria-hidden>
                  →
                </span>
              </Link>
            </div>

            <div className="activity-grid__pair">
              <Link to="/practice/dictation" className="activity-choice activity-choice--dictation">
                <span className="activity-choice__icon" aria-hidden>
                  ✏️
                </span>
                <span className="activity-choice__body">
                  <span className="activity-choice__title">
                    {t('home.dictation', { count: langList.length })}
                  </span>
                  <span className="activity-choice__sub">{t('home.activityDictationSub')}</span>
                </span>
                <span className="activity-choice__go" aria-hidden>
                  →
                </span>
              </Link>
              <Link to="/practice/minigames" className="activity-choice activity-choice--minigames">
                <span className="activity-choice__icon" aria-hidden>
                  🎮
                </span>
                <span className="activity-choice__body">
                  <span className="activity-choice__title">{t('home.minigames')}</span>
                  <span className="activity-choice__sub">{t('home.activityMinigamesSub')}</span>
                </span>
                <span className="activity-choice__go" aria-hidden>
                  →
                </span>
              </Link>
            </div>
          </nav>
        </>
      ) : null}

      <p className="disclaimer">{t('home.disclaimer')}</p>
    </main>
  )
}
