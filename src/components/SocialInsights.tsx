import { Activity, MapPin, Radio, Sparkles, Waves } from 'lucide-react'
import { emotionMeta } from '../i18n'
import type { MoodEvent, MoodMoment, MoodPoint, MoodWave } from '../lib/types'

export function SocialInsights({ nearby, waves, moments, events }: {
  nearby: MoodPoint | null
  waves: MoodWave[]
  moments: MoodMoment[]
  events: MoodEvent[]
}) {
  if (!nearby && waves.length === 0 && moments.length === 0 && events.length === 0) return null
  return (
    <section className="insights-grid">
      {nearby && <article className="insight-card nearby-card"><MapPin size={18} /><span>NEARBY PULSE</span><strong>{emotionMeta[nearby.emotion].emoji} {nearby.score.toFixed(1)}/10</strong><p>{nearby.activity} real check-in{nearby.activity === 1 ? '' : 's'} in your latest approximate area.</p></article>}
      {waves.slice(0,2).map((wave) => <article className="insight-card wave-card" key={wave.pointId}><Waves size={18} /><span>MOOD WAVE</span><strong>{wave.delta > 0 ? '↗' : '↘'} {Math.abs(wave.delta).toFixed(1)} points</strong><p>{wave.label} shifted to {emotionMeta[wave.emotion].name.toLowerCase()} in the last hour, based on {wave.activity} real check-ins.</p></article>)}
      {moments.slice(0,2).map((moment) => <article className="insight-card moment-card" key={moment.id}><Sparkles size={18} /><span>MOODARO MOMENT</span><strong>{moment.emoji} {moment.title}</strong><p>{moment.body}</p></article>)}
      {events.slice(0,2).map((event) => <article className="insight-card event-card" key={event.slug}><Radio size={18} /><span>LIVE EVENT</span><strong>{event.emoji} {event.title}</strong><p>{event.checkins ? `${event.checkins} real event check-ins${event.averageScore != null ? ` · ${event.averageScore.toFixed(1)}/10` : ''}` : 'Ready for real check-ins when people join the event pulse.'}</p></article>)}
    </section>
  )
}
