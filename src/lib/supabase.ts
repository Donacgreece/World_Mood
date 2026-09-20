import type { MoodEntry } from './types'

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '')

export const hasLiveBackend = Boolean(SUPABASE_URL && SUPABASE_KEY)

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
}

export class LiveRateLimitError extends Error {
  constructor() {
    super('RATE_LIMIT')
    this.name = 'LiveRateLimitError'
  }
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!hasLiveBackend) throw new Error('LIVE_BACKEND_NOT_CONFIGURED')
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    if (text.includes('RATE_LIMIT')) throw new LiveRateLimitError()
    throw new Error(`${name} failed with ${response.status}${text ? `: ${text.slice(0, 180)}` : ''}`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function submitLiveMood(entry: MoodEntry, actorHash: string) {
  return rpc<Array<{ id: string; created_at: string }>>('submit_mood', {
    p_mood_score: entry.score,
    p_emotion: entry.emotion,
    p_intensity: entry.intensity,
    p_reason: entry.reason ?? null,
    p_lat_bucket: entry.lat ?? null,
    p_lng_bucket: entry.lng ?? null,
    p_country_code: entry.countryCode ?? null,
    p_actor_hash: actorHash
  })
}

export async function fetchLiveMoods(sinceIso: string, limit = 3000): Promise<MoodEntry[]> {
  if (!hasLiveBackend) return []

  const rows = await rpc<Array<Record<string, unknown>>>('get_live_moods', {
    p_since: sinceIso,
    p_limit: Math.max(1, Math.min(5000, limit))
  })

  return rows.map((row): MoodEntry => ({
    id: String(row.id),
    score: Number(row.mood_score),
    emotion: String(row.emotion) as MoodEntry['emotion'],
    intensity: Number(row.intensity),
    reason: row.reason ? String(row.reason) as MoodEntry['reason'] : undefined,
    lat: row.lat_bucket == null ? undefined : Number(row.lat_bucket),
    lng: row.lng_bucket == null ? undefined : Number(row.lng_bucket),
    countryCode: row.country_code ? String(row.country_code).toUpperCase() : undefined,
    createdAt: String(row.created_at),
    resonanceCount: Number(row.resonance_count || 0),
    source: 'supabase'
  }))
}

export async function reactToMood(entryId: string, actorHash: string) {
  return rpc<number>('react_to_mood', {
    p_entry_id: entryId,
    p_actor_hash: actorHash
  })
}
