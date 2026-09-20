import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Activity, ArrowUpRight, Download, Globe2, HeartHandshake, HeartPulse, Moon, Radio, Share2, Sparkles, Sun, WifiOff } from 'lucide-react'
import { BottomNav } from './components/BottomNav'
import { Explore } from './components/Explore'
import { Journal } from './components/Journal'
import { LaunchScreen } from './components/LaunchScreen'
import { Logo } from './components/Logo'
import { MoodComposer } from './components/MoodComposer'
import { PulseFeed } from './components/PulseFeed'
import { Settings } from './components/Settings'
import { WorldMap } from './components/WorldMap'
import { countryName } from './lib/geo'
import { copy, emotionMeta, scoreLabel } from './i18n'
import { createShareCard } from './lib/share'
import { fetchLiveMoods, hasLiveBackend, LiveRateLimitError, reactToMood, submitLiveMood } from './lib/supabase'
import { getActorHash, hasOnboarded, markReacted, readJournal, readReactedIds, readTheme, saveJournal, saveTheme, setOnboarded } from './lib/storage'
import type { EmotionKey, MoodEntry, MoodPoint, MoodSummary, SubmitResult, ThemeMode, TimeRange, ViewKey } from './lib/types'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const RANGE_MS: Record<TimeRange, number> = {
  now: 2 * 3600000,
  '24h': 24 * 3600000,
  '7d': 7 * 86400000,
  '30d': 30 * 86400000
}

function sinceForFeed(range: TimeRange) {
  return new Date(Date.now() - RANGE_MS[range] * 2).toISOString()
}

function dominantEmotion(entries: MoodEntry[]): EmotionKey {
  const counts = new Map<EmotionKey, number>()
  entries.forEach((entry) => counts.set(entry.emotion, (counts.get(entry.emotion) || 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'okay'
}

function aggregatePoints(entries: MoodEntry[]): MoodPoint[] {
  const buckets = new Map<string, MoodEntry[]>()

  entries.forEach((entry) => {
    if (entry.lat == null || entry.lng == null) return
    const key = `${entry.lat.toFixed(1)}:${entry.lng.toFixed(1)}`
    const bucket = buckets.get(key) || []
    bucket.push(entry)
    buckets.set(key, bucket)
  })

  return [...buckets.entries()].map(([id, bucket]) => {
    const lat = bucket[0].lat as number
    const lng = bucket[0].lng as number
    const code = bucket.find((entry) => entry.countryCode)?.countryCode
    const score = bucket.reduce((sum, entry) => sum + entry.score, 0) / bucket.length
    return {
      id,
      label: countryName(code) || 'Anonymous area',
      detail: 'Approximate privacy-safe area',
      lat,
      lng,
      score: Number(score.toFixed(1)),
      emotion: dominantEmotion(bucket),
      activity: bucket.length,
      countryCode: code
    }
  })
}

function relativeTime(iso?: string) {
  if (!iso) return '—'
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const hours = Math.round(diffMinutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export default function App() {
  const [theme, setThemeState] = useState<ThemeMode>(() => readTheme())
  const [view, setView] = useState<ViewKey>('home')
  const [range, setRange] = useState<TimeRange>('now')
  const [journal, setJournal] = useState<MoodEntry[]>(() => readJournal())
  const [composerOpen, setComposerOpen] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<MoodPoint | null>(null)
  const [feedEntries, setFeedEntries] = useState<MoodEntry[]>([])
  const [backendError, setBackendError] = useState(false)
  const [loadingLive, setLoadingLive] = useState(hasLiveBackend)
  const [online, setOnline] = useState(navigator.onLine)
  const [showOnboarding, setShowOnboarding] = useState(() => !hasOnboarded())
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(window.matchMedia('(display-mode: standalone)').matches)
  const [reactedIds, setReactedIds] = useState<Set<string>>(() => readReactedIds())

  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#070a13' : '#f6f8fc')
    }
    apply()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = 'en'
    document.title = 'World Mood · Feel the planet together'
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('compose') === '1') {
      setComposerOpen(true)
      url.searchParams.delete('compose')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }, [])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    const onInstall = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const refreshNetwork = useCallback(async (quiet = false) => {
    if (!hasLiveBackend) {
      setFeedEntries([])
      setLoadingLive(false)
      return
    }

    try {
      if (!quiet) setLoadingLive(true)
      const entries = await fetchLiveMoods(sinceForFeed(range))
      setFeedEntries(entries)
      setBackendError(false)
    } catch {
      setBackendError(true)
    } finally {
      if (!quiet) setLoadingLive(false)
    }
  }, [range])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (cancelled) return
      await refreshNetwork(false)
    }
    load()
    const timer = window.setInterval(() => {
      if (!cancelled && document.visibilityState === 'visible' && navigator.onLine) refreshNetwork(true)
    }, 12000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [refreshNetwork])

  const { currentEntries, previousEntries } = useMemo(() => {
    const boundary = Date.now() - RANGE_MS[range]
    return {
      currentEntries: feedEntries.filter((entry) => new Date(entry.createdAt).getTime() >= boundary),
      previousEntries: feedEntries.filter((entry) => new Date(entry.createdAt).getTime() < boundary)
    }
  }, [feedEntries, range])

  const points = useMemo(() => aggregatePoints(currentEntries), [currentEntries])

  const summary = useMemo<MoodSummary | null>(() => {
    if (currentEntries.length === 0) return null
    const score = currentEntries.reduce((sum, entry) => sum + entry.score, 0) / currentEntries.length
    const previousScore = previousEntries.length
      ? previousEntries.reduce((sum, entry) => sum + entry.score, 0) / previousEntries.length
      : null

    return {
      score: Number(score.toFixed(1)),
      label: scoreLabel(score),
      responses: currentEntries.length,
      mappedAreas: points.length,
      delta: previousScore == null ? null : Number((score - previousScore).toFixed(1)),
      trendingEmotion: dominantEmotion(currentEntries),
      latestAt: currentEntries.reduce((latest, entry) => !latest || entry.createdAt > latest ? entry.createdAt : latest, ''),
      resonances: currentEntries.reduce((sum, entry) => sum + (entry.resonanceCount || 0), 0)
    }
  }, [currentEntries, previousEntries, points.length])

  const emotionDistribution = useMemo(() => {
    const counts = new Map<EmotionKey, number>()
    currentEntries.forEach((entry) => counts.set(entry.emotion, (counts.get(entry.emotion) || 0) + 1))
    return [...counts.entries()]
      .map(([emotion, count]) => ({ emotion, count, percent: currentEntries.length ? Math.round((count / currentEntries.length) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [currentEntries])

  const setTheme = (value: ThemeMode) => {
    setThemeState(value)
    saveTheme(value)
  }

  const quickToggleTheme = () => {
    const currentlyDark = document.documentElement.dataset.theme === 'dark'
    setTheme(currentlyDark ? 'light' : 'dark')
  }

  const submitMood = async (entry: MoodEntry): Promise<SubmitResult> => {
    const next = [entry, ...journal]
    setJournal(next)
    saveJournal(next)

    if (!hasLiveBackend) return { shared: false, reason: 'backend-offline' }

    try {
      const actorHash = await getActorHash()
      await submitLiveMood(entry, actorHash)
      setBackendError(false)
      await refreshNetwork(true)
      return { shared: true }
    } catch (error) {
      if (error instanceof LiveRateLimitError) return { shared: false, reason: 'rate-limit' }
      setBackendError(true)
      return { shared: false, reason: 'network-error' }
    }
  }

  const react = async (entry: MoodEntry) => {
    if (!hasLiveBackend || reactedIds.has(entry.id)) return
    try {
      const actorHash = await getActorHash()
      const count = await reactToMood(entry.id, actorHash)
      markReacted(entry.id)
      setReactedIds((current) => new Set([...current, entry.id]))
      setFeedEntries((current) => current.map((item) => item.id === entry.id ? { ...item, resonanceCount: Number(count) } : item))
    } catch {
      setBackendError(true)
    }
  }

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') setDeferredPrompt(null)
  }

  const share = async () => {
    if (!summary) return
    const blob = await createShareCard(summary)
    const text = `World Mood is ${summary.score}/10 right now, based on ${summary.responses.toLocaleString()} real anonymous check-ins.`
    try {
      const file = blob ? new File([blob], 'world-mood.png', { type: 'image/png' }) : null
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'World Mood', text, files: [file] })
      } else if (navigator.share) {
        await navigator.share({ title: 'World Mood', text, url: window.location.href })
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`)
      }
    } catch {
      // The user may cancel the share sheet.
    }
  }

  const clearJournal = () => {
    if (!window.confirm(`${copy.clearConfirm}\n\n${copy.clearConfirmBody}`)) return
    setJournal([])
    saveJournal([])
  }

  const finishOnboarding = () => {
    setOnboarded()
    setShowOnboarding(false)
  }

  const liveState = !hasLiveBackend ? 'disconnected' : backendError ? 'error' : 'live'
  const liveLabel = liveState === 'live' ? copy.live : liveState === 'error' ? copy.unavailable : copy.disconnected

  return (
    <div className="app-shell">
      <LaunchScreen />
      {!online && <div className="offline-banner"><WifiOff size={16} />{copy.offline}</div>}

      <aside className="desktop-rail">
        <Logo compact />
        <div className="rail-nav">
          <button className={view === 'home' ? 'is-active' : ''} onClick={() => setView('home')} aria-label="Now"><Globe2 /></button>
          <button className={view === 'explore' ? 'is-active' : ''} onClick={() => setView('explore')} aria-label="Explore"><Activity /></button>
          <button className={view === 'journal' ? 'is-active' : ''} onClick={() => setView('journal')} aria-label="Journal"><HeartPulse /></button>
          <button className={view === 'settings' ? 'is-active' : ''} onClick={() => setView('settings')} aria-label="You"><Sparkles /></button>
        </div>
        <button className="rail-theme" onClick={quickToggleTheme} aria-label="Toggle theme">{document.documentElement.dataset.theme === 'dark' ? <Sun /> : <Moon />}</button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <Logo />
          <div className="top-actions">
            <div className={`network-pill is-${liveState}`} title={copy.realDataHint}>
              <span className="live-dot" />
              <span>{liveLabel}</span>
            </div>
            {!installed && deferredPrompt && <button className="icon-button hide-mobile" onClick={install} aria-label="Install app"><Download size={18} /></button>}
            <button className="icon-button" onClick={quickToggleTheme} aria-label="Toggle light and dark mode">{document.documentElement.dataset.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          </div>
        </header>

        {view === 'home' && (
          <section className="home-page">
            <div className="hero-copy">
              <span className="eyebrow">{copy.heroEyebrow}</span>
              <h1>{copy.heroTitle}</h1>
              <p>{copy.heroSubtitle}</p>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => setComposerOpen(true)}>{copy.checkIn}<ArrowUpRight size={18} /></button>
                <button className="secondary-button" onClick={share} disabled={!summary}><Share2 size={18} />{copy.share}</button>
              </div>
            </div>

            <div className="map-stage">
              <WorldMap points={points} selectedId={selectedPoint?.id} onSelect={setSelectedPoint} />

              {summary ? (
                <div className="global-score-card">
                  <span>WORLD MOOD</span>
                  <strong>{summary.score.toFixed(1)}</strong><small>/10</small>
                  <em>{summary.label}</em>
                </div>
              ) : (
                <div className="map-empty-state">
                  <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" />
                  <strong>{hasLiveBackend ? copy.noLiveData : copy.disconnected}</strong>
                  <span>{hasLiveBackend ? copy.noLiveDataBody : copy.backendRequired}</span>
                </div>
              )}

              <div className="range-selector segmented">
                {(['now', '24h', '7d', '30d'] as TimeRange[]).map((value) => (
                  <button key={value} className={range === value ? 'is-active' : ''} onClick={() => setRange(value)}>
                    {value === 'now' ? copy.now : value === '24h' ? copy.h24 : value === '7d' ? copy.d7 : copy.d30}
                  </button>
                ))}
              </div>
            </div>

            <div className="map-helper"><span>{copy.mapHint}</span><strong>{copy.realDataOnly}</strong></div>

            <div className="stats-strip four">
              <div><span>{copy.responses}</span><strong>{summary ? summary.responses.toLocaleString() : '—'}</strong></div>
              <div><span>{copy.mappedAreas}</span><strong>{summary ? summary.mappedAreas.toLocaleString() : '—'}</strong></div>
              <div><span>{copy.trending}</span><strong>{summary ? `${emotionMeta[summary.trendingEmotion].emoji} ${emotionMeta[summary.trendingEmotion].name}` : '—'}</strong></div>
              <div><span>{copy.resonances}</span><strong>{summary ? summary.resonances.toLocaleString() : '—'}</strong></div>
            </div>

            {summary && (
              <div className="world-pulse-card">
                <div className="world-pulse-copy">
                  <span><Radio size={14} /> WORLD PULSE</span>
                  <strong>{summary.label}</strong>
                  <p>{summary.delta == null ? 'Collecting enough history to calculate a shift.' : `${summary.delta > 0 ? '+' : ''}${summary.delta.toFixed(1)} mood points versus the previous period.`}</p>
                </div>
                <div className="emotion-ribbon">
                  {emotionDistribution.map((item) => (
                    <div key={item.emotion} className="emotion-ribbon-item">
                      <span>{emotionMeta[item.emotion].emoji}</span>
                      <div><strong>{emotionMeta[item.emotion].name}</strong><small>{item.percent}%</small></div>
                      <i style={{ '--share': `${item.percent}%` } as CSSProperties} />
                    </div>
                  ))}
                </div>
                <div className="world-pulse-meta">
                  <span>Latest {relativeTime(summary.latestAt)}</span>
                  <span>{loadingLive ? 'Syncing…' : 'Auto refresh 12s'}</span>
                </div>
              </div>
            )}

            <PulseFeed entries={currentEntries} reactedIds={reactedIds} onReact={react} compact />
          </section>
        )}

        {view === 'explore' && <Explore points={points} entries={currentEntries} reactedIds={reactedIds} onReact={react} />}
        {view === 'journal' && <Journal entries={journal} onCheckIn={() => setComposerOpen(true)} />}
        {view === 'settings' && <Settings theme={theme} setTheme={setTheme} canInstall={Boolean(deferredPrompt)} installed={installed} onInstall={install} onClear={clearJournal} liveConnected={hasLiveBackend} />}
      </main>

      <button className="mobile-pulse-fab" onClick={() => setComposerOpen(true)} aria-label="Share your mood"><span>+</span></button>
      <BottomNav view={view} onChange={setView} />
      <MoodComposer open={composerOpen} liveSharing={hasLiveBackend && !backendError} onClose={() => setComposerOpen(false)} onSubmit={submitMood} />

      {showOnboarding && (
        <div className="onboarding-backdrop">
          <section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
            <img className="onboarding-logo" src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" />
            <span className="eyebrow">WELCOME TO WORLD MOOD</span>
            <h2 id="onboarding-title">{copy.onboardTitle}</h2>
            <p>{copy.onboardBody}</p>
            <div className="onboarding-features">
              <span>{copy.onboardPrivacy}</span>
              <span>{copy.onboardFast}</span>
              <span>{copy.onboardJournal}</span>
              <span>{copy.onboardReal}</span>
            </div>
            <button className="primary-button" onClick={finishOnboarding}>{copy.start}<ArrowUpRight size={18} /></button>
          </section>
        </div>
      )}
    </div>
  )
}
