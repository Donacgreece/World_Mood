import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Download, Globe2, HeartPulse, Moon, Share2, Sparkles, Sun, WifiOff } from 'lucide-react'
import { BottomNav } from './components/BottomNav'
import { Explore } from './components/Explore'
import { Journal } from './components/Journal'
import { Logo } from './components/Logo'
import { MoodComposer } from './components/MoodComposer'
import { Settings } from './components/Settings'
import { WorldMap } from './components/WorldMap'
import { copy, emotionMeta, scoreLabel } from './i18n'
import { createShareCard } from './lib/share'
import { fetchLiveMoods, hasLiveBackend, submitLiveMood } from './lib/supabase'
import { hasOnboarded, readJournal, readTheme, saveJournal, saveTheme, setOnboarded } from './lib/storage'
import type { EmotionKey, MoodEntry, MoodPoint, MoodSummary, ThemeMode, TimeRange, ViewKey } from './lib/types'

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

function coordinateLabel(lat: number, lng: number) {
  const latText = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`
  const lngText = `${Math.abs(lng).toFixed(1)}°${lng >= 0 ? 'E' : 'W'}`
  return `${latText}, ${lngText}`
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
    const score = bucket.reduce((sum, entry) => sum + entry.score, 0) / bucket.length
    return {
      id,
      label: coordinateLabel(lat, lng),
      detail: 'Approximate anonymous area',
      lat,
      lng,
      score: Number(score.toFixed(1)),
      emotion: dominantEmotion(bucket),
      activity: bucket.length
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
  const effectiveDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

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
    document.title = 'World Mood · See how the world feels'
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

  useEffect(() => {
    if (!hasLiveBackend) {
      setFeedEntries([])
      setLoadingLive(false)
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        setLoadingLive(true)
        const entries = await fetchLiveMoods(sinceForFeed(range))
        if (!cancelled) {
          setFeedEntries(entries)
          setBackendError(false)
        }
      } catch {
        if (!cancelled) {
          setBackendError(true)
          setFeedEntries([])
        }
      } finally {
        if (!cancelled) setLoadingLive(false)
      }
    }

    load()
    const timer = window.setInterval(load, 60000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [range])

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
      latestAt: currentEntries.reduce((latest, entry) => !latest || entry.createdAt > latest ? entry.createdAt : latest, '')
    }
  }, [currentEntries, previousEntries, points.length])

  const setTheme = (value: ThemeMode) => {
    setThemeState(value)
    saveTheme(value)
  }

  const quickToggleTheme = () => {
    const currentlyDark = document.documentElement.dataset.theme === 'dark'
    setTheme(currentlyDark ? 'light' : 'dark')
  }

  const submitMood = async (entry: MoodEntry) => {
    const next = [entry, ...journal]
    setJournal(next)
    saveJournal(next)

    if (!hasLiveBackend) return false

    try {
      await submitLiveMood(entry)
      setBackendError(false)
      setFeedEntries((current) => [{ ...entry, source: 'supabase' }, ...current])
      return true
    } catch {
      setBackendError(true)
      return false
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
    const text = `The world is feeling ${summary.score}/10 right now on World Mood, based on ${summary.responses.toLocaleString()} real anonymous check-ins.`
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
      // Sharing can be cancelled by the user.
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
      {!online && <div className="offline-banner"><WifiOff size={16} />{copy.offline}</div>}

      <aside className="desktop-rail">
        <Logo compact />
        <div className="rail-nav">
          {[
            { k: 'home', i: Globe2 },
            { k: 'explore', i: Activity },
            { k: 'journal', i: HeartPulse },
            { k: 'settings', i: Sparkles }
          ].map(({ k, i: Icon }) => (
            <button key={k} className={view === k ? 'is-active' : ''} onClick={() => setView(k as ViewKey)} aria-label={copy.nav[k as keyof typeof copy.nav]}>
              <Icon size={21} />
            </button>
          ))}
        </div>
        <button className="rail-theme" onClick={quickToggleTheme} aria-label="Toggle theme">
          {effectiveDark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <Logo />
          <div className="top-actions">
            <div className={`network-pill network-${liveState}`} title={liveLabel}>
              <span className={`live-dot ${liveState !== 'live' ? 'is-muted' : ''}`} />
              <span>{liveLabel}</span>
            </div>
            <button className="icon-button" onClick={quickToggleTheme} aria-label="Toggle light and dark mode">
              {effectiveDark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            {deferredPrompt && !installed && <button className="icon-button install-top" onClick={install} aria-label="Install"><Download size={19} /></button>}
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
                  <span>{emotionMeta[summary.trendingEmotion].emoji} {summary.label}</span>
                  <strong>{summary.score.toFixed(1)}</strong>
                  <small>/10</small>
                </div>
              ) : (
                <div className="global-score-card is-empty">
                  <span>{loadingLive ? 'Loading live check-ins…' : copy.noLiveData}</span>
                  <strong>—</strong>
                </div>
              )}

              {points.length === 0 && !loadingLive && (
                <div className="map-empty-state">
                  <span className="empty-pulse">◎</span>
                  <strong>{hasLiveBackend ? copy.noLiveData : copy.disconnected}</strong>
                  <p>{hasLiveBackend ? copy.noLiveDataBody : copy.backendRequired}</p>
                </div>
              )}

              <div className="map-hint">{copy.mapHint}</div>
              <div className="range-selector segmented">
                {(['now', '24h', '7d', '30d'] as TimeRange[]).map((value) => (
                  <button key={value} className={range === value ? 'is-active' : ''} onClick={() => setRange(value)}>
                    {value === 'now' ? copy.now : value === '24h' ? copy.h24 : value === '7d' ? copy.d7 : copy.d30}
                  </button>
                ))}
              </div>
            </div>

            <div className="stats-strip">
              <div><span>{copy.responses}</span><strong>{summary ? summary.responses.toLocaleString() : '0'}</strong></div>
              <div><span>{copy.mappedAreas}</span><strong>{summary ? summary.mappedAreas.toLocaleString() : '0'}</strong></div>
              <div><span>{copy.moodShift}</span><strong>{summary?.delta == null ? '—' : `${summary.delta >= 0 ? '+' : ''}${summary.delta.toFixed(1)}`}</strong></div>
              <div><span>{copy.dataAge}</span><strong>{relativeTime(summary?.latestAt)}</strong></div>
            </div>

            <div className={`data-truth-note ${liveState === 'live' ? '' : 'is-warning'}`}>
              <Sparkles size={17} />
              <span><strong>{copy.realDataOnly}.</strong> {liveState === 'live' ? copy.realDataHint : `${liveLabel}. ${copy.realDataHint}`}</span>
            </div>
          </section>
        )}

        {view === 'explore' && <Explore points={points} />}
        {view === 'journal' && <Journal entries={journal} onCheckIn={() => setComposerOpen(true)} />}
        {view === 'settings' && (
          <Settings
            theme={theme}
            setTheme={setTheme}
            canInstall={Boolean(deferredPrompt)}
            installed={installed}
            onInstall={install}
            onClear={clearJournal}
          />
        )}
      </main>

      <BottomNav view={view} onChange={setView} />
      <button className="floating-checkin" onClick={() => setComposerOpen(true)} aria-label={copy.checkIn}>＋</button>
      <MoodComposer open={composerOpen} liveSharing={hasLiveBackend} onClose={() => setComposerOpen(false)} onSubmit={submitMood} />

      {showOnboarding && (
        <div className="onboarding-backdrop">
          <section className="onboarding-card">
            <Logo />
            <div className="onboard-globe"><span>😊</span><i /><i /><i /></div>
            <h1>{copy.onboardTitle}</h1>
            <p>{copy.onboardBody}</p>
            <div className="onboard-points">
              <span>🔒 {copy.onboardPrivacy}</span>
              <span>⚡ {copy.onboardFast}</span>
              <span>📓 {copy.onboardJournal}</span>
              <span>✓ {copy.onboardReal}</span>
            </div>
            <button className="primary-button wide" onClick={finishOnboarding}>{copy.start}<ArrowUpRight size={18} /></button>
          </section>
        </div>
      )}
    </div>
  )
}
