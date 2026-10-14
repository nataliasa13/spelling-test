import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getSpeechPrepProgress,
  subscribeSpeechPrepProgress,
  type SpeechPrepProgressView,
} from '../lib/speech'

/** Texto del botón mientras Piper descarga o inicializa (móvil: puede tardar minutos). */
export function useVoiceLoadingLabel(loading: boolean, idleLabel: string): string {
  const { t } = useTranslation()
  const [progress, setProgress] = useState<SpeechPrepProgressView | null>(null)

  useEffect(() => {
    if (!loading) {
      setProgress(null)
      return
    }
    const sync = () => setProgress(getSpeechPrepProgress())
    sync()
    return subscribeSpeechPrepProgress(sync)
  }, [loading])

  if (!loading) return idleLabel
  if (progress?.kind === 'pct') {
    return t('practice.voiceDownloading', { pct: progress.pct })
  }
  if (progress?.kind === 'loaded') {
    return t('practice.voiceDownloadingMb', { mb: progress.mb })
  }
  return t('practice.voiceLoading')
}
