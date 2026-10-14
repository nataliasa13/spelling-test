import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AppStateProvider } from './context/AppState'
import { HomePage } from './pages/HomePage'
import { WordsPage } from './pages/WordsPage'
import { PracticePage } from './pages/PracticePage'
import { EditorPage } from './pages/EditorPage'
import { SettingsPage } from './pages/SettingsPage'
import { ImportPage } from './pages/ImportPage'

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/words" element={<WordsPage />} />
            <Route path="/practice/:mode" element={<PracticePage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/import" element={<ImportPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppStateProvider>
  )
}
