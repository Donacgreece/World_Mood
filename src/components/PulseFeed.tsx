import { Flag, HeartHandshake, Radio, Sparkles } from 'lucide-react'
import { countryName } from '../lib/geo'
import { flagEmoji } from '../data/countries'
import { copy, emotionMeta, reasonMeta } from '../i18n'
import type { MoodEntry, RoomKey } from '../lib/types'

const roomNames: Record<RoomKey, string> = {
  monday: 'Monday Morning', exam_week: 'Exam Week', travel_day: 'Travel Day', game_night: 'Game Night', new_parents: 'New Parents', workday: 'Workday'
}

function relativeTime(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function PulseFeed({ entries, reactedIds, reportedIds = new Set<string>(), onReact, onReport, compact = false }: {
  entries: MoodEntry[]
  reactedIds: Set<string>
  reportedIds?: Set<string>
  onReact: (entry: MoodEntry) => Promise<void>
  onReport?: (entry: MoodEntry) => Promise<void>
  compact?: boolean
}) {
  const visible = entries.filter((entry) => !reportedIds.has(entry.id)).slice(0, compact ? 6 : 18)

  return (
    <section className={`pulse-panel ${compact ? 'is-compact' : ''}`}>
      <div className="pulse-panel-head">
        <div><span className="eyebrow"><Radio size={13} /> LIVE SOCIAL PULSE</span><h2>{copy.pulseTitle}</h2><p>{copy.pulseSubtitle}</p></div>
        <div className="pulse-live-badge"><span className="live-dot" />REAL</div>
      </div>

      {visible.length === 0 ? <div className="pulse-empty"><div className="empty-orb small"><Sparkles size={20} /></div><strong>{copy.noPulse}</strong><span>When someone checks in, their anonymous pulse appears here.</span></div> : (
        <div className="pulse-feed">
          {visible.map((entry) => {
            const reacted = reactedIds.has(entry.id)
            const place = countryName(entry.countryCode)
            return (
              <article className="pulse-card" key={entry.id}>
                <div className={`pulse-avatar emotion-${entry.emotion}`} aria-hidden="true">{emotionMeta[entry.emotion].emoji}</div>
                <div className="pulse-card-main">
                  <div className="pulse-card-top"><strong>{emotionMeta[entry.emotion].name}</strong><span>{flagEmoji(entry.countryCode)} {place || 'World'} · {relativeTime(entry.createdAt)}</span></div>
                  {entry.publicMessage ? <blockquote className="pulse-message">“{entry.publicMessage}”</blockquote> : <div className="pulse-sentence"><span className="pulse-score">{entry.score.toFixed(1)}</span><span>feeling {emotionMeta[entry.emotion].name.toLowerCase()}</span>{entry.reason && <span>because of {reasonMeta[entry.reason].name.toLowerCase()}</span>}</div>}
                  {(entry.contextTag || entry.eventSlug) && <div className="pulse-context">{entry.contextTag && <span>#{roomNames[entry.contextTag].replace(/\s+/g, '')}</span>}{entry.eventSlug && <span>Live event</span>}</div>}
                  <div className="pulse-actions-row">
                    <button className={`resonate-button ${reacted ? 'is-reacted' : ''}`} onClick={() => onReact(entry)} disabled={reacted} aria-label={reacted ? 'You resonated with this pulse' : 'Resonate with this pulse'}><HeartHandshake size={16} /><span>{reacted ? 'I feel this too' : 'I feel this too'}</span><em>{entry.resonanceCount || 0}</em></button>
                    {onReport && <button className="report-button" onClick={() => onReport(entry)} aria-label="Report this anonymous pulse"><Flag size={14} />Report</button>}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
