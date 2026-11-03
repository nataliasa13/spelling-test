import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'
import { SpellingLangSwitcher } from '../components/SpellingLangSwitcher'
import { getLanguageDef, getWordsForLang } from '../config/languages'
import { useAppState } from '../context/AppState'
import { ListenAgainButton } from '../components/ListenAgainButton'
import { FrequentMistakesPanel } from '../components/FrequentMistakesPanel'
import { getFrequentMistakes, getWordProgress } from '../lib/progress'
import { getSentenceText, hasSentence } from '../lib/sentence'
import type { SpellingLang } from '../types'

function WordList({
  words,
  lang,
  heading,
}: {
  words: string[]
  lang: SpellingLang
  heading?: string
}) {
  const { t } = useTranslation()
  const { progress } = useAppState()

  return (
    <section className="card" aria-label={heading ?? t('words.title')}>
      {heading ? <h3 className="words-section-title">{heading}</h3> : null}
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

function SentenceList({
  paragraphs,
  lang,
}: {
  paragraphs: string[]
  lang: SpellingLang
}) {
  const { t } = useTranslation()

  return (
    <section className="card" aria-label={t('words.sentencesTitle')}>
      <h3 className="words-section-title">{t('words.sentencesTitle')}</h3>
      <ul className="sentence-list">
        {paragraphs.map((paragraph) => (
          <li key={paragraph} className="sentence-pill">
            <ListenAgainButton word={paragraph} lang={lang} iconOnly />
            <span className="sentence-pill__text">{paragraph}</span>
          </li>
        ))}
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
  const showSentences = hasSentence(week, practiceLang)
  const sentenceParagraphs = showSentences
    ? getSentenceText(week, practiceLang)
        .split(/\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    : []

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
        <>
          {showSentences && sentenceParagraphs.length > 0 ? (
            <SentenceList paragraphs={sentenceParagraphs} lang={practiceLang} />
          ) : null}
          <WordList
            words={words}
            lang={practiceLang}
            heading={showSentences ? t('words.wordsSection') : undefined}
          />
        </>
      )}
    </main>
  )
}
