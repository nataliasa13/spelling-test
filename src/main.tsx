import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ensureLatestAppBuild } from './lib/appVersion'
import { installNavDiagnostics } from './lib/navDiagnostics'
import './i18n'
import './index.css'
import App from './App.tsx'

async function bootstrap() {
  installNavDiagnostics()
  await ensureLatestAppBuild()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
