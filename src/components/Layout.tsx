import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppState } from '../context/AppState'
import { notifyEditorAccessChanged } from '../hooks/useEditorAccess'
import { consumeEditorParamFromUrl, takeEditorUnlockFlash } from '../lib/editorAccess'
import { AppHeader } from './AppHeader'
import { ChildNameWelcomeModal } from './ChildNameWelcomeModal'

export function Layout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { childName, setChildName } = useAppState()
  const [editorUnlockedBanner, setEditorUnlockedBanner] = useState(false)

  useEffect(() => {
    if (consumeEditorParamFromUrl()) notifyEditorAccessChanged()
    if (takeEditorUnlockFlash()) setEditorUnlockedBanner(true)
  }, [location.search])

  return (
    <div className="app-shell">
      <AppHeader />
      {editorUnlockedBanner && (
        <Link to="/editor" className="banner banner--accent" onClick={() => setEditorUnlockedBanner(false)}>
          {t('editor.unlockedBanner')}
        </Link>
      )}
      <Outlet />
      {childName === null && <ChildNameWelcomeModal onSave={setChildName} />}
    </div>
  )
}
