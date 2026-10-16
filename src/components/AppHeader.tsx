import type { MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { resolveAppPath } from '../lib/appPaths'
import { useTranslation } from 'react-i18next'
import { usePracticeBack } from '../context/PracticeBackContext'

function SettingsGearIcon() {
  return (
    <svg
      className="app-header__menu-icon"
      aria-hidden
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function AppHeader() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const isSettings = location.pathname === '/settings'
  const practiceBack = usePracticeBack()

  /** Volver en el historial en vez de apilar otra entrada a "/" (evita historiales llenos de duplicados). */
  function goBack() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }

  function openSettings(e: MouseEvent<HTMLAnchorElement>) {
    if (isSettings) return
    e.preventDefault()
    flushSync(() => {
      navigate('/settings')
    })
    if (document.querySelector('.settings-page')) return
    window.location.assign(resolveAppPath('/settings'))
  }

  return (
    <header className="app-header">
      <div className="app-header__bar">
        <div className="app-header__start">
          {!isHome &&
            (practiceBack?.handler ? (
              <button
                type="button"
                className="app-header__back"
                aria-label={t('nav.back')}
                onClick={practiceBack.handler}
              >
                ←
              </button>
            ) : (
              <button
                type="button"
                className="app-header__back"
                aria-label={t('nav.back')}
                onClick={goBack}
              >
                ←
              </button>
            ))}
        </div>

        <div className="app-header__center">
          <span className="app-header__app-name">{t('app.product')}</span>
          <span className="app-header__class">{t('app.tagline')}</span>
        </div>

        <div className="app-header__menu-wrap">
          <Link
            to="/settings"
            className={`app-header__menu-btn${isSettings ? ' app-header__menu-btn--active' : ''}`}
            aria-label={t('nav.settings')}
            aria-current={isSettings ? 'page' : undefined}
            onClick={openSettings}
          >
            <SettingsGearIcon />
          </Link>
        </div>
      </div>
    </header>
  )
}
