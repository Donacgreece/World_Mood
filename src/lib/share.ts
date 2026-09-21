import type { MoodEntry, MoodSummary } from './types'

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

function drawMoodaroBrand(ctx: CanvasRenderingContext2D) {
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
  ctx.beginPath(); ctx.arc(170, 148, 53, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.moveTo(138, 180); ctx.lineTo(202, 180); ctx.lineTo(170, 224); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#172039'; ctx.lineWidth = 8; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(150, 145, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke()
  ctx.beginPath(); ctx.arc(190, 145, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke()
  ctx.fillStyle = '#172039'; ctx.beginPath(); ctx.roundRect(145, 164, 50, 25, 12); ctx.fill()
  ctx.fillStyle = '#FF74B7'; ctx.beginPath(); ctx.ellipse(170, 184, 14, 7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffffff'; ctx.font = '800 64px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText('MOODARO', 86, 320)
  ctx.font = '600 39px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.fillText('Feel the world together.', 86, 378)
}

function baseCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) return { canvas, ctx: null }
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920)
  gradient.addColorStop(0, '#17214a'); gradient.addColorStop(.5, '#604cff'); gradient.addColorStop(1, '#e24ba9')
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, 1920)
  const glow = ctx.createRadialGradient(820, 420, 20, 820, 420, 560)
  glow.addColorStop(0, 'rgba(105,223,247,.42)'); glow.addColorStop(1, 'rgba(105,223,247,0)')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1100)
  const glow2 = ctx.createRadialGradient(140, 1500, 20, 140, 1500, 460)
  glow2.addColorStop(0, 'rgba(255,123,180,.25)'); glow2.addColorStop(1, 'rgba(255,123,180,0)')
  ctx.fillStyle = glow2; ctx.fillRect(0, 980, 800, 940)
  drawMoodaroBrand(ctx)
  return { canvas, ctx }
}

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', .94))
}

export async function createShareCard(summary: MoodSummary, heading = 'THE WORLD, RIGHT NOW') {
  const { canvas, ctx } = baseCanvas()
  if (!ctx) return null
  ctx.fillStyle = 'rgba(255,255,255,.70)'; ctx.font = '800 34px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText(heading, 90, 620)
  ctx.fillStyle = '#ffffff'; ctx.font = '850 300px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText(summary.score.toFixed(1), 72, 1000)
  ctx.font = '800 82px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText(summary.label.toUpperCase(), 88, 1120)
  ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.font = '600 38px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(`${summary.responses.toLocaleString()} real check-ins`, 90, 1250)
  ctx.fillText(`${summary.resonances.toLocaleString()} community resonances`, 90, 1310)
  ctx.fillStyle = 'rgba(255,255,255,.10)'; roundRect(ctx, 78, 1460, 924, 245, 50)
  ctx.fillStyle = '#ffffff'; ctx.font = '750 48px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText('Real people. Real feelings. A brighter tomorrow.', 118, 1570)
  ctx.fillStyle = 'rgba(255,255,255,.66)'; ctx.font = '550 34px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText('donacgreece.github.io/World_Mood', 118, 1640)
  return toBlob(canvas)
}

export async function createRecapCard(title: string, score: number, label: string, lines: string[]) {
  const { canvas, ctx } = baseCanvas()
  if (!ctx) return null
  ctx.fillStyle = 'rgba(255,255,255,.68)'; ctx.font = '800 34px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText(title.toUpperCase(), 90, 610)
  ctx.fillStyle = '#fff'; ctx.font = '850 270px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText(score.toFixed(1), 72, 975)
  ctx.font = '800 74px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText(label.toUpperCase(), 88, 1090)
  ctx.fillStyle = 'rgba(255,255,255,.11)'; roundRect(ctx, 78, 1195, 924, 390, 48)
  ctx.fillStyle = '#fff'; ctx.font = '650 42px system-ui, -apple-system, Segoe UI, sans-serif'
  lines.slice(0, 4).forEach((line, index) => ctx.fillText(line, 118, 1300 + index * 72))
  ctx.fillStyle = 'rgba(255,255,255,.68)'; ctx.font = '550 33px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText('Private recap created on your device · Moodaro', 118, 1515)
  return toBlob(canvas)
}

export function weeklyRecap(entries: MoodEntry[]) {
  const start = Date.now() - 7 * 86400000
  const week = entries.filter((entry) => new Date(entry.createdAt).getTime() >= start)
  if (!week.length) return null
  const score = week.reduce((sum, entry) => sum + entry.score, 0) / week.length
  const counts = new Map<string, number>()
  week.forEach((entry) => counts.set(entry.emotion, (counts.get(entry.emotion) || 0) + 1))
  const emotion = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'okay'
  return { score, emotion, count: week.length }
}

export function yearRecap(entries: MoodEntry[], year = new Date().getFullYear()) {
  const list = entries.filter((entry) => new Date(entry.createdAt).getFullYear() === year)
  if (!list.length) return null
  const score = list.reduce((sum, entry) => sum + entry.score, 0) / list.length
  const counts = new Map<string, number>()
  list.forEach((entry) => counts.set(entry.emotion, (counts.get(entry.emotion) || 0) + 1))
  const emotion = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'okay'
  const months = new Set(list.map((entry) => new Date(entry.createdAt).getMonth())).size
  return { score, emotion, count: list.length, months }
}
