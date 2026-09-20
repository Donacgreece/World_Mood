import { Compass, HeartPulse, Home, UserRound } from 'lucide-react'
import { t } from '../i18n'
import type { Language, ViewKey } from '../lib/types'

const items = [
  {key:'home',icon:Home}, {key:'explore',icon:Compass}, {key:'journal',icon:HeartPulse}, {key:'settings',icon:UserRound}
] as const

export function BottomNav({language,view,onChange}:{language:Language;view:ViewKey;onChange:(v:ViewKey)=>void}){
  const c=t(language)
  return <nav className="bottom-nav" aria-label="Primary navigation">{items.map(({key,icon:Icon})=><button key={key} className={view===key?'is-active':''} onClick={()=>onChange(key)}><Icon size={20}/><span>{c.nav[key]}</span></button>)}</nav>
}
