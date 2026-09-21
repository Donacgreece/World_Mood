import type { MoodEntry, ThemeMode } from './types'

const THEME_KEY = 'worldmood-theme'
const JOURNAL_KEY = 'worldmood-journal-v2'
const ONBOARD_KEY = 'worldmood-onboarded-v2'
const DEVICE_KEY = 'worldmood-device-id'
const REACTED_KEY = 'worldmood-reacted'
const REPORTED_KEY = 'moodaro-reported'
const REMINDER_KEY = 'moodaro-daily-reminder'
const NOTIFIED_DATE_KEY = 'moodaro-notified-date'
const CIRCLE_KEY = 'moodaro-circle-code'

export function readTheme(): ThemeMode {
  const value = localStorage.getItem(THEME_KEY)
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function saveTheme(theme: ThemeMode) {
  localStorage.setItem(THEME_KEY, theme)
}

export function readJournal(): MoodEntry[] {
  try {
    const value = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function saveJournal(entries: MoodEntry[]) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries.slice(0, 730)))
}

export function hasOnboarded() {
  return localStorage.getItem(ONBOARD_KEY) === 'yes'
}

export function setOnboarded() {
  localStorage.setItem(ONBOARD_KEY, 'yes')
}

function createDeviceId() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = createDeviceId()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export async function getActorHash() {
  const data = new TextEncoder().encode(`world-mood-v2:${getDeviceId()}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function readIdSet(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return new Set<string>(Array.isArray(value) ? value : [])
  } catch {
    return new Set<string>()
  }
}

function markId(key: string, id: string) {
  const set = readIdSet(key)
  set.add(id)
  localStorage.setItem(key, JSON.stringify([...set].slice(-750)))
}

export function readReactedIds() { return readIdSet(REACTED_KEY) }
export function markReacted(id: string) { markId(REACTED_KEY, id) }
export function readReportedIds() { return readIdSet(REPORTED_KEY) }
export function markReported(id: string) { markId(REPORTED_KEY, id) }

export function readDailyReminder() { return localStorage.getItem(REMINDER_KEY) === 'on' }
export function saveDailyReminder(enabled: boolean) { localStorage.setItem(REMINDER_KEY, enabled ? 'on' : 'off') }
export function readNotifiedDate() { return localStorage.getItem(NOTIFIED_DATE_KEY) || '' }
export function saveNotifiedDate(date: string) { localStorage.setItem(NOTIFIED_DATE_KEY, date) }

export function readLastCircleCode() { return localStorage.getItem(CIRCLE_KEY) || '' }
export function saveLastCircleCode(code: string) {
  if (code) localStorage.setItem(CIRCLE_KEY, code)
  else localStorage.removeItem(CIRCLE_KEY)
}
