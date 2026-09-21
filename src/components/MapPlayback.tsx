import { Pause, Play, RotateCcw } from 'lucide-react'

export function MapPlayback({ progress, playing, onChange, onToggle, onReset }: {
  progress: number | null
  playing: boolean
  onChange: (value: number) => void
  onToggle: () => void
  onReset: () => void
}) {
  const active = progress != null
  return (
    <div className={`map-playback ${active ? 'is-active' : ''}`}>
      <button className="playback-icon" onClick={onToggle} aria-label={playing ? 'Pause 24 hour replay' : 'Play 24 hour replay'}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
      <div className="playback-main">
        <div><strong>24H replay</strong><span>{active ? `${Math.round(progress)}% through the day` : 'Watch the mood map build through the last 24 hours'}</span></div>
        <input type="range" min="0" max="100" value={progress ?? 100} onChange={(event: any) => onChange(Number(event.target.value))} aria-label="24 hour mood playback" />
      </div>
      <button className="playback-reset" onClick={onReset} aria-label="Exit replay"><RotateCcw size={15} /></button>
    </div>
  )
}
