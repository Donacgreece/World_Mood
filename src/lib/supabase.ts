import type { CircleSummary, MoodEntry, MoodEvent, WorldQuestion } from './types'

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '')

export const hasLiveBackend = Boolean(SUPABASE_URL && SUPABASE_KEY)

function requestHeaders(): HeadersInit {
  const next: Record<string, string> = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
  if (SUPABASE_KEY.startsWith('eyJ')) next.Authorization = `Bearer ${SUPABASE_KEY}`
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
      method: 'POST', headers: requestHeaders(), body: JSON.stringify(body)
    })
  } catch {
    throw new LiveNetworkError('NETWORK_UNREACHABLE')
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    if (text.includes('RATE_LIMIT')) throw new LiveRateLimitError()
    throw new LiveNetworkError(`${name} failed${text ? `: ${text.slice(0, 240)}` : ''}`, response.status)
  }
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

function functionMissing(error: unknown) {
  return error instanceof LiveNetworkError && (error.status === 404 || error.message.includes('Could not find the function'))
}

export async function checkLiveBackend() {
  if (!hasLiveBackend) return false
  try {
    await rpc<Array<Record<string, unknown>>>('get_live_moods_v2', { p_since: new Date(Date.now() - 60_000).toISOString(), p_limit: 1 })
  } catch (error) {
    if (!functionMissing(error)) throw error
    await rpc<Array<Record<string, unknown>>>('get_live_moods', { p_since: new Date(Date.now() - 60_000).toISOString(), p_limit: 1 })
  }
  return true
}

export async function submitLiveMood(entry: MoodEntry, actorHash: string) {
  try {
    return await rpc<Array<{ id: string; created_at: string }>>('submit_mood_v2', {
      p_mood_score: entry.score,
      p_emotion: entry.emotion,
      p_intensity: entry.intensity,
      p_reason: entry.reason ?? null,
      p_lat_bucket: entry.lat ?? null,
      p_lng_bucket: entry.lng ?? null,
      p_country_code: entry.countryCode ?? null,
      p_actor_hash: actorHash,
      p_public_message: entry.publicMessage ?? null,
      p_context_tag: entry.contextTag ?? null,
      p_event_slug: entry.eventSlug ?? null
    })
  } catch (error) {
    if (!functionMissing(error)) throw error
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
}

function rowToMood(row: Record<string, unknown>): MoodEntry {
  return {
    id: String(row.id),
    score: Number(row.mood_score),
    emotion: String(row.emotion) as MoodEntry['emotion'],
    intensity: Number(row.intensity),
    reason: row.reason ? String(row.reason) as MoodEntry['reason'] : undefined,
    publicMessage: row.public_message ? String(row.public_message) : undefined,
    contextTag: row.context_tag ? String(row.context_tag) as MoodEntry['contextTag'] : undefined,
    eventSlug: row.event_slug ? String(row.event_slug) : undefined,
    lat: row.lat_bucket == null ? undefined : Number(row.lat_bucket),
    lng: row.lng_bucket == null ? undefined : Number(row.lng_bucket),
    countryCode: row.country_code ? String(row.country_code).toUpperCase() : undefined,
    createdAt: String(row.created_at),
    resonanceCount: Number(row.resonance_count || 0),
    source: 'supabase'
  }
}

export async function fetchLiveMoods(sinceIso: string, limit = 3000): Promise<MoodEntry[]> {
  if (!hasLiveBackend) return []
  try {
    const rows = await rpc<Array<Record<string, unknown>>>('get_live_moods_v2', {
      p_since: sinceIso, p_limit: Math.max(1, Math.min(5000, limit))
    })
    return rows.map(rowToMood)
  } catch (error) {
    if (!functionMissing(error)) throw error
    const rows = await rpc<Array<Record<string, unknown>>>('get_live_moods', {
      p_since: sinceIso, p_limit: Math.max(1, Math.min(5000, limit))
    })
    return rows.map(rowToMood)
  }
}

export async function reactToMood(entryId: string, actorHash: string) {
  return rpc<number>('react_to_mood', { p_entry_id: entryId, p_actor_hash: actorHash })
}

export async function reportMood(entryId: string, actorHash: string, reason = 'community') {
  try {
    return await rpc<boolean>('report_mood', { p_entry_id: entryId, p_actor_hash: actorHash, p_reason: reason })
  } catch (error) {
    if (functionMissing(error)) return false
    throw error
  }
}

export async function fetchWorldQuestion(): Promise<WorldQuestion | null> {
  if (!hasLiveBackend) return null
  try {
    const rows = await rpc<Array<Record<string, unknown>>>('get_active_world_question', {})
    const row = rows?.[0]
    if (!row) return null
    const options = Array.isArray(row.options) ? row.options.map(String) : []
    const counts = Array.isArray(row.counts) ? row.counts.map(Number) : []
    return { id: String(row.id), question: String(row.question), options, counts, total: Number(row.total || 0) }
  } catch (error) {
    if (functionMissing(error)) return null
    throw error
  }
}

export async function voteWorldQuestion(questionId: string, choice: number, actorHash: string) {
  return rpc<number>('vote_world_question', { p_question_id: questionId, p_choice: choice, p_actor_hash: actorHash })
}

export async function fetchActiveEvents(): Promise<MoodEvent[]> {
  if (!hasLiveBackend) return []
  try {
    const rows = await rpc<Array<Record<string, unknown>>>('get_active_mood_events', {})
    return (rows || []).map((row) => ({
      slug: String(row.slug), title: String(row.title), emoji: String(row.emoji || '✨'),
      startsAt: String(row.starts_at), endsAt: String(row.ends_at), checkins: Number(row.checkins || 0),
      averageScore: row.average_score == null ? undefined : Number(row.average_score)
    }))
  } catch (error) {
    if (functionMissing(error)) return []
    throw error
  }
}

export async function createMoodCircle(actorHash: string): Promise<CircleSummary | null> {
  const rows = await rpc<Array<Record<string, unknown>>>('create_mood_circle', { p_actor_hash: actorHash })
  const row = rows?.[0]
  if (!row) return null
  return {
    code: String(row.code), members: Number(row.members || 0), checkins: Number(row.checkins || 0),
    score: row.score == null ? undefined : Number(row.score),
    emotion: row.emotion ? String(row.emotion) as CircleSummary['emotion'] : undefined,
    latestAt: row.latest_at ? String(row.latest_at) : undefined,
    expiresAt: row.expires_at ? String(row.expires_at) : undefined
  }
}

export async function fetchCircleSummary(code: string): Promise<CircleSummary | null> {
  if (!code) return null
  try {
    const rows = await rpc<Array<Record<string, unknown>>>('get_circle_summary', { p_code: code.toUpperCase() })
    const row = rows?.[0]
    if (!row) return null
    return {
      code: String(row.code), members: Number(row.members || 0), checkins: Number(row.checkins || 0),
      score: row.score == null ? undefined : Number(row.score),
      emotion: row.emotion ? String(row.emotion) as CircleSummary['emotion'] : undefined,
      latestAt: row.latest_at ? String(row.latest_at) : undefined,
      expiresAt: row.expires_at ? String(row.expires_at) : undefined
    }
  } catch (error) {
    if (functionMissing(error)) return null
    throw error
  }
}

export async function submitCircleMood(code: string, emotion: MoodEntry['emotion'], score: number, actorHash: string) {
  return rpc<boolean>('submit_circle_mood', {
    p_code: code.toUpperCase(), p_emotion: emotion, p_mood_score: score, p_actor_hash: actorHash
  })
}
