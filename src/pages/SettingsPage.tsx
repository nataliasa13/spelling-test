import { useEffect, useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { useAppState } from '../context/AppState'
import { isValidChildName, normalizeChildName } from '../lib/childName'
import {
  loadLiveLetterHint,
  loadPaperDictationShuffle,
  saveLiveLetterHint,
  savePaperDictationShuffle,
  setUiLang,
} from '../lib/storage'
import { LangFlag } from '../components/LangFlag'

export function SettingsPage() {
  const { t, i18n: i18nInstance } = useTranslation()
  const { childName, setChildName } = useAppState()
  const [nameDraft, setNameDraft] = useState(childName ?? '')
  const [nameError, setNameError] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [liveLetters, setLiveLetters] = useState(() => loadLiveLetterHint())
  const [paperShuffle, setPaperShuffle] = useState(() => loadPaperDictationShuffle())
  const langGroupId = useId()
  const current = i18nInstance.language.startsWith('es') ? 'es' : 'en'

  useEffect(() => {
    setNameDraft(childName ?? '')
  }, [childName])

  function setLang(lang: 'en' | 'es') {
    setUiLang(lang)
    void i18n.changeLanguage(lang)
    document.documentElement.lang = lang
  }

  function saveChildName(e?: FormEvent) {
    e?.preventDefault()
    if (!isValidChildName(nameDraft)) {
      setNameError(true)
      setNameSaved(false)
      return
    }
    setChildName(normalizeChildName(nameDraft))
    setNameError(false)
    setNameSaved(true)
  }

  const nameDirty =
    normalizeChildName(nameDraft) !== (childName ?? '') &&
    normalizeChildName(nameDraft).length > 0

  return (
    <main className="page settings-page">
      <header className="settings-page__intro">
        <h2 className="page-title settings-page__title">{t('settings.title')}</h2>
        <p className="muted settings-page__lead">{t('settings.lead')}</p>
      </header>

      <div className="settings-page__grid">
      <section className="settings-block" aria-labelledby="settings-name-heading">
        <div className="settings-block__head">
          <span className="settings-block__icon settings-block__icon--profile" aria-hidden>
            👤
          </span>
          <div className="settings-block__head-text">
            <h3 id="settings-name-heading" className="settings-block__title">
              {t('settings.childNameTitle')}
            </h3>
            <p className="settings-block__hint muted">{t('settings.childNameHint')}</p>
          </div>
        </div>
        <form className="settings-form" onSubmit={saveChildName}>
          <div className="settings-form__row">
            <div className="settings-form__field">
              <label className="settings-form__label" htmlFor="settings-child-name">
                {t('childName.label')}
              </label>
              <input
                id="settings-child-name"
                className="settings-form__input"
                type="text"
                autoComplete="given-name"
                maxLength={40}
                placeholder={t('childName.placeholder')}
                value={nameDraft}
                onChange={(e) => {
                  setNameDraft(e.target.value)
                  if (nameError) setNameError(false)
                  if (nameSaved) setNameSaved(false)
                }}
                aria-invalid={nameError}
                aria-describedby={
                  nameError ? 'settings-name-error' : nameSaved ? 'settings-name-ok' : undefined
                }
              />
            </div>
            <button
              type="submit"
              className="btn btn--primary btn--large settings-form__submit"
              disabled={!nameDirty && !nameError}
            >
              {t('settings.childNameSave')}
            </button>
          </div>
          {nameError && (
            <p id="settings-name-error" className="form-error settings-form__message" role="alert">
              {t('childName.nameRequired')}
            </p>
          )}
          {nameSaved && !nameError && (
            <p id="settings-name-ok" className="form-ok settings-form__message" role="status">
              {t('settings.childNameSaved')}
            </p>
          )}
        </form>
      </section>

      <section className="settings-block" aria-labelledby="settings-lang-heading">
        <div className="settings-block__head">
          <span className="settings-block__icon settings-block__icon--lang" aria-hidden>
            🌐
          </span>
          <div className="settings-block__head-text">
            <h3 id="settings-lang-heading" className="settings-block__title">
              {t('settings.appLanguage')}
            </h3>
            <p className="settings-block__hint muted">{t('settings.appLanguageHint')}</p>
          </div>
        </div>
        <div
          id={langGroupId}
          className="settings-lang"
          role="radiogroup"
          aria-labelledby="settings-lang-heading"
        >
          <button
            type="button"
            role="radio"
            aria-checked={current === 'en'}
            className={`settings-lang__option ${current === 'en' ? 'settings-lang__option--active settings-lang__option--en' : ''}`}
            onClick={() => setLang('en')}
          >
            <LangFlag lang="english" className="settings-lang__flag" />
            <span className="settings-lang__label">{t('settings.english')}</span>
            {current === 'en' && (
              <span className="settings-lang__check" aria-hidden>
                ✓
              </span>
            )}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={current === 'es'}
            className={`settings-lang__option ${current === 'es' ? 'settings-lang__option--active settings-lang__option--es' : ''}`}
            onClick={() => setLang('es')}
          >
            <LangFlag lang="spanish" className="settings-lang__flag" />
            <span className="settings-lang__label">{t('settings.spanish')}</span>
            {current === 'es' && (
              <span className="settings-lang__check" aria-hidden>
                ✓
              </span>
            )}
          </button>
        </div>
      </section>

      <section className="settings-block" aria-labelledby="settings-paper-dictation-heading">
        <div className="settings-block__head">
          <span className="settings-block__icon" aria-hidden>
            📝
          </span>
          <div className="settings-block__head-text">
            <h3 id="settings-paper-dictation-heading" className="settings-block__title">
              {t('settings.paperDictationTitle')}
            </h3>
            <p className="settings-block__hint muted">{t('settings.paperDictationHint')}</p>
          </div>
        </div>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={paperShuffle}
            onChange={(e) => {
              const on = e.target.checked
              setPaperShuffle(on)
              savePaperDictationShuffle(on)
            }}
          />
          <span className="settings-toggle__label">{t('settings.paperShuffleEnable')}</span>
        </label>
      </section>

      <section className="settings-block" aria-labelledby="settings-live-letters-heading">
        <div className="settings-block__head">
          <span className="settings-block__icon" aria-hidden>
            🧪
          </span>
          <div className="settings-block__head-text">
            <h3 id="settings-live-letters-heading" className="settings-block__title">
              {t('settings.liveLettersTitle')}
            </h3>
            <p className="settings-block__hint muted">{t('settings.liveLettersHint')}</p>
          </div>
        </div>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={liveLetters}
            onChange={(e) => {
              const on = e.target.checked
              setLiveLetters(on)
              saveLiveLetterHint(on)
            }}
          />
          <span className="settings-toggle__label">{t('settings.liveLettersEnable')}</span>
        </label>
      </section>

      <section
        className="settings-about settings-page__about"
        aria-label={t('settings.about')}
      >
        <div className="settings-about__brand">
          <span className="settings-about__logo" aria-hidden>
            ✏️
          </span>
          <div className="settings-about__text">
            <p className="settings-about__school">{t('app.product')}</p>
            <p className="settings-about__product muted">{t('app.tagline')}</p>
          </div>
        </div>
        <p className="settings-about__disclaimer">{t('home.disclaimer')}</p>
      </section>
      </div>
    </main>
  )
}
