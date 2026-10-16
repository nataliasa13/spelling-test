import { useState } from 'react'
import { clearNavDiag, loadNavDiag, type NavDiagEntry } from '../lib/navDiagnostics'
import { loadPracticeSession } from '../lib/practiceSession'

function formatTime(t: number): string {
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatEntry(e: NavDiagEntry): string {
  const detail = e.detail ? ` ${JSON.stringify(e.detail)}` : ''
  return `${formatTime(e.t)}  ${e.event}  ${e.path}${detail}`
}

/** Ruta oculta /diag: historial de cargas y navegaciones (sin traducir, es para depurar). */
export function DiagPage() {
  const [entries, setEntries] = useState(() => loadNavDiag().slice().reverse())
  const session = loadPracticeSession()
  const text = entries.map(formatEntry).join('\n')

  return (
    <main className="page">
      <h2 className="page-title">Diagnóstico</h2>
      <p className="muted">
        Sesión guardada:{' '}
        {session
          ? `${session.routeMode} · ${session.payload.type} · activa=${session.active}`
          : 'ninguna'}
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="btn"
          onClick={() => void navigator.clipboard?.writeText(text).catch(() => {})}
        >
          Copiar
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            clearNavDiag()
            setEntries([])
          }}
        >
          Borrar
        </button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.75rem' }}>
        {text || 'Sin registros.'}
      </pre>
    </main>
  )
}
