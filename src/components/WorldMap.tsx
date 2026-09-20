import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import countries110 from 'world-atlas/countries-110m.json'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { emotionMeta } from '../i18n'
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
  | { mode: 'pinch'; distance: number; base: MapTransform; anchor: Pointer }

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

  const clientToSvg = (point: Pointer) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: WIDTH / 2, y: HEIGHT / 2 }
    return {
      x: ((point.x - rect.left) / rect.width) * WIDTH,
      y: ((point.y - rect.top) / rect.height) * HEIGHT
    }
  }

  useEffect(() => {
    if (!selectedId) return
    const point = points.find((item) => item.id === selectedId)
    if (!point) return
    const coords = projection([point.lng, point.lat])
    if (!coords) return

    setTransform((current) => {
      const k = Math.max(current.k, 2.05)
      return clampTransform({
        k,
        x: WIDTH / 2 - coords[0] * k,
        y: HEIGHT / 2 - coords[1] * k
      })
    })
  }, [points, selectedId])

  // React's synthetic wheel handling can still allow the page to scroll on
  // some trackpads/browsers. A native non-passive listener guarantees that
  // wheel input over the map belongs only to map zoom on desktop.
  useEffect(() => {
    const node = svgRef.current
    if (!node) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const rect = node.getBoundingClientRect()
      const cx = ((event.clientX - rect.left) / rect.width) * WIDTH
      const cy = ((event.clientY - rect.top) / rect.height) * HEIGHT
      const normalized = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 160 : event.deltaY
      const delta = Math.max(-110, Math.min(110, normalized))
      const factor = Math.exp(-delta * 0.00235)

      setTransform((current) => {
        const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.k * factor))
        if (Math.abs(k - current.k) < 0.0001) return current
        const ratio = k / current.k
        return clampTransform({
          k,
          x: cx - (cx - current.x) * ratio,
          y: cy - (cy - current.y) * ratio
        })
      })
    }

    node.addEventListener('wheel', handleWheel, { passive: false })
    return () => node.removeEventListener('wheel', handleWheel)
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

  const beginPinch = () => {
    const values = [...pointersRef.current.values()]
    if (values.length < 2) return
    const a = values[0]
    const b = values[1]
    const center = clientToSvg(midpoint(a, b))
    const base = transformRef.current
    gestureRef.current = {
      mode: 'pinch',
      distance: Math.max(1, distance(a, b)),
      base,
      anchor: {
        x: (center.x - base.x) / base.k,
        y: (center.y - base.y) / base.k
      }
    }
  }

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    // Touch UX is cooperative. One finger belongs to normal page scrolling.
    // The map only captures a gesture after a second finger joins.
    if (event.pointerType !== 'mouse') {
      if (pointersRef.current.size >= 2) {
        for (const pointerId of pointersRef.current.keys()) {
          try { event.currentTarget.setPointerCapture(pointerId) } catch { /* browser may already own it */ }
        }
        event.preventDefault()
        setDragging(true)
        beginPinch()
      } else {
        gestureRef.current = null
        setDragging(false)
      }
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
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
      event.preventDefault()
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

    if (event.pointerType !== 'mouse') return

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

    if (event.pointerType !== 'mouse') {
      if (pointersRef.current.size >= 2) {
        beginPinch()
      } else {
        gestureRef.current = null
        setDragging(false)
      }
      return
    }

    if (pointersRef.current.size === 0) {
      gestureRef.current = null
      setDragging(false)
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPointer}
        onPointerCancel={stopPointer}
        onPointerLeave={(event: ReactPointerEvent<SVGSVGElement>) => { if (event.pointerType === 'mouse' && event.buttons === 0) stopPointer(event) }}
        onDoubleClick={(event: ReactMouseEvent<SVGSVGElement>) => {
          event.preventDefault()
          const center = clientToSvg({ x: event.clientX, y: event.clientY })
          zoomAt(1.42, center.x, center.y)
        }}
      >
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          <g className="countries">
            {countries.map((country, index) => <path key={index} d={path(country) || ''} />)}
          </g>
        </g>

        <g className="mood-points">
          {points.map((point, index) => {
            const coords = projection([point.lng, point.lat])
            if (!coords) return null
            const x = transform.x + coords[0] * transform.k
            const y = transform.y + coords[1] * transform.k
            const active = selectedId === point.id || hoveredId === point.id
            // Markers intentionally stay almost constant in screen size while
            // the geography zooms. This preserves geographic precision.
            const radius = 4.6 + Math.min(2.2, Math.log2(point.activity + 1) * 0.72)
            const tone = scoreTone(point.score)
            const emotion = emotionMeta[point.emotion]
            return (
              <g
                key={point.id}
                transform={`translate(${x},${y})`}
                className={`mood-point ${active ? 'is-active' : ''}`}
                style={{ '--point-color': tone, '--delay': `${(index % 12) * -0.27}s` } as CSSProperties}
                onMouseEnter={() => setHoveredId(point.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); onSelect(point) }}
                role="button"
                tabIndex={0}
                onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => { if (event.key === 'Enter' || event.key === ' ') onSelect(point) }}
                aria-label={`${point.label}, ${emotion.name}, mood ${point.score.toFixed(1)}, ${point.activity} real check-ins`}
              >
                <circle className="point-hit" r={14} />
                <circle className="point-aura" r={radius * 2.25} />
                <circle className="point-pulse" r={radius * 1.55} />
                <circle className="point-core" r={radius} />
                {active && (
                  <g className="point-readout" transform={`translate(${radius + 7},${-radius - 8})`}>
                    <rect x="0" y="-15" rx="8" width="58" height="24" />
                    <text x="7" y="1">{emotion.emoji} {point.score.toFixed(1)}</text>
                  </g>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      <div className="map-controls" aria-label="Map zoom controls">
        <button onClick={() => zoomAt(1.35)} aria-label="Zoom in"><Plus size={18} /></button>
        <button onClick={() => zoomAt(1 / 1.35)} aria-label="Zoom out"><Minus size={18} /></button>
        <button onClick={() => setTransform({ x: 0, y: 0, k: 1 })} aria-label="Reset map"><RotateCcw size={17} /></button>
      </div>

      <div className="zoom-indicator">{Math.round(transform.k * 100)}%</div>
      <div className="map-touch-hint" aria-hidden="true">Scroll normally · pinch with two fingers to zoom</div>
      <div className="map-noise" aria-hidden="true" />
    </div>
  )
}
