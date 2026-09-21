import { useEffect, useMemo, useState } from 'react'
import { Activity, HeartHandshake, Radio, Sparkles, UsersRound, Waves } from 'lucide-react'
import { copy, emotionMeta } from '../i18n'
import { PulseFeed } from './PulseFeed'
import type { MoodEntry, MoodEvent, MoodPoint, RoomKey } from '../lib/types'

const roomNames: Record<RoomKey, { emoji: string; name: string }> = {
  monday: { emoji:'☕', name:'Monday Morning' }, exam_week:{ emoji:'📚', name:'Exam Week' }, travel_day:{ emoji:'✈️', name:'Travel Day' },
  game_night:{ emoji:'🎮', name:'Game Night' }, new_parents:{ emoji:'🍼', name:'New Parents' }, workday:{ emoji:'💻', name:'Workday' }
}

export function Explore({ points, entries, events = [], reactedIds, reportedIds, onReact, onReport }: {
  points: MoodPoint[]
  entries: MoodEntry[]
  events?: MoodEvent[]
  reactedIds: Set<string>
  reportedIds: Set<string>
  onReact: (entry: MoodEntry) => Promise<void>
  onReport: (entry: MoodEntry) => Promise<void>
}) {
  const [leftId, setLeftId] = useState('')
  const [rightId, setRightId] = useState('')
  useEffect(() => {
    if (!leftId && points[0]) setLeftId(points[0].id)
    if (!rightId && points[1]) setRightId(points[1].id)
  }, [points, leftId, rightId])

  const roomStats = useMemo(() => {
    const map = new Map<RoomKey, MoodEntry[]>()
    entries.forEach((entry) => {
      if (!entry.contextTag) return
      const list = map.get(entry.contextTag) || []; list.push(entry); map.set(entry.contextTag, list)
    })
    return [...map.entries()].map(([room, list]) => ({ room, count:list.length, score:list.reduce((s,e)=>s+e.score,0)/list.length, emotion: (() => {
      const counts = new Map<string,number>(); list.forEach(e=>counts.set(e.emotion,(counts.get(e.emotion)||0)+1)); return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] as MoodEntry['emotion']
    })() })).sort((a,b)=>b.count-a.count)
  }, [entries])

  if (points.length === 0 && entries.length === 0) {
    return <section className="page-section"><div className="section-heading"><span className="eyebrow">WORLD SIGNALS</span><h1>{copy.exploreTitle}</h1><p>{copy.exploreSubtitle}</p></div><div className="empty-card"><div className="empty-orb"><Sparkles /></div><h2>{copy.noExploreData}</h2><p>{copy.noExploreDataBody}</p></div></section>
  }

  const sorted = [...points].sort((a,b)=>b.score-a.score)
  const calmest = [...points].sort((a,b)=>Math.abs(a.score-6.8)-Math.abs(b.score-6.8))[0]
  const active = [...points].sort((a,b)=>b.activity-a.activity)[0]
  const totalResonances = entries.reduce((sum,e)=>sum+(e.resonanceCount||0),0)
  const left = points.find(p=>p.id===leftId)
  const right = points.find(p=>p.id===rightId)

  return (
    <section className="page-section">
      <div className="section-heading"><span className="eyebrow">WORLD SIGNALS</span><h1>{copy.exploreTitle}</h1><p>{copy.exploreSubtitle}</p></div>

      <div className="feature-grid four">
        <article className="feature-card"><Sparkles /><span>{copy.brightest}</span><strong>{sorted[0]?.score.toFixed(1) || '—'}</strong><small>{sorted[0] ? `${sorted[0].label} · ${emotionMeta[sorted[0].emotion].name}` : 'Waiting for mapped activity'}</small></article>
        <article className="feature-card"><Waves /><span>{copy.calmest}</span><strong>{calmest?.score.toFixed(1) || '—'}</strong><small>{calmest ? `${calmest.label} · ${calmest.activity} check-ins` : 'Waiting for mapped activity'}</small></article>
        <article className="feature-card"><Activity /><span>{copy.active}</span><strong>{active?.activity || '—'}</strong><small>{active ? `${active.label} · ${active.score.toFixed(1)} average` : 'Waiting for mapped activity'}</small></article>
        <article className="feature-card"><HeartHandshake /><span>Community resonance</span><strong>{totalResonances.toLocaleString()}</strong><small>Real “I feel this too” taps</small></article>
      </div>

      {points.length >= 2 && <section className="compare-card">
        <div className="compare-head"><div><span className="eyebrow">PLACE VS PLACE</span><h2>Compare two real mood areas.</h2></div><p>Privacy stays coarse. Moodaro compares approximate map areas, not exact addresses.</p></div>
        <div className="compare-selectors"><select value={leftId} onChange={(e: any)=>setLeftId(e.target.value)}>{points.map(p=><option value={p.id} key={p.id}>{p.label} · {p.detail.split(' · ')[0]}</option>)}</select><span>VS</span><select value={rightId} onChange={(e: any)=>setRightId(e.target.value)}>{points.map(p=><option value={p.id} key={p.id}>{p.label} · {p.detail.split(' · ')[0]}</option>)}</select></div>
        <div className="compare-results">
          {[left,right].map((p,index)=>p && <article key={`${p.id}-${index}`}><span>{emotionMeta[p.emotion].emoji}</span><strong>{p.score.toFixed(1)}/10</strong><b>{emotionMeta[p.emotion].name}</b><small>{p.activity} real check-in{p.activity===1?'':'s'}</small></article>)}
        </div>
      </section>}

      {roomStats.length > 0 && <section className="rooms-panel"><div className="list-card-head"><div><span className="eyebrow"><UsersRound size={13}/> MOOD ROOMS</span><h2>Shared situations, real feelings.</h2></div><span>{roomStats.length}</span></div><div className="room-stats-grid">{roomStats.map(item=><article key={item.room}><span>{roomNames[item.room].emoji}</span><div><strong>{roomNames[item.room].name}</strong><small>{item.count} real pulse{item.count===1?'':'s'}</small></div><b>{item.score.toFixed(1)}</b></article>)}</div></section>}

      {events.length > 0 && <section className="rooms-panel"><div className="list-card-head"><div><span className="eyebrow"><Radio size={13}/> LIVE EVENTS</span><h2>Feel big moments together.</h2></div><span>{events.length}</span></div><div className="room-stats-grid">{events.map(event=><article key={event.slug}><span>{event.emoji}</span><div><strong>{event.title}</strong><small>{event.checkins} real event check-in{event.checkins===1?'':'s'}</small></div><b>{event.averageScore != null ? event.averageScore.toFixed(1) : '—'}</b></article>)}</div></section>}

      {points.length > 0 && <div className="list-card"><div className="list-card-head"><h2>{copy.regions}</h2><span>{points.length}</span></div><div className="region-list">{[...points].sort((a,b)=>b.activity-a.activity).slice(0,24).map((point,index)=><div className="region-row" key={point.id}><span className="rank">{String(index+1).padStart(2,'0')}</span><div><strong>{point.label}</strong><small>{point.detail} · {point.activity} real check-in{point.activity===1?'':'s'}</small></div><span className="region-emoji">{emotionMeta[point.emotion].emoji}</span><div className="score-pill">{point.score.toFixed(1)}</div></div>)}</div></div>}

      <PulseFeed entries={entries} reactedIds={reactedIds} reportedIds={reportedIds} onReact={onReact} onReport={onReport} />
    </section>
  )
}
