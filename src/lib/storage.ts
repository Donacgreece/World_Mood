import type { MoodEntry, ThemeMode } from './types'

const THEME_KEY = 'worldmood-theme'
const JOURNAL_KEY = 'worldmood-journal-v2'
const ONBOARD_KEY = 'worldmood-onboarded-v2'
const DEVICE_KEY = 'worldmood-device-id'
const REACTED_KEY = 'worldmood-reacted'

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
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries.slice(0, 365)))
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

export function readReactedIds() {
  try {
    const value = JSON.parse(localStorage.getItem(REACTED_KEY) || '[]')
    return new Set<string>(Array.isArray(value) ? value : [])
  } catch {
    return new Set<string>()
  }
}

export function markReacted(id: string) {
  const set = readReactedIds()
  set.add(id)
  localStorage.setItem(REACTED_KEY, JSON.stringify([...set].slice(-500)))
}
