import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Activity, ArrowUpRight, Download, Globe2, HeartPulse, Link2, MapPin, Moon, Radio, RefreshCw, Share2, Sparkles, Sun, WifiOff } from 'lucide-react'
import { BottomNav } from './components/BottomNav'
import { Explore } from './components/Explore'
import { Journal } from './components/Journal'
import { LaunchScreen } from './components/LaunchScreen'
import { Logo } from './components/Logo'
import { MoodComposer } from './components/MoodComposer'
import { PulseFeed } from './components/PulseFeed'
import { MapPlayback } from './components/MapPlayback'
import { MiniPulse } from './components/MiniPulse'
import { HomeJourneyCard } from './components/HomeJourneyCard'
import { SocialInsights } from './components/SocialInsights'
import { WorldQuestionCard } from './components/WorldQuestionCard'
import { Settings } from './components/Settings'
import { WorldMap } from './components/WorldMap'
import { countryName } from './lib/geo'
import { copy, emotionMeta, scoreLabel } from './i18n'
import { createRecapCard, createShareCard, weeklyRecap, yearRecap } from './lib/share'
import { fetchActiveEvents, fetchLiveMoods, fetchWorldQuestion, hasLiveBackend, LiveRateLimitError, reactToMood, reportMood, submitLiveMood, voteWorldQuestion } from './lib/supabase'
import { getActorHash, hasOnboarded, markReacted, markReported, readDailyReminder, readJournal, readNotifiedDate, readReactedIds, readReportedIds, readTheme, saveDailyReminder, saveJournal, saveNotifiedDate, saveTheme, setOnboarded } from './lib/storage'
import type { EmotionKey, MoodEntry, MoodEvent, MoodMoment, MoodPoint, MoodSummary, MoodWave, SubmitResult, ThemeMode, TimeRange, ViewKey, WorldQuestion } from './lib/types'

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
  return new Date(Date.now() - Math.max(RANGE_MS[range] * 2, 24 * 3600000)).toISOString()
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

function localDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function deriveMoodWaves(entries: MoodEntry[]): MoodWave[] {
  const now = Date.now()
  const currentStart = now - 60 * 60 * 1000
  const previousStart = now - 2 * 60 * 60 * 1000
  const buckets = new Map<string, { current: MoodEntry[]; previous: MoodEntry[] }>()
  entries.forEach((entry) => {
    if (entry.lat == null || entry.lng == null) return
    const time = new Date(entry.createdAt).getTime()
    if (time < previousStart) return
    const key = pointId(entry.lat, entry.lng)
    const bucket = buckets.get(key) || { current: [], previous: [] }
    if (time >= currentStart) bucket.current.push(entry)
    else bucket.previous.push(entry)
    buckets.set(key, bucket)
  })
  return [...buckets.entries()].flatMap(([id, bucket]) => {
    if (bucket.current.length < 2 || bucket.previous.length < 2) return []
    const currentScore = bucket.current.reduce((s,e)=>s+e.score,0)/bucket.current.length
    const previousScore = bucket.previous.reduce((s,e)=>s+e.score,0)/bucket.previous.length
    const delta = currentScore - previousScore
    if (Math.abs(delta) < 1) return []
    const code = bucket.current.find(e=>e.countryCode)?.countryCode
    return [{ pointId:id, label:countryName(code)||'Anonymous area', currentScore, previousScore, delta, activity:bucket.current.length, emotion:dominantEmotion(bucket.current) }]
  }).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,4)
}

function deriveMoments(entries: MoodEntry[], previous: MoodEntry[]): MoodMoment[] {
  if (entries.length < 5) return []
  const moments: MoodMoment[] = []
  const dominant = dominantEmotion(entries)
  const dominantCount = entries.filter(e=>e.emotion===dominant).length
  if (dominantCount >= 3) moments.push({ id:'dominant', emoji:emotionMeta[dominant].emoji, title:`${emotionMeta[dominant].name} is leading`, body:`${dominantCount} of ${entries.length} recent real pulses are ${emotionMeta[dominant].name.toLowerCase()}.` })
  if (previous.length >= 3) {
    const nowScore = entries.reduce((s,e)=>s+e.score,0)/entries.length
    const prevScore = previous.reduce((s,e)=>s+e.score,0)/previous.length
    const delta = nowScore-prevScore
    if (Math.abs(delta)>=.4) moments.push({ id:'shift', emoji:delta>0?'↗️':'↘️', title:delta>0?'The pulse is lifting':'The pulse is softening', body:`The current real mood average is ${Math.abs(delta).toFixed(1)} points ${delta>0?'higher':'lower'} than the previous period.` })
  }
  const reasonCounts = new Map<string,number>()
  entries.forEach(e=>{ if(e.reason) reasonCounts.set(e.reason,(reasonCounts.get(e.reason)||0)+1) })
  const topReason=[...reasonCounts.entries()].sort((a,b)=>b[1]-a[1])[0]
  if(topReason && topReason[1]>=3) moments.push({id:'reason',emoji:'✨',title:`${topReason[0][0].toUpperCase()+topReason[0].slice(1)} is shaping the room`,body:`${topReason[1]} recent real pulses tagged ${topReason[0]} as part of what they are feeling.`})
  return moments.slice(0,3)
}

async function shareBlob(blob: Blob | null, title: string, text: string, filename: string) {
  try {
    const file = blob ? new File([blob], filename, { type:'image/png' }) : null
    if (file && navigator.canShare?.({ files:[file] })) await navigator.share({ title, text, files:[file] })
    else if (navigator.share) await navigator.share({ title, text, url:window.location.href })
    else await navigator.clipboard.writeText(`${text} ${window.location.href}`)
  } catch { /* dismissed */ }
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
  const [reportedIds, setReportedIds] = useState<Set<string>>(() => readReportedIds())
  const [worldQuestion, setWorldQuestion] = useState<WorldQuestion | null>(null)
  const [questionChoice, setQuestionChoice] = useState<number | null>(null)
  const [events, setEvents] = useState<MoodEvent[]>([])
  const [reminderEnabled, setReminderEnabled] = useState(() => readDailyReminder())
  const [playbackProgress, setPlaybackProgress] = useState<number | null>(null)
  const [playbackPlaying, setPlaybackPlaying] = useState(false)
  const [miniMode] = useState(() => new URL(window.location.href).searchParams.get('mini') === '1')

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

  useEffect(() => {
    if (!backendHealthy) return
    let cancelled = false
    void Promise.all([fetchWorldQuestion(), fetchActiveEvents()]).then(([question, nextEvents]) => {
      if (cancelled) return
      setWorldQuestion(question)
      setEvents(nextEvents)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [backendHealthy])

  useEffect(() => {
    if (!playbackPlaying) return
    if (playbackProgress == null) setPlaybackProgress(0)
    const timer = window.setInterval(() => {
      setPlaybackProgress((current) => {
        const next = Math.min(100, (current ?? 0) + 2.5)
        if (next >= 100) setPlaybackPlaying(false)
        return next
      })
    }, 700)
    return () => window.clearInterval(timer)
  }, [playbackPlaying, playbackProgress])

  useEffect(() => {
    if (!reminderEnabled || !installed || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const today = localDateKey(new Date())
    if (journal.some((entry) => localDateKey(entry.createdAt) === today) || readNotifiedDate() === today) return
    const timer = window.setTimeout(async () => {
      try {
        const registration = await navigator.serviceWorker?.ready
        if (registration) await registration.showNotification('Moodaro Daily Pulse', { body: 'How are you feeling today? Add one quick pulse and see how the world feels.', icon: `${import.meta.env.BASE_URL}icons/icon-192.png`, badge: `${import.meta.env.BASE_URL}icons/icon-192.png`, tag: 'moodaro-daily-pulse' })
        else new Notification('Moodaro Daily Pulse', { body: 'How are you feeling today?' })
        saveNotifiedDate(today)
      } catch { /* notification support varies by browser */ }
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [reminderEnabled, installed, journal])

  const { currentEntries, previousEntries } = useMemo(() => {
    const boundary = Date.now() - RANGE_MS[range]
    return {
      currentEntries: feedEntries.filter((entry) => new Date(entry.createdAt).getTime() >= boundary),
      previousEntries: feedEntries.filter((entry) => new Date(entry.createdAt).getTime() < boundary)
    }
  }, [feedEntries, range])

  const points = useMemo(() => aggregatePoints(currentEntries), [currentEntries])

  const mapEntries = useMemo(() => {
    if (playbackProgress == null) return currentEntries
    const end = Date.now()
    const start = end - 24 * 3600000
    const cutoff = start + (24 * 3600000 * playbackProgress / 100)
    return feedEntries.filter((entry) => {
      const time = new Date(entry.createdAt).getTime()
      return time >= start && time <= cutoff
    })
  }, [currentEntries, feedEntries, playbackProgress])
  const mapPoints = useMemo(() => aggregatePoints(mapEntries), [mapEntries])

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

  useEffect(() => {
    if (!points.length || selectedPoint) return
    const area = new URL(window.location.href).searchParams.get('area')
    if (!area) return
    const point = points.find((item) => item.id === area)
    if (point) setSelectedPoint(point)
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


  const todayCheckedIn = useMemo(() => {
    const today = localDateKey(new Date())
    return journal.some((entry) => localDateKey(entry.createdAt) === today)
  }, [journal])

  const latestMappedJournal = useMemo(() => journal.find((entry) => entry.lat != null && entry.lng != null), [journal])
  const nearbyPoint = useMemo(() => {
    if (latestMappedJournal?.lat == null || latestMappedJournal.lng == null) return null
    return points.find((point) => point.id === pointId(latestMappedJournal.lat as number, latestMappedJournal.lng as number)) || null
  }, [latestMappedJournal, points])
  const moodWaves = useMemo(() => deriveMoodWaves(feedEntries), [feedEntries])
  const moodMoments = useMemo(() => deriveMoments(currentEntries, previousEntries), [currentEntries, previousEntries])
  const liveNowCount = useMemo(() => currentEntries.filter((entry) => Date.now() - new Date(entry.createdAt).getTime() <= 15 * 60000).length, [currentEntries])

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
      let reveal: SubmitResult['reveal']
      if (liveEntry.lat != null && liveEntry.lng != null) {
        const bucketId = pointId(liveEntry.lat, liveEntry.lng)
        setLastSharedBucket(bucketId)
        const nearby = [liveEntry, ...feedEntries].filter((item) => item.lat != null && item.lng != null && pointId(item.lat, item.lng) === bucketId && Date.now() - new Date(item.createdAt).getTime() <= 24 * 3600000)
        const average = nearby.reduce((sum, item) => sum + item.score, 0) / Math.max(1, nearby.length)
        const below = nearby.filter((item) => item.id !== liveEntry.id && item.score < liveEntry.score).length
        reveal = {
          label: countryName(liveEntry.countryCode) || 'Your approximate area',
          score: Number(average.toFixed(1)),
          count: nearby.length,
          percentile: nearby.length >= 5 ? Math.round((below / Math.max(1, nearby.length - 1)) * 100) : undefined,
          emotion: dominantEmotion(nearby)
        }
      }
      setBackendError(false)
      setBackendHealthy(true)
      window.setTimeout(() => void refreshNetwork(true), 350)
      return { shared: true, reveal }
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

  const report = async (entry: MoodEntry) => {
    if (reportedIds.has(entry.id)) return
    try {
      const actorHash = await getActorHash()
      await reportMood(entry.id, actorHash)
      markReported(entry.id)
      setReportedIds((current) => new Set([...current, entry.id]))
    } catch { /* reporting should never take the live network down */ }
  }

  const vote = async (choice: number) => {
    if (!worldQuestion || !backendHealthy) return
    try {
      const actorHash = await getActorHash()
      await voteWorldQuestion(worldQuestion.id, choice, actorHash)
      setQuestionChoice(choice)
      const refreshed = await fetchWorldQuestion()
      if (refreshed) setWorldQuestion(refreshed)
    } catch { /* keep the rest of Moodaro working */ }
  }

  const toggleReminder = async () => {
    if (!reminderEnabled && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission().catch(() => 'denied' as NotificationPermission)
      if (permission !== 'granted') return
    }
    const next = !reminderEnabled
    setReminderEnabled(next)
    saveDailyReminder(next)
  }

  const shareWeekly = async () => {
    const recap = weeklyRecap(journal)
    if (!recap) return
    const emotion = recap.emotion as EmotionKey
    const blob = await createRecapCard('Your week in feelings', recap.score, emotionMeta[emotion].name, [`${recap.count} private check-ins`, `${emotionMeta[emotion].emoji} Mostly ${emotionMeta[emotion].name.toLowerCase()}`, 'Your journal stays on this device'])
    await shareBlob(blob, 'My Moodaro week', `My week in feelings: ${recap.score.toFixed(1)}/10 on Moodaro.`, 'moodaro-week.png')
  }

  const shareYear = async () => {
    const recap = yearRecap(journal)
    if (!recap) return
    const emotion = recap.emotion as EmotionKey
    const blob = await createRecapCard(`Moodaro ${new Date().getFullYear()}`, recap.score, emotionMeta[emotion].name, [`${recap.count} private check-ins`, `${recap.months} active month${recap.months === 1 ? '' : 's'}`, `${emotionMeta[emotion].emoji} Most common: ${emotionMeta[emotion].name}`, 'Created privately on your device'])
    await shareBlob(blob, 'My Moodaro year', `My Moodaro year so far: ${recap.score.toFixed(1)}/10.`, 'moodaro-year.png')
  }

  const shareSelectedArea = async () => {
    if (!selectedPoint) return
    const url = new URL(window.location.href)
    url.searchParams.set('area', selectedPoint.id)
    const text = `${selectedPoint.label} is ${selectedPoint.score.toFixed(1)}/10 on Moodaro, based on ${selectedPoint.activity} real check-in${selectedPoint.activity === 1 ? '' : 's'}.`
    try {
      if (navigator.share) await navigator.share({ title: `${selectedPoint.label} · Moodaro`, text, url:url.toString() })
      else await navigator.clipboard.writeText(`${text} ${url.toString()}`)
    } catch { /* dismissed */ }
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

  if (miniMode) {
    return <MiniPulse summary={summary} onCheckIn={() => { const url = new URL(window.location.href); url.searchParams.delete('mini'); url.searchParams.set('compose','1'); window.location.href = url.toString() }} onOpen={() => { const url = new URL(window.location.href); url.searchParams.delete('mini'); window.location.href = url.toString() }} />
  }

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
                <div className="hero-live-line"><span className={`live-dot ${liveState !== 'live' ? 'is-muted' : ''}`} /><span>{liveState === 'live' ? (liveNowCount ? `${liveNowCount} real pulse${liveNowCount === 1 ? '' : 's'} in the last 15 minutes` : 'The live network is listening') : liveLabel}</span></div>
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
                  <WorldMap points={mapPoints} selectedId={selectedPoint?.id} onSelect={setSelectedPoint} />

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
                      <div className="selected-area-actions"><button onClick={shareSelectedArea} aria-label="Share this area"><Link2 size={14} /></button><button onClick={() => setSelectedPoint(null)} aria-label="Close selected area">×</button></div>
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
                <MapPlayback progress={playbackProgress} playing={playbackPlaying} onChange={(value) => { setPlaybackProgress(value); setPlaybackPlaying(false) }} onToggle={() => { if (playbackProgress == null || playbackProgress >= 100) setPlaybackProgress(0); setPlaybackPlaying((value) => !value) }} onReset={() => { setPlaybackPlaying(false); setPlaybackProgress(null) }} />
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

            <section className={`daily-pulse-card ${todayCheckedIn ? 'is-done' : ''}`}>
              <div><span className="eyebrow">DAILY PULSE</span><h2>{todayCheckedIn ? 'Your pulse is in for today.' : 'How are you feeling today?'}</h2><p>{todayCheckedIn ? 'Come back later to see how your area and the world move around your check-in.' : 'One quick check-in unlocks your personal daily rhythm and helps the real map become more useful.'}</p></div>
              <button className={todayCheckedIn ? 'secondary-button' : 'primary-button'} onClick={() => { setComposerPreset(null); setComposerOpen(true) }}>{todayCheckedIn ? 'Add another pulse' : 'Check in now'}<ArrowUpRight size={17} /></button>
            </section>

            <SocialInsights nearby={nearbyPoint} waves={moodWaves} moments={moodMoments} events={events} />
            <div className="social-duo-grid"><WorldQuestionCard question={worldQuestion} selected={questionChoice} onVote={vote} /><HomeJourneyCard entries={journal} onOpenJournal={() => { setView('journal'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} onShareWeekly={shareWeekly} onCheckIn={() => { setComposerPreset(null); setComposerOpen(true) }} /></div>

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

            <PulseFeed entries={currentEntries} reactedIds={reactedIds} reportedIds={reportedIds} onReact={react} onReport={report} compact />
          </section>
        )}

        {view === 'explore' && <Explore points={points} entries={currentEntries} events={events} reactedIds={reactedIds} reportedIds={reportedIds} onReact={react} onReport={report} />}
        {view === 'journal' && <Journal entries={journal} onCheckIn={() => { setComposerPreset(null); setComposerOpen(true) }} onShareWeekly={shareWeekly} onShareYear={shareYear} />}
        {view === 'settings' && <Settings theme={theme} setTheme={setTheme} canInstall={Boolean(deferredPrompt)} installed={installed} onInstall={install} onClear={clearJournal} liveConnected={liveState === 'live'} reminderEnabled={reminderEnabled} onToggleReminder={toggleReminder} onOpenMini={() => { const url = new URL(window.location.href); url.searchParams.set('mini','1'); window.location.href = url.toString() }} />}
      </main>

      <button className="mobile-pulse-fab" onClick={() => { setComposerPreset(null); setComposerOpen(true) }} aria-label="Share your mood"><span>+</span></button>
      <BottomNav view={view} onChange={setView} />
      <MoodComposer open={composerOpen} initialEmotion={composerPreset} liveSharing={liveState === 'live'} events={events} onClose={() => setComposerOpen(false)} onSubmit={submitMood} />

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
