import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Download, Globe2, HeartPulse, Languages, Moon, Share2, Sparkles, Sun, WifiOff } from 'lucide-react'
import { BottomNav } from './components/BottomNav'
import { Explore } from './components/Explore'
import { Journal } from './components/Journal'
import { Logo } from './components/Logo'
import { MoodComposer } from './components/MoodComposer'
import { Settings } from './components/Settings'
import { WorldMap } from './components/WorldMap'
import { emotionMeta, scoreLabel, t } from './i18n'
import { getDemoPoints, getDemoResponseCount } from './data/demo'
import { createShareCard } from './lib/share'
import { fetchLiveMoods, hasLiveBackend, submitLiveMood } from './lib/supabase'
import { hasOnboarded, readJournal, readLanguage, readTheme, saveJournal, saveLanguage, saveTheme, setOnboarded } from './lib/storage'
import type { Language, MoodEntry, MoodPoint, MoodSummary, ThemeMode, TimeRange, ViewKey } from './lib/types'

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

function sinceFor(range: TimeRange) {
  const now = Date.now()
  const ms = range === 'now' ? 2 * 3600000 : range === '24h' ? 24 * 3600000 : range === '7d' ? 7 * 86400000 : 30 * 86400000
  return new Date(now - ms).toISOString()
}

function pointFromEntry(entry: MoodEntry, index: number): MoodPoint | null {
  if (entry.lat == null || entry.lng == null) return null
  return {
    id: `live-${entry.id}`,
    city: 'Community pulse',
    country: entry.countryCode || 'Shared mood',
    lat: entry.lat,
    lng: entry.lng,
    score: entry.score,
    emotion: entry.emotion,
    activity: 1 + (index % 48)
  }
}

export default function App() {
  const [language, setLanguageState] = useState<Language>(() => readLanguage())
  const [theme, setThemeState] = useState<ThemeMode>(() => readTheme())
  const [view, setView] = useState<ViewKey>('home')
  const [range, setRange] = useState<TimeRange>('now')
  const [journal, setJournal] = useState<MoodEntry[]>(() => readJournal())
  const [composerOpen, setComposerOpen] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<MoodPoint | null>(null)
  const [liveEntries, setLiveEntries] = useState<MoodEntry[]>([])
  const [backendError, setBackendError] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [showOnboarding, setShowOnboarding] = useState(() => !hasOnboarded())
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(window.matchMedia('(display-mode: standalone)').matches)
  const c = t(language)

  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = language
    document.title = language === 'el' ? 'World Mood · Δες πώς νιώθει ο κόσμος' : 'World Mood · See how the world feels'
  }, [language])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    const onInstall = (event: Event) => { event.preventDefault(); setDeferredPrompt(event as BeforeInstallPromptEvent) }
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null) }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onInstall); window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    if (!hasLiveBackend) return
    let cancelled = false
    const load = async () => {
      try {
        const entries = await fetchLiveMoods(sinceFor(range))
        if (!cancelled) { setLiveEntries(entries); setBackendError(false) }
      } catch {
        if (!cancelled) setBackendError(true)
      }
    }
    load()
    const timer = window.setInterval(load, 60000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [range])

  const demoPoints = useMemo(() => getDemoPoints(range), [range])
  const livePoints = useMemo(() => liveEntries.map(pointFromEntry).filter(Boolean) as MoodPoint[], [liveEntries])
  const points = hasLiveBackend && livePoints.length > 0 ? [...demoPoints.slice(0, 18), ...livePoints.slice(0, 100)] : demoPoints

  const summary = useMemo<MoodSummary>(() => {
    const sourceScores = hasLiveBackend && liveEntries.length > 8 ? liveEntries.map(e => e.score) : demoPoints.map(p => p.score)
    const score = sourceScores.reduce((a,b)=>a+b,0) / Math.max(1, sourceScores.length)
    const emotionCounts = new Map<string, number>()
    const sourceEmotions = hasLiveBackend && liveEntries.length > 8 ? liveEntries.map(e=>e.emotion) : demoPoints.map(p=>p.emotion)
    sourceEmotions.forEach(e=>emotionCounts.set(e,(emotionCounts.get(e)||0)+1))
    const trendingEmotion = [...emotionCounts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] as MoodSummary['trendingEmotion'] || 'calm'
    const responses = hasLiveBackend && liveEntries.length ? liveEntries.length : getDemoResponseCount(range)
    return { score:Number(score.toFixed(1)), label:scoreLabel(score,language), emotion:trendingEmotion, responses, countries:hasLiveBackend&&liveEntries.length?Math.max(1,new Set(liveEntries.map(e=>e.countryCode).filter(Boolean)).size):112, delta:Number(((score-6.45)*5.2).toFixed(1)), trendingEmotion }
  }, [demoPoints, liveEntries, language, range])

  const setLanguage = (value: Language) => { setLanguageState(value); saveLanguage(value) }
  const setTheme = (value: ThemeMode) => { setThemeState(value); saveTheme(value) }

  const submitMood = async (entry: MoodEntry) => {
    const next = [entry, ...journal]
    setJournal(next); saveJournal(next)
    if (hasLiveBackend) {
      try { await submitLiveMood(entry); setBackendError(false); setLiveEntries(current=>[{...entry,source:'supabase'},...current]) }
      catch { setBackendError(true) }
    }
  }

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') setDeferredPrompt(null)
  }

  const share = async () => {
    const blob = await createShareCard(summary, language)
    const text = language === 'el' ? `Ο κόσμος τώρα είναι στο ${summary.score}/10 στο World Mood.` : `The world is feeling ${summary.score}/10 right now on World Mood.`
    try {
      if (blob && navigator.canShare?.({ files: [new File([blob], 'world-mood.png', { type: 'image/png' })] })) {
        await navigator.share({ title:'World Mood', text, files:[new File([blob], 'world-mood.png', { type:'image/png' })] })
      } else if (navigator.share) await navigator.share({ title:'World Mood', text, url:window.location.href })
      else await navigator.clipboard.writeText(`${text} ${window.location.href}`)
    } catch { /* user cancelled */ }
  }

  const clearJournal = () => {
    if (!window.confirm(`${c.clearConfirm}\n\n${c.clearConfirmBody}`)) return
    setJournal([]); saveJournal([])
  }

  const finishOnboarding = () => { setOnboarded(); setShowOnboarding(false) }

  return (
    <div className="app-shell">
      {!online && <div className="offline-banner"><WifiOff size={16}/>{c.offline}</div>}
      <aside className="desktop-rail">
        <Logo compact />
        <div className="rail-nav">
          {[{k:'home',i:Globe2},{k:'explore',i:Activity},{k:'journal',i:HeartPulse},{k:'settings',i:Sparkles}].map(({k,i:Icon})=><button key={k} className={view===k?'is-active':''} onClick={()=>setView(k as ViewKey)} aria-label={c.nav[k as keyof typeof c.nav]}><Icon size={21}/></button>)}
        </div>
        <button className="rail-theme" onClick={()=>setTheme(theme==='dark'?'light':'dark')} aria-label="Toggle theme">{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}</button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <Logo />
          <div className="top-actions">
            <button className="network-pill" title={hasLiveBackend&&!backendError?c.live:c.demo}><span className={`live-dot ${hasLiveBackend&&!backendError?'':'demo'}`}/><span>{hasLiveBackend&&!backendError?c.live:c.demo}</span></button>
            <button className="icon-button" onClick={()=>setLanguage(language==='en'?'el':'en')} aria-label="Change language"><Languages size={19}/></button>
            {deferredPrompt && !installed && <button className="icon-button install-top" onClick={install} aria-label="Install"><Download size={19}/></button>}
          </div>
        </header>

        {view === 'home' && (
          <section className="home-page">
            <div className="hero-copy">
              <span className="eyebrow">{c.heroEyebrow}</span>
              <h1>{c.heroTitle}</h1>
              <p>{c.heroSubtitle}</p>
              <div className="hero-actions"><button className="primary-button" onClick={()=>setComposerOpen(true)}>{c.checkIn}<ArrowUpRight size={18}/></button><button className="secondary-button" onClick={share}><Share2 size={18}/>{c.share}</button></div>
            </div>

            <div className="map-stage">
              <WorldMap points={points} selectedId={selectedPoint?.id} onSelect={setSelectedPoint}/>
              <div className="global-score-card">
                <span>{emotionMeta[summary.emotion].emoji} {scoreLabel(summary.score,language)}</span>
                <strong>{summary.score.toFixed(1)}</strong>
                <small>/10</small>
              </div>
              <div className="range-selector segmented">{(['now','24h','7d','30d'] as TimeRange[]).map(v=><button key={v} className={range===v?'is-active':''} onClick={()=>setRange(v)}>{v==='now'?c.now:v==='24h'?c.h24:v==='7d'?c.d7:c.d30}</button>)}</div>
            </div>

            <div className="stats-strip">
              <div><span>{c.responses}</span><strong>{summary.responses.toLocaleString()}</strong></div>
              <div><span>{c.countries}</span><strong>{summary.countries}</strong></div>
              <div><span>{c.moodShift}</span><strong>{summary.delta>=0?'+':''}{summary.delta}%</strong></div>
              <div><span>{c.trending}</span><strong>{emotionMeta[summary.trendingEmotion].emoji} {emotionMeta[summary.trendingEmotion][language]}</strong></div>
            </div>
            {!hasLiveBackend && <div className="demo-notice"><Sparkles size={17}/><span><strong>{c.demo}.</strong> {c.demoHint}</span></div>}
          </section>
        )}

        {view === 'explore' && <Explore language={language} points={points}/>} 
        {view === 'journal' && <Journal language={language} entries={journal} onCheckIn={()=>setComposerOpen(true)}/>} 
        {view === 'settings' && <Settings language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} canInstall={Boolean(deferredPrompt)} installed={installed} onInstall={install} onClear={clearJournal}/>} 
      </main>

      <BottomNav language={language} view={view} onChange={setView}/>
      <button className="floating-checkin" onClick={()=>setComposerOpen(true)} aria-label={c.checkIn}>＋</button>
      <MoodComposer open={composerOpen} language={language} onClose={()=>setComposerOpen(false)} onSubmit={submitMood}/>

      {showOnboarding && (
        <div className="onboarding-backdrop">
          <section className="onboarding-card">
            <Logo />
            <div className="onboard-globe"><span>😊</span><i/><i/><i/></div>
            <h1>{c.onboardTitle}</h1><p>{c.onboardBody}</p>
            <div className="onboard-points"><span>🔒 {c.onboardPrivacy}</span><span>⚡ {c.onboardFast}</span><span>📓 {c.onboardJournal}</span></div>
            <button className="primary-button wide" onClick={finishOnboarding}>{c.start}<ArrowUpRight size={18}/></button>
          </section>
        </div>
      )}
    </div>
  )
}
