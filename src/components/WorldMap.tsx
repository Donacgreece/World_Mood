import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import countries110 from 'world-atlas/countries-110m.json'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import type { MoodPoint } from '../lib/types'

const WIDTH = 960
const HEIGHT = 500
const MIN_ZOOM = 1
const MAX_ZOOM = 7
const projection = geoNaturalEarth1().scale(151).translate([WIDTH / 2, HEIGHT / 2])
const path = geoPath(projection)

type MapTransform = { x: number; y: number; k: number }
type Pointer = { x: number; y: number }
type Gesture =
  | { mode: 'drag'; pointerId: number; start: Pointer; base: MapTransform }
  | { mode: 'pinch'; distance: number; center: Pointer; base: MapTransform; anchor: Pointer }

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

function distance(a: Pointer, b: Pointer) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function midpoint(a: Pointer, b: Pointer): Pointer {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
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
  const transformRef = useRef(transform)
  const pointersRef = useRef(new Map<number, Pointer>())
  const gestureRef = useRef<Gesture | null>(null)
  transformRef.current = transform

  const countries = useMemo(() => {
    const topo = countries110 as any
    return (feature(topo, topo.objects.countries) as any).features as any[]
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const point = points.find((item) => item.id === selectedId)
    if (!point) return
    const coords = projection([point.lng, point.lat])
    if (!coords) return

    setTransform((current) => {
      const k = Math.max(current.k, 2.15)
      return clampTransform({
        k,
        x: WIDTH / 2 - coords[0] * k,
        y: HEIGHT / 2 - coords[1] * k
      })
    })
  }, [points, selectedId])

  const clientToSvg = (point: Pointer) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: WIDTH / 2, y: HEIGHT / 2 }
    return {
      x: ((point.x - rect.left) / rect.width) * WIDTH,
      y: ((point.y - rect.top) / rect.height) * HEIGHT
    }
  }

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
    const center = clientToSvg({ x: event.clientX, y: event.clientY })
    zoomAt(event.deltaY < 0 ? 1.16 : 1 / 1.16, center.x, center.y)
  }

  const beginPinch = () => {
    const values = [...pointersRef.current.values()]
    if (values.length < 2) return
    const a = values[0]
    const b = values[1]
    const centerClient = midpoint(a, b)
    const center = clientToSvg(centerClient)
    const base = transformRef.current
    gestureRef.current = {
      mode: 'pinch',
      distance: Math.max(1, distance(a, b)),
      center,
      base,
      anchor: {
        x: (center.x - base.x) / base.k,
        y: (center.y - base.y) / base.k
      }
    }
  }

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    setDragging(true)

    if (pointersRef.current.size >= 2) {
      beginPinch()
      return
    }

    gestureRef.current = {
      mode: 'drag',
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      base: transformRef.current
    }
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size >= 2) {
      if (gestureRef.current?.mode !== 'pinch') beginPinch()
      const gesture = gestureRef.current
      if (!gesture || gesture.mode !== 'pinch') return
      const values = [...pointersRef.current.values()]
      const a = values[0]
      const b = values[1]
      const currentCenter = clientToSvg(midpoint(a, b))
      const ratio = distance(a, b) / gesture.distance
      const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, gesture.base.k * ratio))
      setTransform(clampTransform({
        k,
        x: currentCenter.x - gesture.anchor.x * k,
        y: currentCenter.y - gesture.anchor.y * k
      }))
      return
    }

    const gesture = gestureRef.current
    if (!gesture || gesture.mode !== 'drag' || gesture.pointerId !== event.pointerId || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const dx = ((event.clientX - gesture.start.x) / rect.width) * WIDTH
    const dy = ((event.clientY - gesture.start.y) / rect.height) * HEIGHT
    setTransform(clampTransform({
      k: gesture.base.k,
      x: gesture.base.x + dx,
      y: gesture.base.y + dy
    }))
  }

  const stopPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size === 1) {
      const [pointerId, point] = [...pointersRef.current.entries()][0]
      gestureRef.current = { mode: 'drag', pointerId, start: point, base: transformRef.current }
    } else if (pointersRef.current.size === 0) {
      gestureRef.current = null
      setDragging(false)
    } else {
      beginPinch()
    }
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
        onPointerUp={stopPointer}
        onPointerCancel={stopPointer}
        onPointerLeave={(event: ReactPointerEvent<SVGSVGElement>) => { if (event.pointerType === 'mouse' && event.buttons === 0) stopPointer(event) }}
        onDoubleClick={(event: ReactMouseEvent<SVGSVGElement>) => {
          const center = clientToSvg({ x: event.clientX, y: event.clientY })
          zoomAt(1.45, center.x, center.y)
        }}
      >
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          <g className="countries">
            {countries.map((country, index) => <path key={index} d={path(country) || ''} />)}
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
                  onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); onSelect(point) }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => { if (event.key === 'Enter' || event.key === ' ') onSelect(point) }}
                  aria-label={`${point.label}, mood ${point.score.toFixed(1)}, ${point.activity} real check-ins`}
                >
                  <circle className="point-aura" r={radius * 3.3} />
                  <circle className="point-pulse" r={radius * 1.55} />
                  <circle className="point-core" r={radius} />
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
