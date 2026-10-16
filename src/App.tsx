import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AppStateProvider } from './context/AppState'
import { HomePage } from './pages/HomePage'
import { WordsPage } from './pages/WordsPage'
import { PracticePage } from './pages/PracticePage'
import { SettingsPage } from './pages/SettingsPage'
import { DiagPage } from './pages/DiagPage'

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/words', element: <WordsPage /> },
        { path: '/practice/:mode/:sub?', element: <PracticePage /> },
        { path: '/settings', element: <SettingsPage /> },
        /** Oculta: sin enlaces, solo para depurar en el móvil. */
        { path: '/diag', element: <DiagPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
)

export default function App() {
  return (
    <AppStateProvider>
      <RouterProvider router={router} />
    </AppStateProvider>
  )
}
