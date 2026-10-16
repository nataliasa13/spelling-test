import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AppStateProvider } from './context/AppState'
import { HomePage } from './pages/HomePage'
import { WordsPage } from './pages/WordsPage'
import { PracticePage } from './pages/PracticePage'
import { SettingsPage } from './pages/SettingsPage'
import { DiagPage } from './pages/DiagPage'

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/words" element={<WordsPage />} />
            <Route path="/practice/:mode/:sub?" element={<PracticePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Oculta: sin enlaces, solo para depurar en el móvil. */}
            <Route path="/diag" element={<DiagPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppStateProvider>
  )
}
