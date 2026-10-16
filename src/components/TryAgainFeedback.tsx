import {
  getTryAgainFeedbackMessage,
  type TryAgainFeedbackKind,
} from '../lib/tryAgainFeedback'
import type { SpellingLang } from '../types'

function TryAgainIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`try-again-feedback__icon ${className}`.trim()}
      viewBox="0 0 48 48"
      aria-hidden
      focusable="false"
    >
      <circle cx="24" cy="24" r="22" fill="currentColor" opacity="0.12" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M30 18a8 8 0 1 0 1.2 12.2M30 14v6h-6"
      />
    </svg>
  )
}

type Props = {
  lang: SpellingLang
  childName?: string | null
  kind: TryAgainFeedbackKind
  word?: string
}

export function TryAgainFeedback({ lang, childName, kind, word }: Props) {
  const message = getTryAgainFeedbackMessage(lang, childName, kind, word)

  return (
    <div className="try-again-feedback" role="status" aria-live="polite">
      <TryAgainIcon />
      <p className="try-again-feedback__message">{message}</p>
    </div>
  )
}
