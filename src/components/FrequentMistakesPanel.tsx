import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { FrequentMistake } from '../lib/progress'

type Props = {
  mistakes: FrequentMistake[]
}

export function FrequentMistakesPanel({ mistakes }: Props) {
  const { t } = useTranslation()

  return (
    <section
      id="word-mistakes"
      className="card mistakes-panel"
      aria-labelledby="mistakes-panel-title"
    >
      <div className="mistakes-panel__head">
        <h2 id="mistakes-panel-title" className="mistakes-panel__title">
          {t('words.mistakesTitle')}
        </h2>
        {mistakes.length > 0 ? (
          <Link
            to="/practice/mistakes"
            className="btn btn--primary mistakes-panel__practice"
          >
            {t('words.mistakesPractice')}
          </Link>
        ) : null}
      </div>
      <p className="muted mistakes-panel__hint">{t('words.mistakesHint')}</p>
      {mistakes.length === 0 ? (
        <p className="mistakes-panel__empty muted">{t('words.mistakesEmpty')}</p>
      ) : (
        <ul className="mistakes-list">
          {mistakes.map((m) => (
            <li key={m.word} className="mistakes-list__item">
              <div className="mistakes-list__head">
                <span className="mistakes-list__word">{m.word}</span>
                <span className="mistakes-list__count">
                  {t('words.mistakesCount', { count: m.wrongCount })}
                </span>
              </div>
              {m.commonWrong.length > 0 ? (
                <div className="mistakes-list__often">
                  <p className="mistakes-list__try">{t('words.mistakesOftenWrite')}</p>
                  <ul className="mistakes-list__variants">
                    {m.commonWrong.map((cw) => (
                      <li key={cw.spelling} className="mistakes-list__variant">
                        <span className="mistakes-list__wrong">«{cw.spelling}»</span>{' '}
                        <span className="mistakes-list__variant-count">
                          {t('words.mistakesOftenCount', { count: cw.count })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mistakes-list__nodetail muted">{t('words.mistakesNoDetail')}</p>
              )}
              {m.mastered ? (
                <p className="mistakes-list__ok muted">{t('words.mistakesNowMastered')}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
