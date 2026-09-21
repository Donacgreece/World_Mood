export type ThemeMode = 'system' | 'light' | 'dark'
export type ViewKey = 'home' | 'explore' | 'journal' | 'settings'
export type TimeRange = 'now' | '24h' | '7d' | '30d'

export type EmotionKey = 'great' | 'good' | 'calm' | 'okay' | 'low' | 'stressed' | 'angry' | 'tired'
export type ReasonKey = 'work' | 'family' | 'money' | 'health' | 'love' | 'weather' | 'other'
export type RoomKey = 'monday' | 'exam_week' | 'travel_day' | 'game_night' | 'new_parents' | 'workday'

export interface MoodEntry {
  id: string
  score: number
  emotion: EmotionKey
  intensity: number
  reason?: ReasonKey
  note?: string
  publicMessage?: string
  contextTag?: RoomKey
  eventSlug?: string
  lat?: number
  lng?: number
  countryCode?: string
  createdAt: string
  resonanceCount?: number
  source?: 'local' | 'supabase'
}

export interface MoodPoint {
  id: string
  label: string
  detail: string
  lat: number
  lng: number
  score: number
  emotion: EmotionKey
  activity: number
  countryCode?: string
}

export interface MoodSummary {
  score: number
  label: string
  responses: number
  mappedAreas: number
  delta: number | null
  trendingEmotion: EmotionKey
  latestAt?: string
  resonances: number
}

export interface AreaReveal {
  label: string
  score: number
  count: number
  percentile?: number
  emotion: EmotionKey
}

export interface SubmitResult {
  shared: boolean
  reason?: 'backend-offline' | 'network-error' | 'rate-limit'
  reveal?: AreaReveal
}

export interface WorldQuestion {
  id: string
  question: string
  options: string[]
  counts: number[]
  total: number
}

export interface MoodEvent {
  slug: string
  title: string
  emoji: string
  startsAt: string
  endsAt: string
  checkins: number
  averageScore?: number
}

export interface CircleSummary {
  code: string
  members: number
  checkins: number
  score?: number
  emotion?: EmotionKey
  latestAt?: string
  expiresAt?: string
}

export interface MoodWave {
  pointId: string
  label: string
  currentScore: number
  previousScore: number
  delta: number
  activity: number
  emotion: EmotionKey
}

export interface MoodMoment {
  id: string
  title: string
  body: string
  emoji: string
}
