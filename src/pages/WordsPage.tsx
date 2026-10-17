import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'
import { SpellingLangSwitcher } from '../components/SpellingLangSwitcher'
import { getLanguageDef, getWordsForLang } from '../config/languages'
import { useAppState } from '../context/AppState'
import { ListenAgainButton } from '../components/ListenAgainButton'
import { FrequentMistakesPanel } from '../components/FrequentMistakesPanel'
import { getFrequentMistakes, getWordProgress } from '../lib/progress'

function WordList({
  words,
  lang,
}: {
  words: string[]
  lang: 'english' | 'spanish'
}) {
  const { t } = useTranslation()
  const { progress } = useAppState()

  return (
    <section className="card" aria-label={t('words.title')}>
      <ul className="word-list">
        {words.map((word) => {
          const wp = getWordProgress(progress, lang, word)
          const status = wp.mastered
            ? t('words.statusMastered')
            : wp.correctStreak > 0
              ? t('words.statusPractising')
              : t('words.statusNew')
          const statusClass = wp.mastered
            ? 'word-pill--green'
            : wp.correctStreak > 0
              ? 'word-pill--yellow'
              : 'word-pill--grey'

          return (
            <li key={word} className={`word-pill ${statusClass}`}>
              <div className="word-pill__main">
                <ListenAgainButton word={word} lang={lang} iconOnly />
                <span className="word-pill__word">{word}</span>
              </div>
              <span className="word-pill__status">{status}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function WordsPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const { week, progress, practiceLang, setPracticeLang } = useAppState()

  if (!week) return <Navigate to="/" replace />
  if (!practiceLang) return <Navigate to="/" replace />

  const def = getLanguageDef(practiceLang)
  const words = getWordsForLang(week, practiceLang)
  const mistakes = getFrequentMistakes(progress, practiceLang, words, words.length)
  const showMistakes = location.hash === '#word-mistakes'

  return (
    <main
      className={`page words-page words-page--${practiceLang}${showMistakes ? ' words-page--mistakes' : ''}`}
    >
      <SpellingLangSwitcher
        week={week}
        practiceLang={practiceLang}
        onSelect={setPracticeLang}
      />
      <h2 className="page-title">
        {t(showMistakes ? 'home.errorsTitle' : 'words.title')} — {t(def.labelKey)}
      </h2>
      {/* {!showMistakes && (
        <p className="words-page__paper-row">
          <Link to="/practice/paper" className="btn btn--primary">
            {t('words.paperDictation')}
          </Link>
          <span className="muted words-page__paper-hint">{t('words.paperDictationHint')}</span>
        </p>
      )} */}
      {showMistakes ? (
        <FrequentMistakesPanel mistakes={mistakes} />
      ) : (
        <WordList words={words} lang={practiceLang} />
      )}
    </main>
  )
}
