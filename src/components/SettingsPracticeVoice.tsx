import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LangFlag } from './LangFlag'
import {
  filterVoicesForSpellingLang,
  isAppleTouchWebKit,
  waitForSpeechVoices,
} from '../lib/deviceSpeech'
import {
  loadDeviceVoiceUri,
  loadSpeechEngine,
  saveDeviceVoiceUri,
  saveSpeechEngine,
} from '../lib/storage'
import { speakWord, unlockAudio } from '../lib/speech'
import type { SpeechEngine, SpellingLang } from '../types'

const PREVIEW_WORD: Record<SpellingLang, string> = {
  english: 'hello',
  spanish: 'hola',
}

type Props = {
  practiceLang: SpellingLang
}

export function SettingsPracticeVoice({ practiceLang }: Props) {
  const { t } = useTranslation()
  const groupId = useId()
  const selectId = `${groupId}-voice`
  const [engine, setEngine] = useState<SpeechEngine>(() => loadSpeechEngine(practiceLang))
  const [voiceUri, setVoiceUri] = useState<string>(() => loadDeviceVoiceUri(practiceLang) ?? '')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    const sync = () => {
      void waitForSpeechVoices().then(setVoices)
    }
    sync()
    synth.addEventListener('voiceschanged', sync)
    return () => synth.removeEventListener('voiceschanged', sync)
  }, [])

  const onApple = isAppleTouchWebKit()
  const activeEngine: SpeechEngine = onApple ? 'device' : engine
  const voiceOptions = filterVoicesForSpellingLang(voices, practiceLang)
  const langLabel = t(practiceLang === 'english' ? 'words.english' : 'words.spanish')
  const piperDetail = t(
    practiceLang === 'english' ? 'settings.voicePiperDetailEnglish' : 'settings.voicePiperDetailSpanish',
  )

  function setEngineChoice(next: SpeechEngine) {
    setEngine(next)
    saveSpeechEngine(practiceLang, next)
  }

  function onVoiceChange(uri: string) {
    setVoiceUri(uri)
    saveDeviceVoiceUri(practiceLang, uri || null)
  }

  function preview() {
    unlockAudio()
    void speakWord(PREVIEW_WORD[practiceLang], practiceLang, { preferPiper: true })
  }

  return (
    <article
      className={`settings-voice__panel settings-voice__panel--${practiceLang}`}
      aria-labelledby={`${groupId}-heading`}
    >
      <header className="settings-voice__panel-head" id={`${groupId}-heading`}>
        <LangFlag lang={practiceLang} className="settings-voice__flag" />
        <span className="settings-voice__panel-title">{langLabel}</span>
      </header>

      {onApple ? (
        <p className="muted settings-voice__platform">{t('settings.voiceAppleNote')}</p>
      ) : (
        <div className="settings-voice__choices" role="radiogroup" aria-label={langLabel}>
          <button
            type="button"
            role="radio"
            aria-checked={engine === 'piper'}
            className={`settings-voice__choice ${engine === 'piper' ? 'settings-voice__choice--active' : ''}`}
            onClick={() => setEngineChoice('piper')}
          >
            <span className="settings-voice__choice-main">{t('settings.voicePiper')}</span>
            <span className="settings-voice__choice-sub muted">{piperDetail}</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={engine === 'device'}
            className={`settings-voice__choice ${engine === 'device' ? 'settings-voice__choice--active' : ''}`}
            onClick={() => setEngineChoice('device')}
          >
            <span className="settings-voice__choice-main">{t('settings.voiceDevice')}</span>
            <span className="settings-voice__choice-sub muted">{t('settings.voiceDeviceDetail')}</span>
          </button>
        </div>
      )}

      {activeEngine === 'device' && (
        <div className="settings-voice__device">
          <label className="settings-form__label" htmlFor={selectId}>
            {t('settings.voiceDevicePick')}
          </label>
          {voiceOptions.length === 0 ? (
            <p className="muted settings-voice__empty">{t('settings.voiceDeviceEmpty')}</p>
          ) : (
            <select
              id={selectId}
              className="settings-form__input settings-voice__select"
              value={voiceUri || voiceOptions[0]?.voiceURI || ''}
              onChange={(e) => onVoiceChange(e.target.value)}
            >
              {voiceOptions.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                  {v.localService ? '' : ` (${t('settings.voiceNetwork')})`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <button type="button" className="btn btn--secondary settings-voice__preview" onClick={preview}>
        {t('settings.voicePreview')}
      </button>
    </article>
  )
}
