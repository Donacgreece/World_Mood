import type { MoodEntry } from './types'

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '')

export const hasLiveBackend = Boolean(SUPABASE_URL && SUPABASE_KEY)

function requestHeaders(): HeadersInit {
  const next: Record<string, string> = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }

  // Legacy anon keys are JWTs and can be sent as Bearer tokens. Modern
  // sb_publishable_* keys must stay in the apikey header only.
  if (SUPABASE_KEY.startsWith('eyJ')) {
    next.Authorization = `Bearer ${SUPABASE_KEY}`
  }

  return next
}

export class LiveRateLimitError extends Error {
  constructor() {
    super('RATE_LIMIT')
    this.name = 'LiveRateLimitError'
  }
}

export class LiveNetworkError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'LiveNetworkError'
    this.status = status
  }
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!hasLiveBackend) throw new LiveNetworkError('LIVE_BACKEND_NOT_CONFIGURED')

  let response: Response
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: requestHeaders(),
      body: JSON.stringify(body)
    })
  } catch {
    throw new LiveNetworkError('NETWORK_UNREACHABLE')
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    if (text.includes('RATE_LIMIT')) throw new LiveRateLimitError()
    throw new LiveNetworkError(`${name} failed${text ? `: ${text.slice(0, 220)}` : ''}`, response.status)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export async function checkLiveBackend() {
  if (!hasLiveBackend) return false
  await rpc<Array<Record<string, unknown>>>('get_live_moods', {
    p_since: new Date(Date.now() - 60_000).toISOString(),
    p_limit: 1
  })
  return true
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
