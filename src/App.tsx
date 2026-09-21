import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Activity, ArrowUpRight, Download, Globe2, HeartPulse, MapPin, Moon, Radio, RefreshCw, Share2, Sparkles, Sun, WifiOff } from 'lucide-react'
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

type LiveState = 'disconnected' | 'checking' | 'error' | 'live'

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

function pointId(lat: number, lng: number) {
  return `${lat.toFixed(1)}:${lng.toFixed(1)}`
}

function aggregatePoints(entries: MoodEntry[]): MoodPoint[] {
  const buckets = new Map<string, MoodEntry[]>()

  entries.forEach((entry) => {
    if (entry.lat == null || entry.lng == null) return
    const key = pointId(entry.lat, entry.lng)
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
      detail: `~${lat.toFixed(1)}°, ${lng.toFixed(1)}° · approximate 0.5° privacy grid`,
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
  const [composerPreset, setComposerPreset] = useState<EmotionKey | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<MoodPoint | null>(null)
  const [lastSharedBucket, setLastSharedBucket] = useState<string | null>(null)
  const [feedEntries, setFeedEntries] = useState<MoodEntry[]>([])
  const [backendError, setBackendError] = useState(false)
  const [backendHealthy, setBackendHealthy] = useState(false)
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
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#080b14' : '#f5f7fb')
    }
    apply()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = 'en'
    document.title = 'Moodaro · Feel the world together'
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
      setBackendHealthy(false)
      setLoadingLive(false)
      return
    }

    try {
      if (!quiet) setLoadingLive(true)
      const entries = await fetchLiveMoods(sinceForFeed(range))
      setFeedEntries(entries)
      setBackendError(false)
      setBackendHealthy(true)
    } catch {
      setBackendError(true)
      setBackendHealthy(false)
    } finally {
      if (!quiet) setLoadingLive(false)
    }
  }, [range])

  useEffect(() => {
    let cancelled = false
    void refreshNetwork(false)
    const timer = window.setInterval(() => {
      if (!cancelled && document.visibilityState === 'visible' && navigator.onLine) void refreshNetwork(true)
    }, 12_000)
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

  useEffect(() => {
    if (!lastSharedBucket) return
    const point = points.find((item) => item.id === lastSharedBucket)
    if (point) {
      setSelectedPoint(point)
      setLastSharedBucket(null)
    }
  }, [lastSharedBucket, points])

  useEffect(() => {
    if (selectedPoint && !points.some((point) => point.id === selectedPoint.id)) setSelectedPoint(null)
  }, [points, selectedPoint])

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
      const result = await submitLiveMood(entry, actorHash)
      const server = result?.[0]
      const liveEntry: MoodEntry = {
        ...entry,
        id: server?.id || entry.id,
        createdAt: server?.created_at || entry.createdAt,
        note: undefined,
        resonanceCount: 0,
        source: 'supabase'
      }

      setFeedEntries((current) => [liveEntry, ...current.filter((item) => item.id !== liveEntry.id)])
      if (liveEntry.lat != null && liveEntry.lng != null) setLastSharedBucket(pointId(liveEntry.lat, liveEntry.lng))
      setBackendError(false)
      setBackendHealthy(true)
      window.setTimeout(() => void refreshNetwork(true), 350)
      return { shared: true }
    } catch (error) {
      if (error instanceof LiveRateLimitError) return { shared: false, reason: 'rate-limit' }
      setBackendError(true)
      setBackendHealthy(false)
      return { shared: false, reason: 'network-error' }
    }
  }

  const react = async (entry: MoodEntry) => {
    if (!backendHealthy || reactedIds.has(entry.id)) return
    try {
      const actorHash = await getActorHash()
      const count = await reactToMood(entry.id, actorHash)
      markReacted(entry.id)
      setReactedIds((current) => new Set([...current, entry.id]))
      setFeedEntries((current) => current.map((item) => item.id === entry.id ? { ...item, resonanceCount: Number(count) } : item))
    } catch {
      setBackendError(true)
      setBackendHealthy(false)
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
    const text = `Moodaro is ${summary.score}/10 right now, based on ${summary.responses.toLocaleString()} real anonymous check-ins.`
    try {
      const file = blob ? new File([blob], 'moodaro-pulse.png', { type: 'image/png' }) : null
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Moodaro', text, files: [file] })
      } else if (navigator.share) {
        await navigator.share({ title: 'Moodaro', text, url: window.location.href })
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`)
      }
    } catch {
      // Share sheet dismissed.
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

  const liveState: LiveState = !hasLiveBackend
    ? 'disconnected'
    : loadingLive && !backendHealthy
      ? 'checking'
      : backendError || !backendHealthy
        ? 'error'
        : 'live'

  const liveLabel = liveState === 'live'
    ? 'Live · real data'
    : liveState === 'checking'
      ? 'Connecting…'
      : liveState === 'error'
        ? copy.unavailable
        : copy.disconnected

  return (
    <div className="app-shell">
      <LaunchScreen />
      {!online && <div className="offline-banner"><WifiOff size={16} />{copy.offline}</div>}

      <aside className="desktop-rail" aria-label="Primary navigation">
        <Logo compact onClick={() => { setView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
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
          <Logo onClick={() => { setView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
          <nav className="desktop-top-nav" aria-label="Desktop navigation">
            <button className={view === 'home' ? 'is-active' : ''} onClick={() => setView('home')}>Now</button>
            <button className={view === 'explore' ? 'is-active' : ''} onClick={() => setView('explore')}>Explore</button>
            <button className={view === 'journal' ? 'is-active' : ''} onClick={() => setView('journal')}>Journal</button>
            <button className={view === 'settings' ? 'is-active' : ''} onClick={() => setView('settings')}>You</button>
          </nav>
          <div className="top-actions">
            <button className={`network-pill is-${liveState}`} title={copy.realDataHint} onClick={() => void refreshNetwork(false)} aria-label={`${liveLabel}. Refresh live network`}>
              <span className="live-dot" />
              <span>{liveLabel}</span>
              {liveState === 'error' && <RefreshCw size={13} />}
            </button>
            {!installed && deferredPrompt && <button className="icon-button hide-mobile" onClick={install} aria-label="Install app"><Download size={18} /></button>}
            <button className="icon-button" onClick={quickToggleTheme} aria-label="Toggle light and dark mode">{document.documentElement.dataset.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          </div>
        </header>

        {view === 'home' && (
          <section className="home-page">
            <div className="home-hero-grid">
              <div className="hero-copy">
                <div className="hero-live-line"><span className={`live-dot ${liveState !== 'live' ? 'is-muted' : ''}`} /><span>{liveState === 'live' ? 'The live network is listening' : liveLabel}</span></div>
                <span className="eyebrow">{copy.heroEyebrow}</span>
                <h1 className="moodaro-hero-title"><span>Real People.</span><span>Real Feelings.</span><span className="hero-gradient-text">A Brighter Tomorrow.</span></h1>
                <p>{copy.heroSubtitle}</p>
                <div className="quick-mood-card" aria-label="Quick mood check-in">
                  <div className="quick-mood-copy"><strong>How are you feeling?</strong><span>Share your mood in seconds</span></div>
                  <div className="quick-mood-row">
                    {(['great','good','calm','low','stressed'] as EmotionKey[]).map((emotion) => (
                      <button key={emotion} onClick={() => { setComposerPreset(emotion); setComposerOpen(true) }} aria-label={`Share a ${emotionMeta[emotion].name} mood`}>
                        <span>{emotionMeta[emotion].emoji}</span><small>{emotionMeta[emotion].name}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="hero-actions">
                  <button className="primary-button" onClick={() => { setComposerPreset(null); setComposerOpen(true) }}>{copy.checkIn}<ArrowUpRight size={18} /></button>
                  <button className="secondary-button" onClick={share} disabled={!summary}><Share2 size={18} />{copy.share}</button>
                </div>
                <div className="hero-trust-row">
                  <span><MapPin size={14} />Approximate location only</span>
                  <span><Radio size={14} />No simulated activity</span>
                </div>

                <div className="hero-metrics">
                  <div><span>Check-ins</span><strong>{summary ? summary.responses.toLocaleString() : '0'}</strong></div>
                  <div><span>Mapped areas</span><strong>{summary ? summary.mappedAreas.toLocaleString() : '0'}</strong></div>
                  <div><span>Top feeling</span><strong>{summary ? `${emotionMeta[summary.trendingEmotion].emoji} ${emotionMeta[summary.trendingEmotion].name}` : 'Waiting'}</strong></div>
                </div>
              </div>

              <div className="map-column">
                <div className="map-stage">
                  <WorldMap points={points} selectedId={selectedPoint?.id} onSelect={setSelectedPoint} />

                  <div className={`map-live-chip is-${liveState}`}><span className="live-dot" />{liveLabel}</div>

                  {summary ? (
                    <div className="global-score-card">
                      <span>MOODARO</span>
                      <div><strong>{summary.score.toFixed(1)}</strong><small>/10</small></div>
                      <em>{summary.label}</em>
                    </div>
                  ) : !loadingLive && (
                    <div className="map-empty-state">
                      <img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" />
                      <strong>{backendHealthy ? copy.noLiveData : copy.unavailable}</strong>
                      <span>{backendHealthy ? copy.noLiveDataBody : 'The map will reconnect automatically. Your private journal still works.'}</span>
                    </div>
                  )}

                  {selectedPoint && (
                    <div className="selected-area-card">
                      <span>{emotionMeta[selectedPoint.emotion].emoji}</span>
                      <div>
                        <strong>{emotionMeta[selectedPoint.emotion].emoji} {selectedPoint.label}</strong>
                        <b>{emotionMeta[selectedPoint.emotion].name} · {selectedPoint.score.toFixed(1)}/10</b>
                        <small>{selectedPoint.detail} · {selectedPoint.activity} check-in{selectedPoint.activity === 1 ? '' : 's'}</small>
                      </div>
                      <button onClick={() => setSelectedPoint(null)} aria-label="Close selected area">×</button>
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
                <div className="map-legend" aria-label="Mood marker color legend">
                  <span className="legend-title">Mood color</span>
                  <span><i className="legend-swatch is-great" />Great 8+</span>
                  <span><i className="legend-swatch is-good" />Good 7+</span>
                  <span><i className="legend-swatch is-calm" />Calm 6+</span>
                  <span><i className="legend-swatch is-okay" />Okay 5+</span>
                  <span><i className="legend-swatch is-tired" />Tired 4+</span>
                  <span><i className="legend-swatch is-low" />Low 3+</span>
                  <span><i className="legend-swatch is-stressed" />Stressed &lt;3</span>
                </div>
                <div className="map-helper">
                  <span className="desktop-map-hint">Scroll to zoom · drag to move · select a marker for its exact mood reading</span>
                  <span className="mobile-map-hint">Scroll normally · pinch with two fingers to zoom · tap a marker for mood details</span>
                  <strong>{copy.realDataOnly}</strong>
                </div>
              </div>
            </div>

            <div className="stats-strip four">
              <div><span>{copy.responses}</span><strong>{summary ? summary.responses.toLocaleString() : '0'}</strong></div>
              <div><span>{copy.mappedAreas}</span><strong>{summary ? summary.mappedAreas.toLocaleString() : '0'}</strong></div>
              <div><span>{copy.trending}</span><strong>{summary ? `${emotionMeta[summary.trendingEmotion].emoji} ${emotionMeta[summary.trendingEmotion].name}` : '—'}</strong></div>
              <div><span>{copy.resonances}</span><strong>{summary ? summary.resonances.toLocaleString() : '0'}</strong></div>
            </div>

            {summary && (
              <div className="world-pulse-card">
                <div className="world-pulse-copy">
                  <span><Radio size={14} /> MOODARO PULSE</span>
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
                  <span>{loadingLive ? 'Syncing…' : 'Live refresh every 12s'}</span>
                </div>
              </div>
            )}

            <PulseFeed entries={currentEntries} reactedIds={reactedIds} onReact={react} compact />
          </section>
        )}

        {view === 'explore' && <Explore points={points} entries={currentEntries} reactedIds={reactedIds} onReact={react} />}
        {view === 'journal' && <Journal entries={journal} onCheckIn={() => { setComposerPreset(null); setComposerOpen(true) }} />}
        {view === 'settings' && <Settings theme={theme} setTheme={setTheme} canInstall={Boolean(deferredPrompt)} installed={installed} onInstall={install} onClear={clearJournal} liveConnected={liveState === 'live'} />}
      </main>

      <button className="mobile-pulse-fab" onClick={() => { setComposerPreset(null); setComposerOpen(true) }} aria-label="Share your mood"><span>+</span></button>
      <BottomNav view={view} onChange={setView} />
      <MoodComposer open={composerOpen} initialEmotion={composerPreset} liveSharing={liveState === 'live'} onClose={() => setComposerOpen(false)} onSubmit={submitMood} />

      {showOnboarding && (
        <div className="onboarding-backdrop">
          <section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
            <img className="onboarding-logo" src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" />
            <span className="eyebrow">WELCOME TO MOODARO</span>
            <h2 id="onboarding-title">{copy.onboardTitle}</h2>
            <p>{copy.onboardBody}</p>
            <div className="onboarding-features">
              <span>{copy.onboardPrivacy}</span>
              <span>Map placement is opt-out</span>
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
