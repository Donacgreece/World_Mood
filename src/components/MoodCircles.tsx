import { Copy, Link2, Plus, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { emotionMeta } from '../i18n'
import { createMoodCircle, fetchCircleSummary, submitCircleMood } from '../lib/supabase'
import { getActorHash, readLastCircleCode, saveLastCircleCode } from '../lib/storage'
import type { CircleSummary, EmotionKey } from '../lib/types'

const quick: Array<{ emotion: EmotionKey; score: number }> = [
  { emotion: 'great', score: 9.2 }, { emotion: 'good', score: 7.8 }, { emotion: 'calm', score: 6.8 },
  { emotion: 'low', score: 3.4 }, { emotion: 'stressed', score: 2.4 }
]

export function MoodCircles({ live, initialCode }: { live: boolean; initialCode?: string }) {
  const [code, setCode] = useState(() => initialCode || readLastCircleCode())
  const [summary, setSummary] = useState<CircleSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = async (nextCode = code) => {
    if (!live || !nextCode) return
    const next = await fetchCircleSummary(nextCode)
    setSummary(next)
  }

  useEffect(() => { void refresh(code) }, [code, live])

  const create = async () => {
    if (!live || busy) return
    setBusy(true); setMessage('')
    try {
      const actor = await getActorHash()
      const next = await createMoodCircle(actor)
      if (next) {
        setCode(next.code); saveLastCircleCode(next.code); setSummary(next)
        const url = new URL(window.location.href); url.searchParams.set('circle', next.code)
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      }
    } catch { setMessage('Could not create a circle right now.') }
    finally { setBusy(false) }
  }

  const checkIn = async (emotion: EmotionKey, score: number) => {
    if (!code || busy) return
    setBusy(true); setMessage('')
    try {
      const actor = await getActorHash()
      await submitCircleMood(code, emotion, score, actor)
      await refresh(code)
      setMessage('Your circle pulse is in. Only the group aggregate is visible.')
    } catch (error) {
      setMessage(String(error).includes('RATE_LIMIT') ? 'You just checked in. Try again in a moment.' : 'Circle check-in failed. Please try again.')
    } finally { setBusy(false) }
  }

  const share = async () => {
    if (!code) return
    const url = new URL(window.location.href); url.searchParams.set('circle', code)
    const text = `Join my private Moodaro Circle: ${url.toString()}`
    try {
      if (navigator.share) await navigator.share({ title: 'Moodaro Circle', text, url: url.toString() })
      else await navigator.clipboard.writeText(text)
    } catch { /* dismissed */ }
  }

  return (
    <section className="social-card circle-card" id="mood-circle">
      <div className="social-card-head">
        <div className="social-icon"><UsersRound size={19} /></div>
        <div><span>PRIVATE MOOD CIRCLES</span><h3>Feel together, without exposing anyone.</h3></div>
      </div>
      {!code ? (
        <>
          <p>Create a private link for friends, family or a team. Moodaro shows only the group pulse, never who chose what.</p>
          <button className="primary-button social-action" onClick={create} disabled={!live || busy}><Plus size={17} />Create a Mood Circle</button>
        </>
      ) : (
        <>
          <div className="circle-summary">
            <div><span>Circle</span><strong>{code}</strong></div>
            <div><span>People</span><strong>{summary?.members || 0}</strong></div>
            <div><span>24h pulse</span><strong>{summary?.score != null ? `${summary.score.toFixed(1)}/10` : 'Waiting'}</strong></div>
            <div><span>Feeling</span><strong>{summary?.emotion ? `${emotionMeta[summary.emotion].emoji} ${emotionMeta[summary.emotion].name}` : '—'}</strong></div>
          </div>
          <div className="circle-moods">
            {quick.map((item) => <button key={item.emotion} onClick={() => checkIn(item.emotion, item.score)} disabled={busy}><span>{emotionMeta[item.emotion].emoji}</span><small>{emotionMeta[item.emotion].name}</small></button>)}
          </div>
          <div className="circle-actions">
            <button className="secondary-button" onClick={share}><Link2 size={16} />Share private link</button>
            <button className="ghost-copy" onClick={() => navigator.clipboard.writeText(code)}><Copy size={15} />Copy code</button>
          </div>
        </>
      )}
      {message && <div className="social-message">{message}</div>}
    </section>
  )
}
