import { getCorrectFeedbackMessage } from '../lib/correctFeedback'
import type { SpellingLang } from '../types'

function CorrectIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`correct-feedback__icon ${className}`.trim()}
      viewBox="0 0 48 48"
      aria-hidden
      focusable="false"
    >
      <circle cx="24" cy="24" r="22" fill="currentColor" opacity="0.14" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 25.5 21 32.5 34 16"
      />
    </svg>
  )
}

type Props = {
  lang: SpellingLang
  childName?: string | null
  /** Palabra acertada — refuerzo visual para quien aún no lee el mensaje. */
  word?: string
}

export function CorrectFeedback({ lang, childName, word }: Props) {
  const message = getCorrectFeedbackMessage(lang, childName)

  return (
    <div className="correct-feedback" role="status" aria-live="polite">
      <CorrectIcon />
      <p className="correct-feedback__message">{message}</p>
      {word?.trim() ? (
        <p className="correct-feedback__word" aria-hidden>
          {word.trim()}
        </p>
      ) : null}
    </div>
  )
}
