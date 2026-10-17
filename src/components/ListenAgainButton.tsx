import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVoiceLoadingLabel } from '../hooks/useVoiceLoadingLabel'
import {
  ensureSpeechReady,
  isSpeechSessionWarm,
  speakWord,
  unlockAudio,
} from '../lib/speech'
import type { SpellingLang } from '../types'

type IconProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/** Icono de altavoz — mismo dibujo en toda la app (no emoji). */
export function ListenIcon({ className = '', size = 'md' }: IconProps) {
  return (
    <svg
      className={`listen-icon listen-icon--${size} ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3 10v4h4l5 5V5L7 10H3zm7-.17v6.34L7.83 13H5v-2h2.83L10 9.83zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05a4.48 4.48 0 0 0 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"
      />
    </svg>
  )
}

type ButtonProps = {
  word: string
  lang: SpellingLang
  className?: string
  /** Solo icono (p. ej. lista de palabras). */
  iconOnly?: boolean
}

type ListenUiPhase = 'idle' | 'preparing' | 'playing'

export function ListenAgainButton({
  word,
  lang,
  className = '',
  iconOnly = false,
}: ButtonProps) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<ListenUiPhase>('idle')
  const clickToken = useRef(0)

  const busy = phase !== 'idle'
  const preparingLabel = useVoiceLoadingLabel(phase === 'preparing', t('practice.listen'))
  const label =
    phase === 'playing'
      ? t('practice.voicePlaying')
      : phase === 'preparing'
        ? preparingLabel
        : t('practice.listen')
  const ariaLabel = iconOnly ? t('words.listenA11y', { word }) : label

  function onListen() {
    unlockAudio()
    const token = ++clickToken.current
    setPhase(isSpeechSessionWarm(lang) ? 'playing' : 'preparing')
    void (async () => {
      try {
        await ensureSpeechReady(lang)
        if (clickToken.current !== token) return
        setPhase('playing')
        await speakWord(word, lang, { preferPiper: true })
      } finally {
        if (clickToken.current === token) setPhase('idle')
      }
    })()
  }

  return (
    <button
      type="button"
      className={`btn listen-again-btn ${iconOnly ? 'listen-again-btn--icon' : ''} ${busy ? `listen-again-btn--${phase}` : ''} ${className}`.trim()}
      onClick={onListen}
      aria-busy={busy}
      aria-live={iconOnly ? undefined : 'polite'}
      aria-label={iconOnly ? ariaLabel : undefined}
      title={iconOnly ? ariaLabel : undefined}
    >
      <ListenIcon className="listen-again-btn__icon" size="sm" />
      {!iconOnly ? <span className="listen-again-btn__label">{label}</span> : null}
    </button>
  )
}
