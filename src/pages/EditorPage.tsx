import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppState } from '../context/AppState'
import { useEditorAccess } from '../hooks/useEditorAccess'
import { buildEditorBookmarkUrl } from '../lib/editorAccess'
import { getPin, setPin } from '../lib/storage'
import { parseWordList } from '../lib/words'
import { buildShareUrl, createWeekPack } from '../lib/sharePack'
import { EditorPinScreen } from '../components/EditorPinScreen'

type Gate = 'pin' | 'setup' | 'app'

export function EditorPage() {
  const { t } = useTranslation()
  const isEditor = useEditorAccess()
  const { week, setWeek } = useAppState()
  const existingPin = getPin()

  const [gate, setGate] = useState<Gate>(existingPin ? 'pin' : 'setup')
  const [pinInput, setPinInput] = useState('')
  const [pinNew, setPinNew] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState('')
  const [saveError, setSaveError] = useState('')

  const [weekLabel, setWeekLabel] = useState(week?.weekLabel ?? '')
  const [englishRaw, setEnglishRaw] = useState(week?.english.join('\n') ?? '')
  const [spanishRaw, setSpanishRaw] = useState(week?.spanish.join('\n') ?? '')
  const [shareMsg, setShareMsg] = useState('')

  if (!isEditor) return <Navigate to="/" replace />

  function unlock() {
    if (pinInput === existingPin) {
      setGate('app')
      setPinError('')
    } else {
      setPinError(t('parents.wrongPin'))
    }
  }

  function saveNewPin() {
    if (pinNew.length < 6 || pinNew.length > 32) {
      setPinError(t('parents.pinTooShort'))
      return
    }
    if (pinNew !== pinConfirm) {
      setPinError(t('parents.pinMismatch'))
      return
    }
    setPin(pinNew)
    setPinError('')
    setGate('app')
  }

  function saveLists() {
    setSaveError('')
    const english = parseWordList(englishRaw)
    const spanish = parseWordList(spanishRaw)
    if (english.length === 0 && spanish.length === 0) {
      setSaveError(t('parents.emptyLists'))
      return
    }

    const label =
      weekLabel.trim() ||
      new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

    let resetStars = false
    if (week) {
      resetStars = window.confirm(t('parents.replaceProgress'))
    }

    const pack = createWeekPack(label, english, spanish)
    setWeek(pack, resetStars)
    setWeekLabel(label)
    setEnglishRaw(english.join('\n'))
    setSpanishRaw(spanish.join('\n'))
    setShareMsg(t('parents.savedOk', { label, en: english.length, es: spanish.length }))
    window.setTimeout(() => setShareMsg(''), 5000)
  }

  async function copyShareLink() {
    setSaveError('')
    const english = parseWordList(englishRaw)
    const spanish = parseWordList(spanishRaw)
    if (english.length === 0 && spanish.length === 0) {
      setSaveError(t('parents.emptyLists'))
      return
    }
    const label =
      weekLabel.trim() ||
      new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    const pack = createWeekPack(label, english, spanish)
    const url = buildShareUrl(pack)
    await navigator.clipboard.writeText(url)
    setShareMsg(t('parents.shareCopied'))
    window.setTimeout(() => setShareMsg(''), 2500)
  }

  const enCount = parseWordList(englishRaw).length
  const esCount = parseWordList(spanishRaw).length

  if (gate === 'setup') {
    return (
      <EditorPinScreen
        mode="setup"
        pinNew={pinNew}
        pinConfirm={pinConfirm}
        pinError={pinError}
        onPinNewChange={setPinNew}
        onPinConfirmChange={setPinConfirm}
        onSubmit={saveNewPin}
      />
    )
  }

  if (gate === 'pin') {
    return (
      <EditorPinScreen
        mode="unlock"
        pinInput={pinInput}
        pinError={pinError}
        onPinInputChange={setPinInput}
        onSubmit={unlock}
      />
    )
  }

  return (
    <main className="page parents-page">
      <h2 className="page-title">{t('editor.title')}</h2>
      <p className="muted">{t('editor.hint')}</p>

      <label className="field">
        {t('parents.weekLabel')}
        <input
          className="practice-input"
          value={weekLabel}
          onChange={(e) => setWeekLabel(e.target.value)}
          placeholder={t('parents.weekLabelPlaceholder')}
        />
      </label>

      <label className="field">
        {t('parents.englishList')}
        <textarea
          className="textarea"
          rows={8}
          value={englishRaw}
          onChange={(e) => setEnglishRaw(e.target.value)}
        />
        <small className="muted">{t('parents.wordCount', { count: enCount })}</small>
      </label>

      <label className="field">
        {t('parents.spanishList')}
        <textarea
          className="textarea"
          rows={8}
          value={spanishRaw}
          onChange={(e) => setSpanishRaw(e.target.value)}
        />
        <small className="muted">{t('parents.wordCount', { count: esCount })}</small>
      </label>

      <div className="btn-row">
        <button type="button" className="btn btn--primary" onClick={saveLists}>
          {t('parents.saveWeek')}
        </button>
        <button type="button" className="btn" onClick={() => void copyShareLink()}>
          {t('parents.shareWeek')}
        </button>
      </div>
      {saveError && <p className="feedback feedback--bad" role="alert">{saveError}</p>}
      {shareMsg && (
        <p className="save-toast" role="status" aria-live="polite">
          {shareMsg}
        </p>
      )}

      <section className="card card--compact">
        <h3>{t('editor.bookmarkTitle')}</h3>
        <p className="muted small">{t('editor.bookmarkHint')}</p>
        <code className="editor-url">{buildEditorBookmarkUrl()}</code>
      </section>
    </main>
  )
}
