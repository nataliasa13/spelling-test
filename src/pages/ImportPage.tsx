import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { useAppState } from '../context/AppState'

export function ImportPage() {
  const { t } = useTranslation()
  const { pendingImport, applyPendingImport, dismissImport } = useAppState()

  if (!pendingImport) return <Navigate to="/" replace />

  return (
    <main className="page card">
      <h2>{t('import.title')}</h2>
      <p>{t('import.confirm', { label: pendingImport.weekLabel })}</p>
      <ul className="import-stats">
        <li>{t('import.english', { count: pendingImport.english.length })}</li>
        <li>{t('import.spanish', { count: pendingImport.spanish.length })}</li>
      </ul>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            const reset = window.confirm(t('parents.replaceProgress'))
            applyPendingImport(reset)
          }}
        >
          {t('import.yes')}
        </button>
        <button type="button" className="btn" onClick={dismissImport}>
          {t('import.no')}
        </button>
      </div>
    </main>
  )
}
