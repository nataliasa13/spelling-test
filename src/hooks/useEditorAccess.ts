import { useSyncExternalStore } from 'react'
import { isEditorUnlocked } from '../lib/editorAccess'

function subscribe(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener('spellings-editor-change', onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener('spellings-editor-change', onStoreChange)
  }
}

function getSnapshot(): boolean {
  return isEditorUnlocked()
}

export function notifyEditorAccessChanged(): void {
  window.dispatchEvent(new Event('spellings-editor-change'))
}

export function useEditorAccess(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
