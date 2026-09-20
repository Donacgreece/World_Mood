import type { MoodSummary } from './types'

export async function createShareCard(summary: MoodSummary, language: 'en' | 'el') {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920)
  gradient.addColorStop(0, '#0a1020')
  gradient.addColorStop(0.5, '#172044')
  gradient.addColorStop(1, '#291845')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1920)

  const glow = ctx.createRadialGradient(820, 500, 20, 820, 500, 520)
  glow.addColorStop(0, 'rgba(129, 231, 255, .48)')
  glow.addColorStop(1, 'rgba(129, 231, 255, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 1080, 1080)

  ctx.fillStyle = 'rgba(255,255,255,.08)'
  for (let i = 0; i < 38; i += 1) {
    const x = (i * 137) % 1080
    const y = (i * 263) % 1500
    ctx.beginPath()
    ctx.arc(x, y, 4 + (i % 4), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 64px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText('WORLD MOOD', 86, 160)
  ctx.font = '500 40px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,.72)'
  ctx.fillText(language === 'el' ? 'Πώς νιώθει ο κόσμος τώρα' : 'How the world feels right now', 86, 228)

  ctx.fillStyle = '#ffffff'
  ctx.font = '800 300px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(summary.score.toFixed(1), 76, 920)
  ctx.font = '700 86px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(summary.label.toUpperCase(), 90, 1040)

  ctx.fillStyle = 'rgba(255,255,255,.72)'
  ctx.font = '500 40px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(`${summary.responses.toLocaleString()} ${language === 'el' ? 'συμμετοχές' : 'responses'}`, 90, 1175)
  ctx.fillText(`${summary.countries} ${language === 'el' ? 'χώρες' : 'countries'}`, 90, 1235)

  ctx.fillStyle = 'rgba(255,255,255,.12)'
  ctx.roundRect(78, 1420, 924, 260, 52)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '650 48px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(language === 'el' ? 'Δες το παγκόσμιο συναίσθημα' : 'See the world’s emotional weather', 120, 1535)
  ctx.fillStyle = 'rgba(255,255,255,.7)'
  ctx.font = '500 36px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText('donacgreece.github.io/World_Mood', 120, 1610)

  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.92))
}
