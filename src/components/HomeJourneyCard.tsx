import { ArrowUpRight, CalendarDays, HeartPulse, Share2, Sparkles } from 'lucide-react'
import { emotionMeta } from '../i18n'
import { weeklyRecap } from '../lib/share'
import type { MoodEntry } from '../lib/types'

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function streakDays(entries: MoodEntry[]) {
  const days = new Set(entries.map((entry) => dateKey(new Date(entry.createdAt))))
  let cursor = new Date()
  if (!days.has(dateKey(cursor))) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1)
    if (!days.has(dateKey(cursor))) return 0
  }
  let streak = 0
  while (days.has(dateKey(cursor))) {
    streak += 1
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1)
  }
  return streak
}

export function HomeJourneyCard({ entries, onOpenJournal, onShareWeekly, onCheckIn }: {
  entries: MoodEntry[]
  onOpenJournal: () => void
  onShareWeekly: () => void
  onCheckIn: () => void
}) {
  const week = weeklyRecap(entries)
  const streak = streakDays(entries)
  const recent = entries
    .filter((entry) => Date.now() - new Date(entry.createdAt).getTime() <= 7 * 86400000)
    .slice(0, 7)
    .reverse()

  return (
    <section className="social-card journey-card">
      <div className="social-card-title">
        <span className="social-icon journey-icon"><HeartPulse size={18} /></span>
        <div><span>YOUR MOOD JOURNEY</span><h2>Your week, at a glance.</h2></div>
      </div>

      {week ? (
        <>
          <div className="journey-summary">
            <div><span>7D AVERAGE</span><strong>{week.score.toFixed(1)}/10</strong></div>
            <div><span>CHECK-INS</span><strong>{week.count}</strong></div>
            <div><span>STREAK</span><strong>{streak}d</strong></div>
            <div><span>FEELING</span><strong>{emotionMeta[week.emotion as keyof typeof emotionMeta].emoji} {emotionMeta[week.emotion as keyof typeof emotionMeta].name}</strong></div>
          </div>

          <div className="journey-bars" aria-label="Your latest private mood check-ins">
            {recent.map((entry) => (
              <div className="journey-bar-wrap" key={entry.id} title={`${emotionMeta[entry.emotion].name} ${entry.score.toFixed(1)}/10`}>
                <div className="journey-bar-track"><i style={{ height: `${Math.max(16, entry.score * 10)}%` }} /></div>
                <span>{emotionMeta[entry.emotion].emoji}</span>
              </div>
            ))}
          </div>

          <div className="journey-actions">
            <button className="secondary-button" onClick={onOpenJournal}><CalendarDays size={16} />Open journal<ArrowUpRight size={15} /></button>
            <button className="secondary-button" onClick={onShareWeekly}><Share2 size={16} />Share weekly recap</button>
          </div>
          <div className="journey-privacy"><Sparkles size={14} />Built only from your private on-device journal.</div>
        </>
      ) : (
        <div className="journey-empty">
          <Sparkles size={24} />
          <strong>Your weekly pattern starts with your first pulse.</strong>
          <p>Check in during the week and Moodaro will build a private recap just for you.</p>
          <button className="primary-button social-action" onClick={onCheckIn}>Add your first pulse<ArrowUpRight size={16} /></button>
        </div>
      )}
    </section>
  )
}
