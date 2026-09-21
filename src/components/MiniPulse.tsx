import { ArrowUpRight } from 'lucide-react'
import { emotionMeta } from '../i18n'
import type { MoodSummary } from '../lib/types'

export function MiniPulse({ summary, onCheckIn, onOpen }: { summary: MoodSummary | null; onCheckIn: () => void; onOpen: () => void }) {
  return (
    <main className="mini-pulse-page">
      <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="Moodaro" />
      <span>MOODARO MINI</span>
      {summary ? <><strong>{summary.score.toFixed(1)}<small>/10</small></strong><h1>{emotionMeta[summary.trendingEmotion].emoji} {summary.label}</h1><p>{summary.responses.toLocaleString()} real check-ins in the current pulse.</p></> : <><strong>—</strong><h1>The world is quiet.</h1><p>No real live pulse is available yet.</p></>}
      <button className="primary-button" onClick={onCheckIn}>Share your mood<ArrowUpRight size={17} /></button>
      <button className="secondary-button" onClick={onOpen}>Open full Moodaro</button>
    </main>
  )
}
