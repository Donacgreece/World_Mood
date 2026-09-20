export type Language = 'en' | 'el'
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
  source?: 'demo' | 'local' | 'supabase'
}

export interface MoodPoint {
  id: string
  city: string
  country: string
  lat: number
  lng: number
  score: number
  emotion: EmotionKey
  activity: number
}

export interface MoodSummary {
  score: number
  label: string
  emotion: EmotionKey
  responses: number
  countries: number
  delta: number
  trendingEmotion: EmotionKey
}
