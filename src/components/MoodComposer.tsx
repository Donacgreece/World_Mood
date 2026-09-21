import { useEffect, useMemo, useState, type ChangeEvent as ReactChangeEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { Check, LocateFixed, MapPin, MessageCircle, Radio, ShieldCheck, Sparkles, X } from 'lucide-react'
import { copy, emotionMeta, reasonMeta } from '../i18n'
import { countryForCoordinates } from '../lib/geo'
import type { AreaReveal, EmotionKey, MoodEntry, MoodEvent, ReasonKey, RoomKey, SubmitResult } from '../lib/types'

const emotions: EmotionKey[] = ['great', 'good', 'calm', 'okay', 'tired', 'low', 'stressed', 'angry']
const reasons: ReasonKey[] = ['work', 'family', 'money', 'health', 'love', 'weather', 'other']
const rooms: Array<{ key: RoomKey; emoji: string; name: string }> = [
  { key: 'monday', emoji: '☕', name: 'Monday Morning' },
  { key: 'exam_week', emoji: '📚', name: 'Exam Week' },
  { key: 'travel_day', emoji: '✈️', name: 'Travel Day' },
  { key: 'game_night', emoji: '🎮', name: 'Game Night' },
  { key: 'new_parents', emoji: '🍼', name: 'New Parents' },
  { key: 'workday', emoji: '💻', name: 'Workday' }
]
const scoreByEmotion: Record<EmotionKey, readonly [number, number, number, number, number]> = {
  great: [8.0, 8.5, 9.0, 9.5, 10.0], good: [6.8, 7.3, 7.8, 8.3, 8.8], calm: [5.8, 6.3, 6.8, 7.3, 7.8],
  okay: [4.8, 5.2, 5.6, 6.0, 6.4], tired: [5.1, 4.9, 4.7, 4.5, 4.3], low: [4.5, 4.1, 3.7, 3.3, 2.9],
  stressed: [4.3, 3.7, 3.1, 2.5, 1.9], angry: [4.0, 3.4, 2.8, 2.2, 1.6]
}

type ApproximateLocation = { lat: number; lng: number; countryCode?: string }

function requestApproximateLocation(): Promise<ApproximateLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GEOLOCATION_UNAVAILABLE'))
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const country = countryForCoordinates(coords.latitude, coords.longitude)
      resolve({ lat: Math.round(coords.latitude * 2) / 2, lng: Math.round(coords.longitude * 2) / 2, countryCode: country?.code })
    }, reject, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60 * 1000 })
  })
}

export function MoodComposer({ open, initialEmotion, liveSharing, events = [], onClose, onSubmit }: {
  open: boolean
  initialEmotion?: EmotionKey | null
  liveSharing: boolean
  events?: MoodEvent[]
  onClose: () => void
  onSubmit: (entry: MoodEntry) => Promise<SubmitResult>
}) {
  const [emotion, setEmotion] = useState<EmotionKey>('good')
  const [intensity, setIntensity] = useState(3)
  const [reason, setReason] = useState<ReasonKey | undefined>()
  const [contextTag, setContextTag] = useState<RoomKey | undefined>()
  const [eventSlug, setEventSlug] = useState<string | undefined>()
  const [publicMessage, setPublicMessage] = useState('')
  const [note, setNote] = useState('')
  const [mapLocationEnabled, setMapLocationEnabled] = useState(true)
  const [location, setLocation] = useState<ApproximateLocation | null>(null)
  const [locating, setLocating] = useState(false)
  const [sent, setSent] = useState(false)
  const [shared, setShared] = useState(false)
  const [mapped, setMapped] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [reveal, setReveal] = useState<AreaReveal | null>(null)

  const score = useMemo(() => scoreByEmotion[emotion][intensity - 1], [emotion, intensity])

  useEffect(() => { if (open && initialEmotion) setEmotion(initialEmotion) }, [open, initialEmotion])
  if (!open) return null

  const locate = async () => {
    setLocating(true); setMessage(null)
    try {
      const next = await requestApproximateLocation(); setLocation(next); setMapLocationEnabled(true); return next
    } catch {
      setMessage('Location permission is needed to place your pulse on the map. You can turn Map placement off and still share anonymously.')
      return null
    } finally { setLocating(false) }
  }

  const submit = async () => {
    if (sending || locating) return
    setSending(true); setMessage(null)
    let resolvedLocation = location
    if (mapLocationEnabled && !resolvedLocation) {
      resolvedLocation = await locate()
      if (!resolvedLocation) { setSending(false); return }
    }
    const entry: MoodEntry = {
      id: crypto.randomUUID(), score, emotion, intensity, reason,
      note: note.trim() || undefined,
      publicMessage: publicMessage.trim() || undefined,
      contextTag,
      eventSlug,
      lat: mapLocationEnabled ? resolvedLocation?.lat : undefined,
      lng: mapLocationEnabled ? resolvedLocation?.lng : undefined,
      countryCode: mapLocationEnabled ? resolvedLocation?.countryCode : undefined,
      createdAt: new Date().toISOString(), source: 'local'
    }
    const result = await onSubmit(entry)
    setShared(result.shared); setMapped(Boolean(result.shared && entry.lat != null && entry.lng != null)); setReveal(result.reveal || null)
    if (result.reason === 'rate-limit') setMessage(copy.rateLimited)
    if (result.reason === 'network-error') setMessage('Your private journal was saved, but the live network could not receive this pulse.')
    setSent(true); setSending(false)
  }

  const reset = () => {
    setEmotion('good'); setIntensity(3); setReason(undefined); setContextTag(undefined); setEventSlug(undefined); setPublicMessage(''); setNote('')
    setMapLocationEnabled(true); setLocation(null); setSent(false); setShared(false); setMapped(false); setMessage(null); setReveal(null); onClose()
  }

  return (
    <div className="composer-backdrop" role="presentation" onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) reset() }}>
      <section className="composer-sheet" role="dialog" aria-modal="true" aria-labelledby="mood-composer-title">
        <div className="composer-scroll">
        <header className="composer-head">
          <div><span className="eyebrow">YOUR PULSE</span><h2 id="mood-composer-title">{copy.howFeel}</h2><p>{initialEmotion ? 'Your mood is selected. Add intensity and share in seconds, or add context if you want.' : copy.chooseEmotion}</p></div>
          <button className="icon-button" onClick={reset} aria-label="Close"><X size={19} /></button>
        </header>

        {!sent ? <>
          <div className="emotion-grid" aria-label="Choose your mood">
            {emotions.map((key) => <button key={key} className={emotion === key ? `is-selected emotion-${key}` : ''} onClick={() => setEmotion(key)} aria-pressed={emotion === key}><span>{emotionMeta[key].emoji}</span><strong>{emotionMeta[key].name}</strong></button>)}
          </div>

          <div className="composer-section intensity-section">
            <div className="field-label"><span>{copy.intensity}</span><strong>{intensity}/5</strong></div>
            <div className="intensity-row" role="group" aria-label="Mood intensity">
              {[1,2,3,4,5].map((value) => <button key={value} className={intensity === value ? 'is-selected' : ''} onClick={() => setIntensity(value)} aria-label={`Intensity ${value}`}><span /></button>)}
            </div>
            <div className="score-preview"><span>Pulse score</span><strong>{score.toFixed(1)}</strong><small>/10</small></div>
          </div>

          <div className="composer-section compact-context-grid">
            <div>
              <div className="field-label"><span>{copy.why}</span><em>{copy.optional}</em></div>
              <div className="reason-chips">{reasons.map((key) => <button key={key} className={reason === key ? 'is-selected' : ''} onClick={() => setReason(reason === key ? undefined : key)}>{reasonMeta[key].emoji} {reasonMeta[key].name}</button>)}</div>
            </div>
            <div>
              <div className="field-label"><span>Join a mood room</span><em>Optional</em></div>
              <div className="room-chips">{rooms.map((room) => <button key={room.key} className={contextTag === room.key ? 'is-selected' : ''} onClick={() => setContextTag(contextTag === room.key ? undefined : room.key)}>{room.emoji} {room.name}</button>)}</div>
            </div>
          </div>

          {events.length > 0 && <div className="composer-section"><div className="field-label"><span>Live event pulse</span><em>Optional</em></div><div className="room-chips">{events.map((event) => <button key={event.slug} className={eventSlug === event.slug ? 'is-selected' : ''} onClick={() => setEventSlug(eventSlug === event.slug ? undefined : event.slug)}>{event.emoji} {event.title}</button>)}</div></div>}

          <label className="composer-section public-message-field">
            <div className="field-label"><span><MessageCircle size={15} /> Say something to the world</span><em>Optional · public</em></div>
            <textarea maxLength={120} value={publicMessage} onChange={(event: ReactChangeEvent<HTMLTextAreaElement>) => setPublicMessage(event.target.value)} placeholder="A tiny thought about how you feel…" />
            <small>{publicMessage.length}/120 · anonymous · no links</small>
          </label>

          <label className="composer-section note-field">
            <div className="field-label"><span>{copy.note}</span><em>{copy.optional}</em></div>
            <textarea maxLength={160} value={note} onChange={(event: ReactChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value)} placeholder={copy.notePlaceholder} />
            <small>{note.length}/160 · private on this device</small>
          </label>

          <div className={`map-placement ${mapLocationEnabled ? 'is-enabled' : ''}`}>
            <div className="map-placement-copy"><div className="map-placement-icon"><MapPin size={19} /></div><div><strong>Place this pulse on the live map</strong><span>{location ? `Approximate area ready${location.countryCode ? ` · ${location.countryCode}` : ''}` : 'On by default. We will ask for location only when you post.'}</span></div></div>
            <button className={`switch-control ${mapLocationEnabled ? 'is-on' : ''}`} onClick={() => { setMapLocationEnabled(!mapLocationEnabled); if (mapLocationEnabled) setLocation(null); setMessage(null) }} role="switch" aria-checked={mapLocationEnabled} aria-label="Share approximate map location"><i /></button>
            {mapLocationEnabled && <button className="location-preview-button" onClick={locate} disabled={locating}><LocateFixed size={16} />{locating ? 'Finding area…' : location ? 'Refresh area' : 'Set approximate area now'}</button>}
            <small>Exact GPS is never stored. Coordinates are rounded to a coarse 0.5° area before sharing.</small>
          </div>

          <div className="privacy-inline"><ShieldCheck size={17} /><span><strong>{copy.privateByDesign}.</strong> {copy.privacyText}</span></div>
          {!liveSharing && <div className="truth-notice">{copy.localOnlyNotice}</div>}
          {message && <div className="composer-message">{message}</div>}
          <button className="primary-button composer-submit" onClick={submit} disabled={sending || locating}>{locating ? 'Preparing map location…' : sending ? 'Sending pulse…' : mapLocationEnabled ? 'Share pulse on the map' : copy.sendMood}</button>
        </> : (
          <div className="success-state">
            <div className="success-orb"><Check size={36} /></div>
            <span className={`success-emoji emotion-${emotion}`}>{emotionMeta[emotion].emoji}</span>
            <h2>{mapped ? 'You are on the map.' : copy.thanks}</h2>
            <p>{mapped ? 'Your anonymous pulse is live and your approximate area is now glowing on the world map.' : shared ? 'Your anonymous pulse is live in the community feed without map location.' : copy.thanksLocalBody}</p>
            {reveal && <div className="mood-reveal"><span><Sparkles size={15} /> YOUR AREA REVEAL</span><strong>{emotionMeta[reveal.emotion].emoji} {reveal.score.toFixed(1)}/10</strong><p>{reveal.label} · {reveal.count} real recent check-in{reveal.count === 1 ? '' : 's'}{reveal.percentile != null ? ` · your pulse is above ${reveal.percentile}% of recent scores here` : ''}</p></div>}
            {contextTag && <div className="social-message"><Radio size={14} /> Your pulse also joined a Mood Room.</div>}
            {message && <div className="composer-message">{message}</div>}
            <button className="primary-button" onClick={reset}>{copy.close}</button>
          </div>
        )}
        </div>
      </section>
    </div>
  )
}
