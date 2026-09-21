import { Bell, DatabaseZap, Download, LayoutDashboard, ShieldCheck, Trash2 } from 'lucide-react'
import { copy } from '../i18n'
import type { ThemeMode } from '../lib/types'

export function Settings({ theme, setTheme, canInstall, installed, onInstall, onClear, liveConnected, reminderEnabled, onToggleReminder, onOpenMini }: {
  theme: ThemeMode
  setTheme: (v: ThemeMode) => void
  canInstall: boolean
  installed: boolean
  onInstall: () => void
  onClear: () => void
  liveConnected: boolean
  reminderEnabled: boolean
  onToggleReminder: () => void
  onOpenMini: () => void
}) {
  return (
    <section className="page-section">
      <div className="section-heading"><span className="eyebrow">PERSONALIZE</span><h1>{copy.settingsTitle}</h1><p>{copy.settingsSubtitle}</p></div>

      <div className="settings-stack">
        <div className="settings-card">
          <div className="settings-label"><span className="settings-symbol">◐</span><div><strong>{copy.appearance}</strong><span>Light, dark or follow your device</span></div></div>
          <div className="segmented three-small">{(['light','dark','system'] as ThemeMode[]).map(value=><button key={value} className={theme===value?'is-active':''} onClick={()=>setTheme(value)}>{value==='light'?copy.light:value==='dark'?copy.dark:copy.system}</button>)}</div>
        </div>

        <div className="settings-card">
          <div className="settings-label"><Download /><div><strong>{copy.install}</strong><span>{installed ? copy.installed : canInstall ? copy.installReady : copy.installUnavailable}</span></div></div>
          <button className="secondary-button" disabled={!canInstall || installed} onClick={onInstall}>{copy.installCta}</button>
        </div>

        <div className="settings-card">
          <div className="settings-label"><Bell /><div><strong>Daily Pulse reminder</strong><span>A gentle reminder when you open Moodaro on a day you have not checked in yet. Background push remains off until a dedicated push service is connected.</span></div></div>
          <button className={`switch-control ${reminderEnabled?'is-on':''}`} role="switch" aria-checked={reminderEnabled} onClick={onToggleReminder}><i /></button>
        </div>

        <div className="settings-card">
          <div className="settings-label"><LayoutDashboard /><div><strong>Moodaro Mini</strong><span>A compact pulse view designed for a pinned tab, shortcut or second Home Screen icon.</span></div></div>
          <button className="secondary-button" onClick={onOpenMini}>Open Mini</button>
        </div>

        <div className="settings-card">
          <div className="settings-label"><DatabaseZap /><div><strong>Live network</strong><span>{liveConnected ? 'Supabase is connected. Shared pulses use real community data only.' : 'Not connected yet. Public activity remains empty instead of showing simulated data.'}</span></div></div>
          <div className={`connection-status ${liveConnected?'is-live':''}`}><span />{liveConnected?'CONNECTED':'NOT CONNECTED'}</div>
        </div>

        <div className="settings-card vertical">
          <div className="settings-label"><ShieldCheck /><div><strong>{copy.privacy}</strong><span>{copy.privacyDetail} Public micro-posts are optional and anonymous. Mood Circles expose only group aggregates.</span></div></div>
          <button className="danger-button" onClick={onClear}><Trash2 size={17} />{copy.clearData}</button>
        </div>

        <div className="about-card"><img src={`${import.meta.env.BASE_URL}logo-mark.svg`} alt="" /><div><strong>{copy.about}</strong><p>{copy.aboutText}</p><small>Moodaro v0.0.4</small></div></div>
      </div>
    </section>
  )
}
