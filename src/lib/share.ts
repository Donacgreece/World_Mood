import type { MoodSummary } from './types'

export async function createShareCard(summary: MoodSummary) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920)
  gradient.addColorStop(0, '#17214a')
  gradient.addColorStop(0.5, '#604cff')
  gradient.addColorStop(1, '#e24ba9')
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

  // Moodaro mascot mark, matching the favicon and PWA icon.
  ctx.save()
  const iconGradient = ctx.createLinearGradient(78, 72, 250, 248)
  iconGradient.addColorStop(0, '#2ED7F2')
  iconGradient.addColorStop(.42, '#4B84FF')
  iconGradient.addColorStop(.72, '#7657FF')
  iconGradient.addColorStop(1, '#FF68C8')
  ctx.fillStyle = iconGradient
  ctx.beginPath()
  ctx.roundRect(82, 72, 176, 176, 48)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,.96)'
  ctx.beginPath()
  ctx.arc(170, 148, 53, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(138, 180)
  ctx.lineTo(202, 180)
  ctx.lineTo(170, 224)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = '#172039'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(150, 145, 10, Math.PI * 1.05, Math.PI * 1.95)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(190, 145, 10, Math.PI * 1.05, Math.PI * 1.95)
  ctx.stroke()
  ctx.fillStyle = '#172039'
  ctx.beginPath()
  ctx.roundRect(145, 164, 50, 25, 12)
  ctx.fill()
  ctx.fillStyle = '#FF74B7'
  ctx.beginPath()
  ctx.ellipse(170, 184, 14, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#ffffff'
  ctx.font = '800 64px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText('MOODARO', 86, 320)
  ctx.font = '600 39px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,.72)'
  ctx.fillText('Feel the world together.', 86, 378)

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
  ctx.fillText('Real people. Real feelings. A brighter tomorrow.', 118, 1570)
  ctx.fillStyle = 'rgba(255,255,255,.66)'
  ctx.font = '550 34px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText('donacgreece.github.io/World_Mood', 118, 1640)

  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.94))
}
