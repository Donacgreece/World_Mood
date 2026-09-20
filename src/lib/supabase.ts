import type { MoodEntry } from './types'

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '')

export const hasLiveBackend = Boolean(SUPABASE_URL && SUPABASE_KEY)

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
}

export async function submitLiveMood(entry: MoodEntry) {
  if (!hasLiveBackend) return false
  const body = {
    mood_score: entry.score,
    emotion: entry.emotion,
    intensity: entry.intensity,
    reason: entry.reason || null,
    note: entry.note?.slice(0, 160) || null,
    lat_bucket: entry.lat ?? null,
    lng_bucket: entry.lng ?? null,
    country_code: entry.countryCode || null
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/mood_entries`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(body)
  })
  if (!response.ok) throw new Error(`Mood submission failed with ${response.status}`)
  return true
}

export async function fetchLiveMoods(sinceIso: string): Promise<MoodEntry[]> {
  if (!hasLiveBackend) return []
  const query = new URLSearchParams({
    select: 'id,mood_score,emotion,intensity,reason,note,lat_bucket,lng_bucket,country_code,created_at',
    created_at: `gte.${sinceIso}`,
    order: 'created_at.desc',
    limit: '5000'
  })
  const response = await fetch(`${SUPABASE_URL}/rest/v1/mood_entries?${query.toString()}`, { headers })
  if (!response.ok) throw new Error(`Mood feed failed with ${response.status}`)
  const rows = await response.json() as Array<Record<string, unknown>>
  return rows.map((row) => ({
    id: String(row.id),
    score: Number(row.mood_score),
    emotion: String(row.emotion) as MoodEntry['emotion'],
    intensity: Number(row.intensity),
    reason: row.reason ? String(row.reason) as MoodEntry['reason'] : undefined,
    note: row.note ? String(row.note) : undefined,
    lat: row.lat_bucket == null ? undefined : Number(row.lat_bucket),
    lng: row.lng_bucket == null ? undefined : Number(row.lng_bucket),
    countryCode: row.country_code ? String(row.country_code) : undefined,
    createdAt: String(row.created_at),
    source: 'supabase'
  }))
}
