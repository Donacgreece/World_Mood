import type { MoodSummary } from './types'

export async function createShareCard(summary: MoodSummary) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920)
  gradient.addColorStop(0, '#08101f')
  gradient.addColorStop(0.5, '#172044')
  gradient.addColorStop(1, '#321b4b')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1920)

  const glow = ctx.createRadialGradient(820, 420, 20, 820, 420, 560)
  glow.addColorStop(0, 'rgba(105, 223, 247, .42)')
  glow.addColorStop(1, 'rgba(105, 223, 247, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 1080, 1100)

  const glow2 = ctx.createRadialGradient(140, 1500, 20, 140, 1500, 460)
  glow2.addColorStop(0, 'rgba(255, 123, 180, .25)')
  glow2.addColorStop(1, 'rgba(255, 123, 180, 0)')
  ctx.fillStyle = glow2
  ctx.fillRect(0, 980, 800, 940)

  // Brand mark, matching the favicon and PWA icon.
  ctx.save()
  ctx.lineWidth = 14
  const ring = ctx.createLinearGradient(84, 76, 242, 236)
  ring.addColorStop(0, '#69DFF7')
  ring.addColorStop(.5, '#695CFF')
  ring.addColorStop(1, '#FF7BB4')
  ctx.strokeStyle = ring
  ctx.fillStyle = '#0B1020'
  ctx.beginPath()
  ctx.arc(164, 156, 70, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = ring
  ctx.lineWidth = 13
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(110, 160)
  ctx.lineTo(132, 160)
  ctx.bezierCurveTo(143, 160, 145, 134, 155, 134)
  ctx.bezierCurveTo(166, 134, 167, 196, 179, 196)
  ctx.bezierCurveTo(190, 196, 193, 150, 203, 150)
  ctx.bezierCurveTo(212, 150, 217, 160, 226, 160)
  ctx.stroke()
  ctx.fillStyle = '#FF7BB4'
  ctx.beginPath()
  ctx.arc(229, 160, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#ffffff'
  ctx.font = '800 64px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText('WORLD MOOD', 86, 320)
  ctx.font = '600 39px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,.72)'
  ctx.fillText('Feel the planet. Together.', 86, 378)

  ctx.fillStyle = '#ffffff'
  ctx.font = '850 300px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(summary.score.toFixed(1), 72, 1000)
  ctx.font = '800 82px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(summary.label.toUpperCase(), 88, 1120)

  ctx.fillStyle = 'rgba(255,255,255,.72)'
  ctx.font = '600 38px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(`${summary.responses.toLocaleString()} real check-ins`, 90, 1250)
  ctx.fillText(`${summary.resonances.toLocaleString()} community resonances`, 90, 1310)

  ctx.fillStyle = 'rgba(255,255,255,.10)'
  ctx.beginPath()
  ctx.roundRect(78, 1460, 924, 245, 50)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '750 48px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText('A living emotional pulse of the world', 118, 1570)
  ctx.fillStyle = 'rgba(255,255,255,.66)'
  ctx.font = '550 34px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText('donacgreece.github.io/World_Mood', 118, 1640)

  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.94))
}
