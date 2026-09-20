import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import countries110 from 'world-atlas/countries-110m.json'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { emotionMeta } from '../i18n'
import type { MoodPoint } from '../lib/types'

const WIDTH = 960
const HEIGHT = 500
const MIN_ZOOM = 1
const MAX_ZOOM = 6
const projection = geoNaturalEarth1().scale(151).translate([WIDTH / 2, HEIGHT / 2])
const path = geoPath(projection)

type MapTransform = { x: number; y: number; k: number }

function scoreTone(score: number) {
  if (score >= 8) return 'var(--mood-great)'
  if (score >= 7) return 'var(--mood-good)'
  if (score >= 6) return 'var(--mood-calm)'
  if (score >= 5) return 'var(--mood-okay)'
  if (score >= 4) return 'var(--mood-tired)'
  if (score >= 3) return 'var(--mood-low)'
  return 'var(--mood-stressed)'
}

function clampTransform(next: MapTransform): MapTransform {
  const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next.k))
  const minX = WIDTH - WIDTH * k
  const minY = HEIGHT - HEIGHT * k
  return {
    k,
    x: Math.max(minX, Math.min(0, next.x)),
    y: Math.max(minY, Math.min(0, next.y))
  }
}

export function WorldMap({ points, selectedId, onSelect }: {
  points: MoodPoint[]
  selectedId?: string
  onSelect: (point: MoodPoint) => void
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [transform, setTransform] = useState<MapTransform>({ x: 0, y: 0, k: 1 })
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<{ pointerId: number; clientX: number; clientY: number; x: number; y: number } | null>(null)

  const countries = useMemo(() => {
    const topo = countries110 as unknown as { objects: { countries: object } }
    const result = feature(topo as never, topo.objects.countries as never) as unknown as {
      features: Array<{ type: string; geometry: unknown; properties?: Record<string, unknown> }>
    }
    return result.features
  }, [])

  const zoomAt = (factor: number, cx = WIDTH / 2, cy = HEIGHT / 2) => {
    setTransform((current) => {
      const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.k * factor))
      if (k === current.k) return current
      const ratio = k / current.k
      return clampTransform({
        k,
        x: cx - (cx - current.x) * ratio,
        y: cy - (cy - current.y) * ratio
      })
    })
  }

  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const cx = ((event.clientX - rect.left) / rect.width) * WIDTH
    const cy = ((event.clientY - rect.top) / rect.height) * HEIGHT
    zoomAt(event.deltaY < 0 ? 1.18 : 1 / 1.18, cx, cy)
  }

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      x: transform.x,
      y: transform.y
    }
    setDragging(true)
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const start = dragRef.current
    if (!start || start.pointerId !== event.pointerId || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const dx = ((event.clientX - start.clientX) / rect.width) * WIDTH
    const dy = ((event.clientY - start.clientY) / rect.height) * HEIGHT
    setTransform((current) => clampTransform({ k: current.k, x: start.x + dx, y: start.y + dy }))
  }

  const stopDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
    setDragging(false)
  }

  return (
    <div className={`map-shell ${dragging ? 'is-dragging' : ''}`} aria-label="Interactive world mood map">
      <div className="map-glow map-glow-a" />
      <div className="map-glow map-glow-b" />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="world-map"
        role="img"
        aria-label="Interactive world map showing real anonymous mood check-ins"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onDoubleClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          zoomAt(1.45, ((event.clientX - rect.left) / rect.width) * WIDTH, ((event.clientY - rect.top) / rect.height) * HEIGHT)
        }}
      >
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          <g className="countries">
            {countries.map((country, index) => <path key={index} d={path(country as never) || ''} />)}
          </g>

          <g className="mood-points">
            {points.map((point, index) => {
              const coords = projection([point.lng, point.lat])
              if (!coords) return null
              const active = selectedId === point.id || hoveredId === point.id
              const radius = 5.5 + Math.min(7, Math.log2(point.activity + 1) * 1.7)
              const tone = scoreTone(point.score)
              return (
                <g
                  key={point.id}
                  transform={`translate(${coords[0]},${coords[1]})`}
                  className={`mood-point ${active ? 'is-active' : ''}`}
                  style={{ '--point-color': tone, '--delay': `${(index % 12) * -0.27}s` } as CSSProperties}
                  onMouseEnter={() => setHoveredId(point.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(event) => { event.stopPropagation(); onSelect(point) }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(point) }}
                  aria-label={`${point.label}, mood ${point.score.toFixed(1)}, ${point.activity} real check-ins`}
                >
                  <circle className="point-aura" r={radius * 3.3} />
                  <circle className="point-pulse" r={radius * 1.55} />
                  <circle className="point-core" r={radius} />
                  {active && (
                    <g className="map-tooltip" transform="translate(14,-54)">
                      <rect x="0" y="0" rx="12" width="190" height="64" />
                      <text x="12" y="22" className="tooltip-title">{point.label}</text>
                      <text x="12" y="43" className="tooltip-meta">{emotionMeta[point.emotion].emoji} {point.score.toFixed(1)} · {point.activity} check-in{point.activity === 1 ? '' : 's'}</text>
                      <text x="12" y="56" className="tooltip-detail">{point.detail}</text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>
        </g>
      </svg>

      <div className="map-controls" aria-label="Map zoom controls">
        <button onClick={() => zoomAt(1.35)} aria-label="Zoom in"><Plus size={18} /></button>
        <button onClick={() => zoomAt(1 / 1.35)} aria-label="Zoom out"><Minus size={18} /></button>
        <button onClick={() => setTransform({ x: 0, y: 0, k: 1 })} aria-label="Reset map"><RotateCcw size={17} /></button>
      </div>

      <div className="zoom-indicator">{Math.round(transform.k * 100)}%</div>
      <div className="map-noise" aria-hidden="true" />
    </div>
  )
}
