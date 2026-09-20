import { useMemo, useState, type ChangeEvent as ReactChangeEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { Check, LocateFixed, MapPin, ShieldCheck, X } from 'lucide-react'
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

type ApproximateLocation = { lat: number; lng: number; countryCode?: string }

function requestApproximateLocation(): Promise<ApproximateLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GEOLOCATION_UNAVAILABLE'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const country = countryForCoordinates(coords.latitude, coords.longitude)
        resolve({
          lat: Math.round(coords.latitude * 2) / 2,
          lng: Math.round(coords.longitude * 2) / 2,
          countryCode: country?.code
        })
      },
      reject,
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60 * 1000 }
    )
  })
}

export function MoodComposer({ open, liveSharing, onClose, onSubmit }: {
  open: boolean
  liveSharing: boolean
  onClose: () => void
  onSubmit: (entry: MoodEntry) => Promise<SubmitResult>
}) {
  const [emotion, setEmotion] = useState<EmotionKey>('good')
  const [intensity, setIntensity] = useState(3)
  const [reason, setReason] = useState<ReasonKey | undefined>()
  const [note, setNote] = useState('')
  const [mapLocationEnabled, setMapLocationEnabled] = useState(true)
  const [location, setLocation] = useState<ApproximateLocation | null>(null)
  const [locating, setLocating] = useState(false)
  const [sent, setSent] = useState(false)
  const [shared, setShared] = useState(false)
  const [mapped, setMapped] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const score = useMemo(() => {
    const base = scoreByEmotion[emotion]
    const direction = base >= 5.5 ? 1 : -1
    return Math.max(1, Math.min(10, Number((base + (intensity - 3) * 0.22 * direction).toFixed(1))))
  }, [emotion, intensity])

  if (!open) return null

  const locate = async () => {
    setLocating(true)
    setMessage(null)
    try {
      const next = await requestApproximateLocation()
      setLocation(next)
      setMapLocationEnabled(true)
      return next
    } catch {
      setMessage('Location permission is needed to place your pulse on the map. You can turn Map placement off and still share anonymously.')
      return null
    } finally {
      setLocating(false)
    }
  }

  const toggleMapLocation = () => {
    const next = !mapLocationEnabled
    setMapLocationEnabled(next)
    setMessage(null)
    if (!next) setLocation(null)
  }

  const submit = async () => {
    if (sending || locating) return
    setSending(true)
    setMessage(null)

    let resolvedLocation = location
    if (mapLocationEnabled && !resolvedLocation) {
      resolvedLocation = await locate()
      if (!resolvedLocation) {
        setSending(false)
        return
      }
    }

    const entry: MoodEntry = {
      id: crypto.randomUUID(),
      score,
      emotion,
      intensity,
      reason,
      note: note.trim() || undefined,
      lat: mapLocationEnabled ? resolvedLocation?.lat : undefined,
      lng: mapLocationEnabled ? resolvedLocation?.lng : undefined,
      countryCode: mapLocationEnabled ? resolvedLocation?.countryCode : undefined,
      createdAt: new Date().toISOString(),
      source: 'local'
    }

    const result = await onSubmit(entry)
    setShared(result.shared)
    setMapped(Boolean(result.shared && entry.lat != null && entry.lng != null))
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
    setMapLocationEnabled(true)
    setLocation(null)
    setSent(false)
    setShared(false)
    setMapped(false)
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
            <div className="emotion-grid" aria-label="Choose your mood">
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
              <div className="intensity-row" role="group" aria-label="Mood intensity">
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
              <small>{note.length}/160 · private on this device</small>
            </label>

            <div className={`map-placement ${mapLocationEnabled ? 'is-enabled' : ''}`}>
              <div className="map-placement-copy">
                <div className="map-placement-icon"><MapPin size={19} /></div>
                <div>
                  <strong>Place this pulse on the live map</strong>
                  <span>{location ? `Approximate area ready${location.countryCode ? ` · ${location.countryCode}` : ''}` : 'On by default. We will ask for location only when you post.'}</span>
                </div>
              </div>
              <button className={`switch-control ${mapLocationEnabled ? 'is-on' : ''}`} onClick={toggleMapLocation} role="switch" aria-checked={mapLocationEnabled} aria-label="Share approximate map location"><i /></button>
              {mapLocationEnabled && (
                <button className="location-preview-button" onClick={locate} disabled={locating}>
                  <LocateFixed size={16} />
                  {locating ? 'Finding area…' : location ? 'Refresh area' : 'Set approximate area now'}
                </button>
              )}
              <small>Exact GPS is never stored. Coordinates are rounded to a coarse 0.5° area before sharing.</small>
            </div>

            <div className="privacy-inline">
              <ShieldCheck size={17} />
              <span><strong>{copy.privateByDesign}.</strong> {copy.privacyText}</span>
            </div>

            {!liveSharing && <div className="truth-notice">{copy.localOnlyNotice}</div>}
            {message && <div className="composer-message">{message}</div>}
            <button className="primary-button composer-submit" onClick={submit} disabled={sending || locating}>
              {locating ? 'Preparing map location…' : sending ? 'Sending pulse…' : mapLocationEnabled ? 'Share pulse on the map' : copy.sendMood}
            </button>
          </>
        ) : (
          <div className="success-state">
            <div className="success-orb"><Check size={36} /></div>
            <span className="success-emoji">{emotionMeta[emotion].emoji}</span>
            <h2>{mapped ? 'You are on the map.' : copy.thanks}</h2>
            <p>{mapped ? 'Your anonymous pulse is live and your approximate area is now glowing on the world map.' : shared ? 'Your anonymous pulse is live in the community feed without map location.' : copy.thanksLocalBody}</p>
            {message && <div className="composer-message">{message}</div>}
            <button className="primary-button" onClick={closeAndReset}>{copy.close}</button>
          </div>
        )}
      </section>
    </div>
  )
}
