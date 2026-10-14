import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

type SetupProps = {
  mode: 'setup'
  pinNew: string
  pinConfirm: string
  pinError: string
  onPinNewChange: (value: string) => void
  onPinConfirmChange: (value: string) => void
  onSubmit: () => void
}

type UnlockProps = {
  mode: 'unlock'
  pinInput: string
  pinError: string
  onPinInputChange: (value: string) => void
  onSubmit: () => void
}

type Props = SetupProps | UnlockProps

export function EditorPinScreen(props: Props) {
  const { t } = useTranslation()
  const isSetup = props.mode === 'setup'

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    props.onSubmit()
  }

  const title = isSetup ? t('parents.setPinTitle') : t('parents.enterPinTitle')
  const hint = isSetup ? t('parents.setPinHint') : t('parents.enterPinHint')
  const submitLabel = isSetup ? t('parents.setPinSubmit') : t('parents.enterPinSubmit')

  return (
    <main className="page editor-pin-page">
      <div className="editor-pin-card">
        <div className="editor-pin-card__icon-wrap" aria-hidden>
          <span className="editor-pin-card__icon">{isSetup ? '🔐' : '🔑'}</span>
        </div>
        <h2 className="editor-pin-card__title">{title}</h2>
        <p className="editor-pin-card__hint muted">{hint}</p>

        <form className="editor-pin-form" onSubmit={handleSubmit}>
          {isSetup ? (
            <div className="editor-pin-form__fields">
              <label className="editor-pin-form__label" htmlFor="editor-pin-new">
                {t('parents.pinNewLabel')}
                <input
                  id="editor-pin-new"
                  className="editor-pin-form__input"
                  type="password"
                  autoComplete="new-password"
                  maxLength={32}
                  value={props.pinNew}
                  onChange={(e) => props.onPinNewChange(e.target.value)}
                  placeholder={t('parents.pinPlaceholder')}
                  aria-invalid={!!props.pinError}
                />
              </label>
              <label className="editor-pin-form__label" htmlFor="editor-pin-confirm">
                {t('parents.confirmPin')}
                <input
                  id="editor-pin-confirm"
                  className="editor-pin-form__input"
                  type="password"
                  autoComplete="new-password"
                  maxLength={32}
                  value={props.pinConfirm}
                  onChange={(e) => props.onPinConfirmChange(e.target.value)}
                  placeholder={t('parents.confirmPinPlaceholder')}
                  aria-invalid={!!props.pinError}
                />
              </label>
            </div>
          ) : (
            <label className="editor-pin-form__label" htmlFor="editor-pin-unlock">
              {t('parents.enterPin')}
              <input
                id="editor-pin-unlock"
                className="editor-pin-form__input"
                type="password"
                autoComplete="current-password"
                maxLength={32}
                value={props.pinInput}
                onChange={(e) => props.onPinInputChange(e.target.value)}
                placeholder={t('parents.pinPlaceholder')}
                aria-invalid={!!props.pinError}
              />
            </label>
          )}

          {props.pinError && (
            <p className="form-error editor-pin-form__error" role="alert">
              {props.pinError}
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--large editor-pin-form__submit">
            {submitLabel}
          </button>
        </form>

        {isSetup && (
          <p className="editor-pin-card__footnote muted">{t('parents.setPinFootnote')}</p>
        )}
      </div>
    </main>
  )
}
