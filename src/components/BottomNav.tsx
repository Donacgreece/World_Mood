import { Compass, HeartPulse, Home, UserRound } from 'lucide-react'
import { copy } from '../i18n'
import type { ViewKey } from '../lib/types'

const items = [
  { key: 'home', icon: Home },
  { key: 'explore', icon: Compass },
  { key: 'journal', icon: HeartPulse },
  { key: 'settings', icon: UserRound }
] as const

export function BottomNav({ view, onChange }: { view: ViewKey; onChange: (v: ViewKey) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map(({ key, icon: Icon }) => (
        <button key={key} className={view === key ? 'is-active' : ''} onClick={() => onChange(key)}>
          <Icon size={20} />
          <span>{copy.nav[key]}</span>
        </button>
      ))}
    </nav>
  )
}
