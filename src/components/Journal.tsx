import { CalendarDays, Sparkles } from 'lucide-react'
import { emotionMeta, reasonName, t } from '../i18n'
import type { Language, MoodEntry } from '../lib/types'

export function Journal({ language, entries, onCheckIn }: { language: Language; entries: MoodEntry[]; onCheckIn: () => void }) {
  const c = t(language)
  const recent7 = entries.filter(e => Date.now() - new Date(e.createdAt).getTime() <= 7 * 86400000)
  const avg = recent7.length ? recent7.reduce((sum,e)=>sum+e.score,0)/recent7.length : 0
  const chart = [...recent7].slice(0,14).reverse()
  return (
    <section className="page-section">
      <div className="section-heading"><span className="eyebrow">JUST FOR YOU</span><h1>{c.journalTitle}</h1><p>{c.journalSubtitle}</p></div>
      {entries.length === 0 ? (
        <div className="empty-card"><div className="empty-orb"><Sparkles/></div><h2>{c.emptyJournal}</h2><p>{c.emptyJournalBody}</p><button className="primary-button" onClick={onCheckIn}>{c.checkIn}</button></div>
      ) : (
        <>
          <div className="feature-grid two">
            <article className="feature-card"><CalendarDays/><span>{c.avg7}</span><strong>{avg.toFixed(1)}</strong><small>/ 10</small></article>
            <article className="feature-card"><Sparkles/><span>{c.streak}</span><strong>{entries.length}</strong><small>{emotionMeta[entries[0].emotion][language]}</small></article>
          </div>
          <div className="journal-chart-card">
            <div className="chart-bars">
              {chart.map((entry) => <div key={entry.id} className="chart-bar-wrap"><div className="chart-bar" style={{height:`${Math.max(14, entry.score*8)}%`}}/><span>{emotionMeta[entry.emotion].emoji}</span></div>)}
            </div>
          </div>
          <div className="list-card">
            <div className="list-card-head"><h2>{c.recent}</h2><span>{entries.length}</span></div>
            <div className="journal-list">
              {entries.slice(0,20).map(entry => (
                <article className="journal-row" key={entry.id}>
                  <div className="journal-emoji">{emotionMeta[entry.emotion].emoji}</div>
                  <div className="journal-main"><strong>{emotionMeta[entry.emotion][language]} · {entry.score.toFixed(1)}</strong><span>{new Intl.DateTimeFormat(language === 'el' ? 'el-GR' : 'en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(entry.createdAt))}</span>{entry.note && <p>{entry.note}</p>}</div>
                  {entry.reason && <span className="mini-chip">{reasonName(entry.reason, language)}</span>}
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
