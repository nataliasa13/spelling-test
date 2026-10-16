/**
 * Registro local de cargas/navegaciones para depurar reinicios en móvil.
 * Solo visible en la ruta oculta /diag (sin enlaces desde la app).
 */

declare const __APP_BUILD_ID__: string

const LOG_KEY = 'spellings_nav_diag'
/** true mientras hay un documento vivo; pagehide lo pone a false. */
const ALIVE_KEY = 'spellings_nav_diag_alive'
const MAX_ENTRIES = 80

export type NavDiagEntry = {
  t: number
  event: string
  path: string
  detail?: Record<string, unknown>
}

let installed = false

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}`
}

export function loadNavDiag(): NavDiagEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    const parsed = raw ? (JSON.parse(raw) as NavDiagEntry[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function clearNavDiag(): void {
  try {
    localStorage.removeItem(LOG_KEY)
  } catch {
    /* */
  }
}

export function logNavDiag(event: string, detail?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    const entries = loadNavDiag()
    entries.push({ t: Date.now(), event, path: currentPath(), detail })
    localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch {
    /* quota / bloqueado */
  }
}

function navigationType(): string {
  const nav = performance.getEntriesByType?.('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined
  return nav?.type ?? 'unknown'
}

export function installNavDiagnostics(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  let prevUnclean = false
  try {
    // Si el documento anterior no llegó a pagehide, probablemente lo mató el sistema.
    prevUnclean = localStorage.getItem(ALIVE_KEY) === '1'
    localStorage.setItem(ALIVE_KEY, '1')
  } catch {
    /* */
  }

  logNavDiag('load', {
    type: navigationType(),
    prevUnclean,
    build: typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev',
    historyLength: window.history.length,
  })

  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return
    try {
      localStorage.setItem(ALIVE_KEY, '1')
    } catch {
      /* */
    }
    logNavDiag('bfcache-restore')
  })
  window.addEventListener('pagehide', (e) => {
    try {
      localStorage.setItem(ALIVE_KEY, '0')
    } catch {
      /* */
    }
    logNavDiag('pagehide', { persisted: e.persisted })
  })
  window.addEventListener('popstate', () => logNavDiag('popstate'))
  document.addEventListener('visibilitychange', () => logNavDiag(document.visibilityState))
}
