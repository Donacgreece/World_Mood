import type { MoodEntry, ThemeMode } from './types'

const JOURNAL_KEY = 'worldmood-journal-v1'
const THEME_KEY = 'worldmood-theme'
const ONBOARDING_KEY = 'worldmood-onboarded'

export function readJournal(): MoodEntry[] {
  try {
    const value = localStorage.getItem(JOURNAL_KEY)
    return value ? (JSON.parse(value) as MoodEntry[]) : []
  } catch {
    return []
  }
}

export function saveJournal(entries: MoodEntry[]) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries.slice(0, 180)))
}

export function readTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY)
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
}

export function saveTheme(value: ThemeMode) {
  localStorage.setItem(THEME_KEY, value)
}

export function hasOnboarded() {
  return localStorage.getItem(ONBOARDING_KEY) === '1'
}

export function setOnboarded() {
  localStorage.setItem(ONBOARDING_KEY, '1')
}
