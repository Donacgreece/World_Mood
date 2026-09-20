export type ThemeMode = 'system' | 'light' | 'dark'
export type ViewKey = 'home' | 'explore' | 'journal' | 'settings'
export type TimeRange = 'now' | '24h' | '7d' | '30d'

export type EmotionKey = 'great' | 'good' | 'calm' | 'okay' | 'low' | 'stressed' | 'angry' | 'tired'
export type ReasonKey = 'work' | 'family' | 'money' | 'health' | 'love' | 'weather' | 'other'

export interface MoodEntry {
  id: string
  score: number
  emotion: EmotionKey
  intensity: number
  reason?: ReasonKey
  note?: string
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

export interface SubmitResult {
  shared: boolean
  reason?: 'backend-offline' | 'network-error' | 'rate-limit'
}
