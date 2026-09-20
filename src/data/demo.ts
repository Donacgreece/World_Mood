import type { EmotionKey, MoodPoint, TimeRange } from '../lib/types'

const BASE_POINTS: Omit<MoodPoint, 'score' | 'emotion' | 'activity'>[] = [
  { id: 'athens', city: 'Athens', country: 'Greece', lat: 37.98, lng: 23.72 },
  { id: 'london', city: 'London', country: 'United Kingdom', lat: 51.51, lng: -0.13 },
  { id: 'paris', city: 'Paris', country: 'France', lat: 48.86, lng: 2.35 },
  { id: 'berlin', city: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.41 },
  { id: 'madrid', city: 'Madrid', country: 'Spain', lat: 40.42, lng: -3.7 },
  { id: 'rome', city: 'Rome', country: 'Italy', lat: 41.9, lng: 12.5 },
  { id: 'lisbon', city: 'Lisbon', country: 'Portugal', lat: 38.72, lng: -9.14 },
  { id: 'stockholm', city: 'Stockholm', country: 'Sweden', lat: 59.33, lng: 18.07 },
  { id: 'helsinki', city: 'Helsinki', country: 'Finland', lat: 60.17, lng: 24.94 },
  { id: 'istanbul', city: 'Istanbul', country: 'Türkiye', lat: 41.01, lng: 28.98 },
  { id: 'cairo', city: 'Cairo', country: 'Egypt', lat: 30.04, lng: 31.24 },
  { id: 'lagos', city: 'Lagos', country: 'Nigeria', lat: 6.52, lng: 3.38 },
  { id: 'nairobi', city: 'Nairobi', country: 'Kenya', lat: -1.29, lng: 36.82 },
  { id: 'cape-town', city: 'Cape Town', country: 'South Africa', lat: -33.92, lng: 18.42 },
  { id: 'dubai', city: 'Dubai', country: 'UAE', lat: 25.2, lng: 55.27 },
  { id: 'delhi', city: 'Delhi', country: 'India', lat: 28.61, lng: 77.21 },
  { id: 'mumbai', city: 'Mumbai', country: 'India', lat: 19.08, lng: 72.88 },
  { id: 'bangkok', city: 'Bangkok', country: 'Thailand', lat: 13.76, lng: 100.5 },
  { id: 'singapore', city: 'Singapore', country: 'Singapore', lat: 1.35, lng: 103.82 },
  { id: 'jakarta', city: 'Jakarta', country: 'Indonesia', lat: -6.21, lng: 106.85 },
  { id: 'hong-kong', city: 'Hong Kong', country: 'Hong Kong', lat: 22.32, lng: 114.17 },
  { id: 'tokyo', city: 'Tokyo', country: 'Japan', lat: 35.68, lng: 139.65 },
  { id: 'seoul', city: 'Seoul', country: 'South Korea', lat: 37.57, lng: 126.98 },
  { id: 'sydney', city: 'Sydney', country: 'Australia', lat: -33.87, lng: 151.21 },
  { id: 'auckland', city: 'Auckland', country: 'New Zealand', lat: -36.85, lng: 174.76 },
  { id: 'vancouver', city: 'Vancouver', country: 'Canada', lat: 49.28, lng: -123.12 },
  { id: 'new-york', city: 'New York', country: 'United States', lat: 40.71, lng: -74.01 },
  { id: 'miami', city: 'Miami', country: 'United States', lat: 25.76, lng: -80.19 },
  { id: 'mexico-city', city: 'Mexico City', country: 'Mexico', lat: 19.43, lng: -99.13 },
  { id: 'sao-paulo', city: 'São Paulo', country: 'Brazil', lat: -23.55, lng: -46.63 },
  { id: 'buenos-aires', city: 'Buenos Aires', country: 'Argentina', lat: -34.6, lng: -58.38 },
  { id: 'santiago', city: 'Santiago', country: 'Chile', lat: -33.45, lng: -70.67 }
]

const hash = (value: string) => {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) h = Math.imul(h ^ value.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967295
}

const emotionForScore = (score: number): EmotionKey => {
  if (score >= 8.4) return 'great'
  if (score >= 7.3) return 'good'
  if (score >= 6.4) return 'calm'
  if (score >= 5.4) return 'okay'
  if (score >= 4.5) return 'tired'
  if (score >= 3.7) return 'low'
  if (score >= 2.8) return 'stressed'
  return 'angry'
}

const rangeFactor: Record<TimeRange, number> = { now: 0.95, '24h': 0.62, '7d': 0.38, '30d': 0.22 }

export function getDemoPoints(range: TimeRange): MoodPoint[] {
  const now = new Date()
  const tick = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${range === 'now' ? now.getUTCHours() : range}`
  return BASE_POINTS.map((point, index) => {
    const seed = hash(`${point.id}-${tick}`)
    const wave = Math.sin(index * 0.91 + now.getUTCHours() / 3) * 0.72 * rangeFactor[range]
    const score = Math.max(2.6, Math.min(9.2, 6.65 + (seed - 0.5) * 2.25 + wave))
    return {
      ...point,
      score: Number(score.toFixed(1)),
      emotion: emotionForScore(score),
      activity: Math.round(120 + hash(`${tick}-${point.id}-activity`) * 1880)
    }
  })
}

export function getDemoResponseCount(range: TimeRange): number {
  const multiplier = range === 'now' ? 1 : range === '24h' ? 7.4 : range === '7d' ? 32 : 118
  const todaySeed = hash(new Date().toISOString().slice(0, 10))
  return Math.round((11840 + todaySeed * 6200) * multiplier)
}
