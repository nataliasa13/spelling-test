const STORAGE_KEY = 'spellings_editor_unlocked'
const QUERY_KEY = 'editor'
const FLASH_KEY = 'spellings_editor_flash'

/** Set in `.env` as VITE_EDITOR_KEY — only you share URLs containing this value. */
export function getEditorKeyFromEnv(): string {
  const key = import.meta.env.VITE_EDITOR_KEY as string | undefined
  return key?.trim() ?? ''
}

export function isEditorUnlocked(): boolean {
  if (!getEditorKeyFromEnv()) return false
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export function unlockEditor(): void {
  localStorage.setItem(STORAGE_KEY, '1')
}

export function lockEditor(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** Call once on load: `?editor=YOUR_KEY` unlocks this device for editing. */
export function consumeEditorParamFromUrl(): boolean {
  const expected = getEditorKeyFromEnv()
  const params = new URLSearchParams(window.location.search)
  const provided = params.get(QUERY_KEY)

  if (!provided) return false

  if (!expected) {
    if (import.meta.env.DEV) {
      console.warn(
        '[spellings] ?editor=… ignored: define VITE_EDITOR_KEY in .env and restart `npm run dev`.',
      )
    }
    return false
  }

  if (provided !== expected) {
    if (import.meta.env.DEV) {
      console.warn(
        '[spellings] ?editor=… does not match VITE_EDITOR_KEY (check .env and restart dev server).',
      )
    }
    return false
  }

  unlockEditor()
  sessionStorage.setItem(FLASH_KEY, '1')
  params.delete(QUERY_KEY)
  const q = params.toString()
  const path = window.location.pathname + (q ? `?${q}` : '')
  window.history.replaceState({}, '', path)
  return true
}

export function takeEditorUnlockFlash(): boolean {
  if (sessionStorage.getItem(FLASH_KEY) !== '1') return false
  sessionStorage.removeItem(FLASH_KEY)
  return true
}

export function buildEditorBookmarkUrl(): string {
  const key = getEditorKeyFromEnv()
  if (!key) return window.location.origin + window.location.pathname
  const base = window.location.origin + window.location.pathname
  return `${base}?${QUERY_KEY}=${encodeURIComponent(key)}`
}
