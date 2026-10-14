import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SpellingLangSwitcher } from '../components/SpellingLangSwitcher'
import { getWordsForLang } from '../config/languages'
import { useAppState } from '../context/AppState'
import {
  challengeThreshold,
  challengeUnlocked,
  countMastered,
  countWordsWithMistakes,
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

  const langUnlocked = practiceLang && week
    ? challengeUnlocked(progress, practiceLang, langList)
    : false
  const dareNeed = practiceLang && week ? challengeThreshold(langList.length) : 0
  const masteredCount =
    practiceLang && week ? countMastered(progress, practiceLang, langList) : 0
  const wordsTotal = langList.length
  const mistakeWordCount =
    practiceLang && week ? countWordsWithMistakes(progress, practiceLang, langList) : 0

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
              className="activity-choice activity-choice--mission activity-choice--full"
            >
              <span className="activity-choice__icon activity-choice__icon--lg" aria-hidden>
                ⭐
              </span>
              <span className="activity-choice__body">
                <span className="activity-choice__title">{t('home.dailyMission')}</span>
                <span className="activity-choice__sub">{t('home.activityMissionSub')}</span>
              </span>
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
              <Link to="/practice/free" className="activity-choice activity-choice--free">
                <span className="activity-choice__icon" aria-hidden>
                  🎮
                </span>
                <span className="activity-choice__body">
                  <span className="activity-choice__title">
                    {t('home.freePlay', { count: langList.length })}
                  </span>
                  <span className="activity-choice__sub">{t('home.activityFreeSub')}</span>
                </span>
                <span className="activity-choice__go" aria-hidden>
                  →
                </span>
              </Link>
              {langUnlocked ? (
                <Link to="/practice/challenge" className="activity-choice activity-choice--dare">
                  <span className="activity-choice__icon" aria-hidden>
                    🚀
                  </span>
                  <span className="activity-choice__body">
                    <span className="activity-choice__title">
                      {t('home.dare', { count: langList.length })}
                    </span>
                    <span className="activity-choice__sub">{t('home.activityDareSub')}</span>
                  </span>
                  <span className="activity-choice__go" aria-hidden>
                    →
                  </span>
                </Link>
              ) : (
                <div
                  className="activity-choice activity-choice--dare activity-choice--locked"
                  aria-disabled="true"
                  aria-label={t('home.dareLockedA11y', {
                    mastered: masteredCount,
                    need: dareNeed,
                  })}
                >
                  <span className="activity-choice__icon activity-choice__icon--locked" aria-hidden>
                    🔒
                  </span>
                  <span className="activity-choice__body">
                    <span className="activity-choice__title-row">
                      <span className="activity-choice__title">
                        {t('home.dare', { count: langList.length })}
                      </span>
                      <span className="activity-choice__lock-badge">
                        {t('home.dareLockedBadge')}
                      </span>
                    </span>
                    <span className="activity-choice__sub activity-choice__sub--lock">
                      {t('home.dareLocked', { need: dareNeed })}
                    </span>
                  </span>
                  <span className="activity-choice__stat activity-choice__stat--lock" aria-hidden>
                    {masteredCount}/{dareNeed}
                  </span>
                </div>
              )}
            </div>
          </nav>
        </>
      ) : null}

      <p className="disclaimer">{t('home.disclaimer')}</p>
    </main>
  )
}
