import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAppState } from '../context/AppState'
import { PracticeBackProvider, usePracticeBack } from '../context/PracticeBackContext'
import { AppHeader } from './AppHeader'
import { ChildNameWelcomeModal } from './ChildNameWelcomeModal'

function LayoutBody() {
  const location = useLocation()
  const { childName, setChildName } = useAppState()
  const practiceBack = usePracticeBack()

  useEffect(() => {
    if (!location.pathname.startsWith('/practice/')) {
      practiceBack?.setHandler(null)
    }
  }, [location.pathname, practiceBack])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="app-shell">
      <AppHeader />
      <Outlet key={location.pathname} />
      {childName === null && <ChildNameWelcomeModal onSave={setChildName} />}
    </div>
  )
}

export function Layout() {
  return (
    <PracticeBackProvider>
      <LayoutBody />
    </PracticeBackProvider>
  )
}
