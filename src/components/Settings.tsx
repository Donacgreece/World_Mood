import { Download, Globe2, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react'
import { t } from '../i18n'
import type { Language, ThemeMode } from '../lib/types'

export function Settings({ language, setLanguage, theme, setTheme, canInstall, installed, onInstall, onClear }: {
  language: Language; setLanguage:(v:Language)=>void; theme:ThemeMode; setTheme:(v:ThemeMode)=>void; canInstall:boolean; installed:boolean; onInstall:()=>void; onClear:()=>void
}) {
  const c = t(language)
  return (
    <section className="page-section">
      <div className="section-heading"><span className="eyebrow">PERSONALIZE</span><h1>{c.settingsTitle}</h1><p>{c.settingsSubtitle}</p></div>
      <div className="settings-stack">
        <div className="settings-card"><div className="settings-label"><Sun/><div><strong>{c.appearance}</strong><span>Light, dark or follow your device</span></div></div><div className="segmented three-small">{(['light','dark','system'] as ThemeMode[]).map(v=><button key={v} className={theme===v?'is-active':''} onClick={()=>setTheme(v)}>{v==='light'?c.light:v==='dark'?c.dark:c.system}</button>)}</div></div>
        <div className="settings-card"><div className="settings-label"><Globe2/><div><strong>{c.language}</strong><span>English / Ελληνικά</span></div></div><div className="segmented"><button className={language==='en'?'is-active':''} onClick={()=>setLanguage('en')}>English</button><button className={language==='el'?'is-active':''} onClick={()=>setLanguage('el')}>Ελληνικά</button></div></div>
        <div className="settings-card"><div className="settings-label"><Download/><div><strong>{c.install}</strong><span>{installed?c.installed:canInstall?c.installReady:c.installUnavailable}</span></div></div><button className="secondary-button" disabled={!canInstall||installed} onClick={onInstall}>{c.installCta}</button></div>
        <div className="settings-card vertical"><div className="settings-label"><ShieldCheck/><div><strong>{c.privacy}</strong><span>{c.privacyDetail}</span></div></div><button className="danger-button" onClick={onClear}><Trash2 size={17}/>{c.clearData}</button></div>
        <div className="about-card"><Moon/><div><strong>{c.about}</strong><p>{c.aboutText}</p><small>World Mood v0.0.1</small></div></div>
      </div>
    </section>
  )
}
