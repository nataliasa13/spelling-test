import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { schoolConfig } from '../config/school'
import { useEditorAccess } from '../hooks/useEditorAccess'

export function AppHeader() {
  const { t } = useTranslation()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isEditor = useEditorAccess()
  const menuId = useId()
  const menuWrapRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return

    function onPointerDown(e: PointerEvent) {
      if (!menuWrapRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <header className="app-header">
      <div className="app-header__bar">
        <div className="app-header__start">
          {!isHome && (
            <Link to="/" className="app-header__back" aria-label={t('nav.back')}>
              ←
            </Link>
          )}
          <Link to="/" className="app-header__logo" aria-label={t('nav.home')}>
            <img
              className="app-header__logo-mark"
              src={schoolConfig.faviconSrc}
              alt=""
              width={119}
              height={119}
            />
            <img
              className="app-header__logo-full"
              src={schoolConfig.logoSrc}
              alt=""
              width={300}
              height={100}
            />
          </Link>
        </div>

        <div className="app-header__center">
          <span className="app-header__app-name">{t('school.product')}</span>
          <span className="app-header__class">{t('school.classLine')}</span>
        </div>

        <div className="app-header__menu-wrap" ref={menuWrapRef}>
          <button
            type="button"
            className="app-header__menu-btn"
            aria-label={t('nav.menu')}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="app-header__menu-icon" aria-hidden>
              ⋮
            </span>
          </button>
          {menuOpen && (
            <div id={menuId} className="app-header__menu-panel" role="menu">
              <Link
                to="/settings"
                className="app-header__menu-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.settings')}
              </Link>
              {isEditor && (
                <Link
                  to="/editor"
                  className="app-header__menu-item"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('nav.editor')}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
