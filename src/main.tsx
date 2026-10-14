import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { consumeEditorParamFromUrl } from './lib/editorAccess'
import { notifyEditorAccessChanged } from './hooks/useEditorAccess'
import './i18n'
import './index.css'
import App from './App.tsx'

if (consumeEditorParamFromUrl()) notifyEditorAccessChanged()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
