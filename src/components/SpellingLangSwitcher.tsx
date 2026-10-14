import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getLanguageDef,
  getLanguagesWithWords,
  getWordsForLang,
} from '../config/languages'
import type { SpellingLang, WeekPack } from '../types'
import { LangFlag } from './LangFlag'

type Props = {
  week: WeekPack
  practiceLang: SpellingLang | null
  onSelect: (lang: SpellingLang) => void
}

export function SpellingLangSwitcher({ week, practiceLang, onSelect }: Props) {
  const { t } = useTranslation()
  const languagesWithWords = getLanguagesWithWords(week)

  if (languagesWithWords.length === 0) return null

  if (languagesWithWords.length === 1) {
    const def = languagesWithWords[0]
    const count = getWordsForLang(week, def.id).length
    return (
      <section
        className={`lang-picker-panel lang-picker-panel--single lang-picker-panel--${def.id}`}
      >
        <div className={`lang-picker__option lang-picker__option--${def.id} lang-picker__option--active`}>
          <LangFlag lang={def.id} className="lang-picker__flag" />
          <span className="lang-picker__name">{t(def.labelKey)}</span>
          <span className="lang-picker__count">{count}</span>
        </div>
      </section>
    )
  }

  return (
    <section
      className={`lang-picker-panel ${practiceLang ? `lang-picker-panel--${practiceLang}` : ''}`}
      aria-label={t('home.spellingList')}
    >
      {practiceLang && (
        <p className="lang-picker-panel__heading" role="status">
          {t('home.practicingLangShort', {
            lang: t(getLanguageDef(practiceLang).labelKey),
          })}
        </p>
      )}
      <div
        className="lang-picker"
        role="tablist"
        style={
          {
            '--lang-picker-cols': languagesWithWords.length,
          } as CSSProperties
        }
      >
        {languagesWithWords.map((def) => {
          const count = getWordsForLang(week, def.id).length
          const active = practiceLang === def.id
          return (
            <button
              key={def.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`lang-picker__option lang-picker__option--${def.id} ${active ? 'lang-picker__option--active' : ''}`}
              onClick={() => onSelect(def.id)}
            >
              <LangFlag lang={def.id} className="lang-picker__flag" />
              <span className="lang-picker__name">{t(def.labelKey)}</span>
              <span className="lang-picker__count">{count}</span>
              {active && (
                <span className="lang-picker__check" aria-hidden>
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
