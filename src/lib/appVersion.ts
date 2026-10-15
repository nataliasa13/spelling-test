const RELOAD_FOR_KEY = 'spellings_app_reload_for'

/** Id embebido en el bundle de esta sesión (hash del commit en producción). */
declare const __APP_BUILD_ID__: string

function baseUrl(): string {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base : `${base}/`
}

function reloadWithCacheBust(build: string): void {
  const root = baseUrl()
  const url = new URL(root, window.location.origin)
  url.searchParams.set('app_build', build)
  sessionStorage.setItem(RELOAD_FOR_KEY, build)
  window.location.replace(url.toString())
}

/**
 * Si hay un despliegue nuevo, recarga con URL distinta para evitar index.html en caché.
 * Los assets hashed de Vite ya se actualizan solos; el problema suele ser el HTML antiguo.
 */
export async function ensureLatestAppBuild(): Promise<void> {
  const embedded = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev'

  let remoteBuild: string | undefined
  try {
    const res = await fetch(`${baseUrl()}version.json?check=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return
    const data = (await res.json()) as { build?: string }
    remoteBuild = data.build
  } catch {
    return
  }

  if (!remoteBuild || remoteBuild === embedded) return

  if (sessionStorage.getItem(RELOAD_FOR_KEY) === remoteBuild) {
    return
  }

  reloadWithCacheBust(remoteBuild)
  await new Promise<void>(() => {})
}
