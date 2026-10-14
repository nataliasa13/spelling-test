import { getLanguageDef } from '../config/languages'
import type { SpellingLang } from '../types'

type Props = {
  lang: SpellingLang
  className?: string
  size?: 'sm' | 'md'
}

export function LangFlag({ lang, className = '', size = 'md' }: Props) {
  const { flagSrc } = getLanguageDef(lang)
  return (
    <img
      className={`lang-flag lang-flag--${size} ${className}`.trim()}
      src={flagSrc}
      alt=""
      width={size === 'sm' ? 20 : 28}
      height={size === 'sm' ? 14 : 20}
      decoding="async"
    />
  )
}
