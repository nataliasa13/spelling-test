import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isValidChildName, normalizeChildName } from '../lib/childName'

type Props = {
  onSave: (name: string) => void
}

export function ChildNameWelcomeModal({ onSave }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidChildName(value)) {
      setError(true)
      return
    }
    onSave(normalizeChildName(value))
  }

  return (
    <div className="modal-backdrop">
      <div
        className="modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="page-title">
          {t('childName.welcomeTitle')}
        </h2>
        <p className="muted">{t('childName.welcomeHint')}</p>
        <form onSubmit={submit}>
          <label className="home-name-label" htmlFor="child-name-welcome">
            {t('childName.label')}
            <input
              ref={inputRef}
              id="child-name-welcome"
              className="home-name-input"
              type="text"
              autoComplete="given-name"
              maxLength={40}
              placeholder={t('childName.placeholder')}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                if (error) setError(false)
              }}
              aria-invalid={error}
              aria-describedby={error ? 'child-name-welcome-error' : undefined}
            />
          </label>
          {error && (
            <p id="child-name-welcome-error" className="form-error" role="alert">
              {t('childName.nameRequired')}
            </p>
          )}
          <div className="modal__actions">
            <button type="submit" className="btn btn--primary btn--large btn--block">
              {t('childName.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
