import { useMemo, useState } from 'react'
import { Check, LocateFixed, MapPinOff, ShieldCheck, X } from 'lucide-react'
import { emotionMeta, reasonMeta, reasonName, t } from '../i18n'
import type { EmotionKey, Language, MoodEntry, ReasonKey } from '../lib/types'

const scoreByEmotion: Record<EmotionKey, number> = {
  great: 9.4, good: 8, calm: 7, okay: 5.8, tired: 4.8, low: 3.9, stressed: 3.2, angry: 2.8
}

const emotions = Object.keys(emotionMeta) as EmotionKey[]
const reasons = Object.keys(reasonMeta) as ReasonKey[]

export function MoodComposer({ open, language, onClose, onSubmit }: {
  open: boolean
  language: Language
  onClose: () => void
  onSubmit: (entry: MoodEntry) => Promise<void> | void
}) {
  const c = t(language)
  const [emotion, setEmotion] = useState<EmotionKey>('good')
  const [intensity, setIntensity] = useState(3)
  const [reason, setReason] = useState<ReasonKey | undefined>()
  const [note, setNote] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const score = useMemo(() => {
    const base = scoreByEmotion[emotion]
    const direction = base >= 5.5 ? 1 : -1
    return Math.max(1, Math.min(10, Number((base + (intensity - 3) * 0.22 * direction).toFixed(1))))
  }, [emotion, intensity])

  if (!open) return null

  const locate = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = Math.round(coords.latitude * 2) / 2
        const lng = Math.round(coords.longitude * 2) / 2
        setLocation({ lat, lng })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 15 * 60 * 1000 }
    )
  }

  const submit = async () => {
    setSending(true)
    const entry: MoodEntry = {
      id: crypto.randomUUID(),
      score,
      emotion,
      intensity,
      reason,
      note: note.trim() || undefined,
      lat: location?.lat,
      lng: location?.lng,
      createdAt: new Date().toISOString(),
      source: 'local'
    }
    await onSubmit(entry)
    setSending(false)
    setSent(true)
  }

  const closeAndReset = () => {
    onClose()
    window.setTimeout(() => {
      setSent(false)
      setEmotion('good')
      setIntensity(3)
      setReason(undefined)
      setNote('')
      setLocation(null)
    }, 250)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAndReset() }}>
      <section className="mood-sheet" role="dialog" aria-modal="true" aria-labelledby="mood-composer-title">
        <button className="icon-button sheet-close" onClick={closeAndReset} aria-label="Close"><X size={20} /></button>
        {!sent ? (
          <>
            <div className="sheet-head">
              <span className="sheet-kicker">{emotionMeta[emotion].emoji} {score.toFixed(1)} / 10</span>
              <h2 id="mood-composer-title">{c.howFeel}</h2>
              <p>{c.chooseEmotion}</p>
            </div>
            <div className="emotion-grid">
              {emotions.map((key) => (
                <button key={key} className={`emotion-button ${emotion === key ? 'is-selected' : ''}`} onClick={() => setEmotion(key)}>
                  <span>{emotionMeta[key].emoji}</span>
                  <strong>{emotionMeta[key][language]}</strong>
                </button>
              ))}
            </div>
            <div className="composer-section">
              <div className="field-label"><span>{c.intensity}</span><strong>{intensity}/5</strong></div>
              <div className="intensity-row">
                {[1,2,3,4,5].map((level) => <button key={level} aria-label={`${c.intensity} ${level}`} className={level <= intensity ? 'is-on' : ''} onClick={() => setIntensity(level)} />)}
              </div>
            </div>
            <div className="composer-section">
              <div className="field-label"><span>{c.why}</span><em>{c.optional}</em></div>
              <div className="reason-chips">
                {reasons.map((key) => (
                  <button key={key} className={reason === key ? 'is-selected' : ''} onClick={() => setReason(reason === key ? undefined : key)}>
                    {reasonMeta[key].emoji} {reasonName(key, language)}
                  </button>
                ))}
              </div>
            </div>
            <label className="composer-section note-field">
              <div className="field-label"><span>{c.note}</span><em>{c.optional}</em></div>
              <textarea maxLength={160} value={note} onChange={(e) => setNote(e.target.value)} placeholder={c.notePlaceholder} />
              <small>{note.length}/160</small>
            </label>
            <div className="location-box">
              <button onClick={location ? () => setLocation(null) : locate} disabled={locating}>
                {location ? <MapPinOff size={18}/> : <LocateFixed size={18}/>} {location ? c.locationOn : c.location}
              </button>
              <span>{c.locationHelp}</span>
            </div>
            <div className="privacy-inline"><ShieldCheck size={17}/><span><strong>{c.privateByDesign}.</strong> {c.privacyText}</span></div>
            <button className="primary-button composer-submit" onClick={submit} disabled={sending}>{sending ? '…' : c.sendMood}</button>
          </>
        ) : (
          <div className="success-state">
            <div className="success-orb"><Check size={36}/></div>
            <span className="success-emoji">{emotionMeta[emotion].emoji}</span>
            <h2>{c.thanks}</h2>
            <p>{c.thanksBody}</p>
            <button className="primary-button" onClick={closeAndReset}>{c.close}</button>
          </div>
        )}
      </section>
    </div>
  )
}
