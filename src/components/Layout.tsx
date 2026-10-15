import { Outlet } from 'react-router-dom'
import { useAppState } from '../context/AppState'
import { PracticeBackProvider } from '../context/PracticeBackContext'
import { AppHeader } from './AppHeader'
import { ChildNameWelcomeModal } from './ChildNameWelcomeModal'

export function Layout() {
  const { childName, setChildName } = useAppState()

  return (
    <PracticeBackProvider>
    <div className="app-shell">
      <AppHeader />
      <Outlet />
      {childName === null && <ChildNameWelcomeModal onSave={setChildName} />}
    </div>
    </PracticeBackProvider>
  )
}
