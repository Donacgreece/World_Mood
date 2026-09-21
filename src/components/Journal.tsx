import { CalendarDays, Share2, Sparkles, Trophy } from 'lucide-react'
import { copy, emotionMeta, reasonMeta, scoreLabel } from '../i18n'
import { weeklyRecap, yearRecap } from '../lib/share'
import type { MoodEntry } from '../lib/types'

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function streakDays(entries: MoodEntry[]) {
  const days = new Set(entries.map((entry) => dateKey(new Date(entry.createdAt))))
  let cursor = new Date()
  const today = dateKey(cursor)
  if (!days.has(today)) {
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

export function Journal({ entries, onCheckIn, onShareWeekly, onShareYear }: {
  entries: MoodEntry[]
  onCheckIn: () => void
  onShareWeekly: () => void
  onShareYear: () => void
}) {
  const recent7 = entries.filter((entry) => Date.now() - new Date(entry.createdAt).getTime() <= 7 * 86400000)
  const avg = recent7.length ? recent7.reduce((sum, entry) => sum + entry.score, 0) / recent7.length : 0
  const chart = [...recent7].slice(0, 14).reverse()
  const streak = streakDays(entries)
  const week = weeklyRecap(entries)
  const year = yearRecap(entries)

  return (
    <section className="page-section">
      <div className="section-heading">
        <span className="eyebrow">JUST FOR YOU</span>
        <h1>{copy.journalTitle}</h1>
        <p>{copy.journalSubtitle}</p>
      </div>

      {entries.length === 0 ? (
        <div className="empty-card">
          <div className="empty-orb"><Sparkles /></div>
          <h2>{copy.emptyJournal}</h2>
          <p>{copy.emptyJournalBody}</p>
          <button className="primary-button" onClick={onCheckIn}>{copy.checkIn}</button>
        </div>
      ) : (
        <>
          <div className="feature-grid three journal-summary-grid">
            <article className="feature-card"><CalendarDays /><span>{copy.avg7}</span><strong>{avg.toFixed(1)}</strong><small>/ 10 · {avg ? scoreLabel(avg) : 'Waiting'}</small></article>
            <article className="feature-card"><Sparkles /><span>Current streak</span><strong>{streak}</strong><small>{streak === 1 ? 'day' : 'days'} of checking in</small></article>
            <article className="feature-card"><Trophy /><span>Total pulses</span><strong>{entries.length}</strong><small>{emotionMeta[entries[0].emotion].emoji} latest: {emotionMeta[entries[0].emotion].name}</small></article>
          </div>

          <div className="journal-recaps">
            {week && <article className="recap-card"><div><span>YOUR WEEK IN FEELINGS</span><strong>{week.score.toFixed(1)}/10</strong><p>{emotionMeta[week.emotion as keyof typeof emotionMeta].emoji} Mostly {emotionMeta[week.emotion as keyof typeof emotionMeta].name.toLowerCase()} · {week.count} check-in{week.count === 1 ? '' : 's'}</p></div><button className="secondary-button" onClick={onShareWeekly}><Share2 size={16} />Share weekly card</button></article>}
            {year && <article className="recap-card year-card"><div><span>MOODARO YEAR</span><strong>{year.score.toFixed(1)}/10</strong><p>{emotionMeta[year.emotion as keyof typeof emotionMeta].emoji} {year.count} check-ins across {year.months} month{year.months === 1 ? '' : 's'}</p></div><button className="secondary-button" onClick={onShareYear}><Share2 size={16} />Share year card</button></article>}
          </div>

          <div className="journal-chart-card">
            <div className="chart-bars">{chart.map((entry) => <div key={entry.id} className="chart-bar-wrap"><div className="chart-bar" style={{ height: `${Math.max(14, entry.score * 8)}%` }} /><span>{emotionMeta[entry.emotion].emoji}</span></div>)}</div>
          </div>

          <div className="list-card">
            <div className="list-card-head"><h2>{copy.recent}</h2><span>{entries.length}</span></div>
            <div className="journal-list">
              {entries.slice(0, 30).map((entry) => <article className="journal-row" key={entry.id}>
                <div className="journal-emoji">{emotionMeta[entry.emotion].emoji}</div>
                <div className="journal-main"><strong>{emotionMeta[entry.emotion].name} · {entry.score.toFixed(1)}</strong><span>{new Intl.DateTimeFormat('en-US', { dateStyle:'medium', timeStyle:'short' }).format(new Date(entry.createdAt))}</span>{entry.note && <p>{entry.note}</p>}{entry.publicMessage && <p className="journal-public-note">Public pulse: “{entry.publicMessage}”</p>}</div>
                {entry.reason && <span className="mini-chip">{reasonMeta[entry.reason].name}</span>}
              </article>)}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
