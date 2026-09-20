import { Activity, Sparkles, Waves } from 'lucide-react'
import { emotionMeta, t } from '../i18n'
import type { Language, MoodPoint } from '../lib/types'

export function Explore({ language, points }: { language: Language; points: MoodPoint[] }) {
  const c = t(language)
  const sorted = [...points].sort((a,b) => b.score - a.score)
  const calmest = [...points].sort((a,b) => Math.abs(a.score - 6.8) - Math.abs(b.score - 6.8))[0]
  const active = [...points].sort((a,b) => b.activity - a.activity)[0]
  return (
    <section className="page-section">
      <div className="section-heading"><span className="eyebrow">WORLD SIGNALS</span><h1>{c.exploreTitle}</h1><p>{c.exploreSubtitle}</p></div>
      <div className="feature-grid three">
        <article className="feature-card"><Sparkles/><span>{c.happiest}</span><strong>{sorted[0].city}</strong><small>{sorted[0].score.toFixed(1)} · {emotionMeta[sorted[0].emotion][language]}</small></article>
        <article className="feature-card"><Waves/><span>{c.calmest}</span><strong>{calmest.city}</strong><small>{calmest.score.toFixed(1)} · {emotionMeta[calmest.emotion][language]}</small></article>
        <article className="feature-card"><Activity/><span>{c.active}</span><strong>{active.city}</strong><small>{active.activity.toLocaleString()} {c.responses}</small></article>
      </div>
      <div className="list-card">
        <div className="list-card-head"><h2>{c.regions}</h2><span>{points.length}</span></div>
        <div className="region-list">
          {[...points].sort((a,b)=>b.activity-a.activity).slice(0,12).map((point, i) => (
            <div className="region-row" key={point.id}>
              <span className="rank">{String(i+1).padStart(2,'0')}</span>
              <div><strong>{point.city}</strong><small>{point.country}</small></div>
              <span className="region-emoji">{emotionMeta[point.emotion].emoji}</span>
              <div className="score-pill">{point.score.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
