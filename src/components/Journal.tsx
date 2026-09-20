import { CalendarDays, Sparkles } from 'lucide-react'
import { copy, emotionMeta, reasonMeta } from '../i18n'
import type { MoodEntry } from '../lib/types'

export function Journal({ entries, onCheckIn }: { entries: MoodEntry[]; onCheckIn: () => void }) {
  const recent7 = entries.filter((entry) => Date.now() - new Date(entry.createdAt).getTime() <= 7 * 86400000)
  const avg = recent7.length ? recent7.reduce((sum, entry) => sum + entry.score, 0) / recent7.length : 0
  const chart = [...recent7].slice(0, 14).reverse()

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
          <div className="feature-grid two">
            <article className="feature-card">
              <CalendarDays />
              <span>{copy.avg7}</span>
              <strong>{avg.toFixed(1)}</strong>
              <small>/ 10</small>
            </article>
            <article className="feature-card">
              <Sparkles />
              <span>{copy.streak}</span>
              <strong>{entries.length}</strong>
              <small>{emotionMeta[entries[0].emotion].name}</small>
            </article>
          </div>

          <div className="journal-chart-card">
            <div className="chart-bars">
              {chart.map((entry) => (
                <div key={entry.id} className="chart-bar-wrap">
                  <div className="chart-bar" style={{ height: `${Math.max(14, entry.score * 8)}%` }} />
                  <span>{emotionMeta[entry.emotion].emoji}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="list-card">
            <div className="list-card-head"><h2>{copy.recent}</h2><span>{entries.length}</span></div>
            <div className="journal-list">
              {entries.slice(0, 20).map((entry) => (
                <article className="journal-row" key={entry.id}>
                  <div className="journal-emoji">{emotionMeta[entry.emotion].emoji}</div>
                  <div className="journal-main">
                    <strong>{emotionMeta[entry.emotion].name} · {entry.score.toFixed(1)}</strong>
                    <span>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}</span>
                    {entry.note && <p>{entry.note}</p>}
                  </div>
                  {entry.reason && <span className="mini-chip">{reasonMeta[entry.reason].name}</span>}
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
