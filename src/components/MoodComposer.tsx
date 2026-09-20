import { useMemo, useState, type ChangeEvent as ReactChangeEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { Check, LocateFixed, MapPinOff, ShieldCheck, X } from 'lucide-react'
import { copy, emotionMeta, reasonMeta } from '../i18n'
import { countryForCoordinates } from '../lib/geo'
import type { EmotionKey, MoodEntry, ReasonKey, SubmitResult } from '../lib/types'

const emotions: EmotionKey[] = ['great', 'good', 'calm', 'okay', 'tired', 'low', 'stressed', 'angry']
const reasons: ReasonKey[] = ['work', 'family', 'money', 'health', 'love', 'weather', 'other']
const scoreByEmotion: Record<EmotionKey, number> = {
  great: 9,
  good: 7.8,
  calm: 6.8,
  okay: 5.6,
  tired: 4.7,
  low: 3.7,
  stressed: 3.1,
  angry: 2.8
}

export function MoodComposer({ open, liveSharing, onClose, onSubmit }: {
  open: boolean
  liveSharing: boolean
  onClose: () => void
  onSubmit: (entry: MoodEntry) => Promise<SubmitResult>
}) {
  const [emotion, setEmotion] = useState<EmotionKey>('good')
  const [intensity, setIntensity] = useState(3)
  const [reason, setReason] = useState<ReasonKey | undefined>(undefined)
  const [note, setNote] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number; countryCode?: string } | null>(null)
  const [locating, setLocating] = useState(false)
  const [sent, setSent] = useState(false)
  const [shared, setShared] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const score = useMemo(() => {
    const base = scoreByEmotion[emotion]
    const direction = base >= 5.5 ? 1 : -1
    return Math.max(1, Math.min(10, Number((base + (intensity - 3) * 0.22 * direction).toFixed(1))))
  }, [emotion, intensity])

  if (!open) return null

  const locate = () => {
    if (!navigator.geolocation) {
      setMessage('Location is not available in this browser.')
      return
    }

    setLocating(true)
    setMessage(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const country = countryForCoordinates(coords.latitude, coords.longitude)
        setLocation({
          lat: Math.round(coords.latitude * 2) / 2,
          lng: Math.round(coords.longitude * 2) / 2,
          countryCode: country?.code
        })
        setLocating(false)
      },
      () => {
        setLocating(false)
        setMessage('Location permission was not granted. You can still share your mood without location.')
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 15 * 60 * 1000 }
    )
  }

  const submit = async () => {
    if (sending) return
    setSending(true)
    setMessage(null)

    const entry: MoodEntry = {
      id: crypto.randomUUID(),
      score,
      emotion,
      intensity,
      reason,
      note: note.trim() || undefined,
      lat: location?.lat,
      lng: location?.lng,
      countryCode: location?.countryCode,
      createdAt: new Date().toISOString(),
      source: 'local'
    }

    const result = await onSubmit(entry)
    setShared(result.shared)
    if (result.reason === 'rate-limit') setMessage(copy.rateLimited)
    if (result.reason === 'network-error') setMessage('Your private journal was saved, but the live network could not receive this pulse.')
    setSent(true)
    setSending(false)
  }

  const closeAndReset = () => {
    setEmotion('good')
    setIntensity(3)
    setReason(undefined)
    setNote('')
    setLocation(null)
    setSent(false)
    setShared(false)
    setMessage(null)
    onClose()
  }

  return (
    <div className="composer-backdrop" role="presentation" onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) closeAndReset() }}>
      <section className="composer-sheet" role="dialog" aria-modal="true" aria-labelledby="mood-composer-title">
        <header className="composer-head">
          <div>
            <span className="eyebrow">YOUR PULSE</span>
            <h2 id="mood-composer-title">{copy.howFeel}</h2>
            <p>{copy.chooseEmotion}</p>
          </div>
          <button className="icon-button" onClick={closeAndReset} aria-label="Close"><X size={19} /></button>
        </header>

        {!sent ? (
          <>
            <div className="emotion-grid">
              {emotions.map((key) => (
                <button
                  key={key}
                  className={emotion === key ? 'is-selected' : ''}
                  onClick={() => setEmotion(key)}
                  aria-pressed={emotion === key}
                >
                  <span>{emotionMeta[key].emoji}</span>
                  <strong>{emotionMeta[key].name}</strong>
                </button>
              ))}
            </div>

            <div className="composer-section intensity-section">
              <div className="field-label"><span>{copy.intensity}</span><strong>{intensity}/5</strong></div>
              <div className="intensity-row">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} className={intensity === value ? 'is-selected' : ''} onClick={() => setIntensity(value)} aria-label={`Intensity ${value}`}>
                    <span />
                  </button>
                ))}
              </div>
              <div className="score-preview"><span>Pulse score</span><strong>{score.toFixed(1)}</strong><small>/10</small></div>
            </div>

            <div className="composer-section">
              <div className="field-label"><span>{copy.why}</span><em>{copy.optional}</em></div>
              <div className="reason-chips">
                {reasons.map((key) => (
                  <button key={key} className={reason === key ? 'is-selected' : ''} onClick={() => setReason(reason === key ? undefined : key)}>
                    {reasonMeta[key].emoji} {reasonMeta[key].name}
                  </button>
                ))}
              </div>
            </div>

            <label className="composer-section note-field">
              <div className="field-label"><span>{copy.note}</span><em>{copy.optional}</em></div>
              <textarea maxLength={160} value={note} onChange={(event: ReactChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value)} placeholder={copy.notePlaceholder} />
              <small>{note.length}/160 · never shared publicly</small>
            </label>

            <div className="location-box">
              <button onClick={location ? () => setLocation(null) : locate} disabled={locating}>
                {location ? <MapPinOff size={18} /> : <LocateFixed size={18} />}
                {locating ? 'Finding approximate location…' : location ? copy.locationOn : copy.location}
              </button>
              <span>{copy.locationHelp}</span>
            </div>

            <div className="privacy-inline">
              <ShieldCheck size={17} />
              <span><strong>{copy.privateByDesign}.</strong> {copy.privacyText}</span>
            </div>

            {!liveSharing && <div className="truth-notice">{copy.localOnlyNotice}</div>}
            {message && <div className="composer-message">{message}</div>}
            <button className="primary-button composer-submit" onClick={submit} disabled={sending}>{sending ? 'Sending…' : copy.sendMood}</button>
          </>
        ) : (
          <div className="success-state">
            <div className="success-orb"><Check size={36} /></div>
            <span className="success-emoji">{emotionMeta[emotion].emoji}</span>
            <h2>{copy.thanks}</h2>
            <p>{shared ? copy.thanksLiveBody : copy.thanksLocalBody}</p>
            {message && <div className="composer-message">{message}</div>}
            <button className="primary-button" onClick={closeAndReset}>{copy.close}</button>
          </div>
        )}
      </section>
    </div>
  )
}
