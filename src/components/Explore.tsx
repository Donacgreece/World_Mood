import { Activity, HeartHandshake, Sparkles, Waves } from 'lucide-react'
import { copy, emotionMeta } from '../i18n'
import { PulseFeed } from './PulseFeed'
import type { MoodEntry, MoodPoint } from '../lib/types'

export function Explore({ points, entries, reactedIds, onReact }: {
  points: MoodPoint[]
  entries: MoodEntry[]
  reactedIds: Set<string>
  onReact: (entry: MoodEntry) => Promise<void>
}) {
  if (points.length === 0 && entries.length === 0) {
    return (
      <section className="page-section">
        <div className="section-heading">
          <span className="eyebrow">WORLD SIGNALS</span>
          <h1>{copy.exploreTitle}</h1>
          <p>{copy.exploreSubtitle}</p>
        </div>
        <div className="empty-card">
          <div className="empty-orb"><Sparkles /></div>
          <h2>{copy.noExploreData}</h2>
          <p>{copy.noExploreDataBody}</p>
        </div>
      </section>
    )
  }

  const sorted = [...points].sort((a, b) => b.score - a.score)
  const calmest = [...points].sort((a, b) => Math.abs(a.score - 6.8) - Math.abs(b.score - 6.8))[0]
  const active = [...points].sort((a, b) => b.activity - a.activity)[0]
  const totalResonances = entries.reduce((sum, entry) => sum + (entry.resonanceCount || 0), 0)

  return (
    <section className="page-section">
      <div className="section-heading">
        <span className="eyebrow">WORLD SIGNALS</span>
        <h1>{copy.exploreTitle}</h1>
        <p>{copy.exploreSubtitle}</p>
      </div>

      <div className="feature-grid four">
        <article className="feature-card">
          <Sparkles />
          <span>{copy.brightest}</span>
          <strong>{sorted[0]?.score.toFixed(1) || '—'}</strong>
          <small>{sorted[0] ? `${sorted[0].label} · ${emotionMeta[sorted[0].emotion].name}` : 'Waiting for mapped activity'}</small>
        </article>
        <article className="feature-card">
          <Waves />
          <span>{copy.calmest}</span>
          <strong>{calmest?.score.toFixed(1) || '—'}</strong>
          <small>{calmest ? `${calmest.label} · ${calmest.activity} check-ins` : 'Waiting for mapped activity'}</small>
        </article>
        <article className="feature-card">
          <Activity />
          <span>{copy.active}</span>
          <strong>{active?.activity || '—'}</strong>
          <small>{active ? `${active.label} · ${active.score.toFixed(1)} average` : 'Waiting for mapped activity'}</small>
        </article>
        <article className="feature-card">
          <HeartHandshake />
          <span>Community resonance</span>
          <strong>{totalResonances.toLocaleString()}</strong>
          <small>Real resonance taps on shared pulses</small>
        </article>
      </div>

      {points.length > 0 && (
        <div className="list-card">
          <div className="list-card-head"><h2>{copy.regions}</h2><span>{points.length}</span></div>
          <div className="region-list">
            {[...points].sort((a, b) => b.activity - a.activity).slice(0, 24).map((point, index) => (
              <div className="region-row" key={point.id}>
                <span className="rank">{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{point.label}</strong><small>{point.detail} · {point.activity} real check-in{point.activity === 1 ? '' : 's'}</small></div>
                <span className="region-emoji">{emotionMeta[point.emotion].emoji}</span>
                <div className="score-pill">{point.score.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PulseFeed entries={entries} reactedIds={reactedIds} onReact={onReact} />
    </section>
  )
}
