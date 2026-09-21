import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import countries50 from 'world-atlas/countries-50m.json'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { emotionMeta } from '../i18n'
import type { MoodPoint } from '../lib/types'

const WIDTH = 960
const HEIGHT = 500
const MIN_ZOOM = 1
const MAX_ZOOM = 30
const SELECTED_ZOOM = 8
const BUTTON_ZOOM_FACTOR = 1.72
const DOUBLE_ZOOM_FACTOR = 2
const projection = geoNaturalEarth1().scale(151).translate([WIDTH / 2, HEIGHT / 2])
const path = geoPath(projection)

type MapTransform = { x: number; y: number; k: number }
type Point = { x: number; y: number }
type MouseGesture = { pointerId: number; start: Point; base: MapTransform } | null
type TouchGesture = {
  distance: number
  anchor: Point
  base: MapTransform
} | null

type LastTap = { time: number; point: Point } | null

function scoreTone(score: number) {
  if (score >= 8) return 'var(--mood-great)'
  if (score >= 7) return 'var(--mood-good)'
  if (score >= 6) return 'var(--mood-calm)'
  if (score >= 5) return 'var(--mood-okay)'
  if (score >= 4) return 'var(--mood-tired)'
  if (score >= 3) return 'var(--mood-low)'
  return 'var(--mood-stressed)'
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function clampTransform(next: MapTransform): MapTransform {
  const k = clamp(next.k, MIN_ZOOM, MAX_ZOOM)
  const minX = WIDTH - WIDTH * k
  const minY = HEIGHT - HEIGHT * k
  return {
    k,
    x: clamp(next.x, minX, 0),
    y: clamp(next.y, minY, 0)
  }
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function touchPoint(touch: Touch): Point {
  return { x: touch.clientX, y: touch.clientY }
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
  const mouseGestureRef = useRef<MouseGesture>(null)
  const touchGestureRef = useRef<TouchGesture>(null)
  const touchMovedRef = useRef(false)
  const singleTouchStartRef = useRef<Point | null>(null)
  const lastTapRef = useRef<LastTap>(null)
  transformRef.current = transform

  const countries = useMemo(() => {
    const topo = countries50 as any
    return (feature(topo, topo.objects.countries) as any).features as any[]
  }, [])

  const clientToSvg = (point: Point): Point => {
    const node = svgRef.current
    if (!node) return { x: WIDTH / 2, y: HEIGHT / 2 }
    const ctm = node.getScreenCTM()
    if (!ctm) return { x: WIDTH / 2, y: HEIGHT / 2 }
    const svgPoint = node.createSVGPoint()
    svgPoint.x = point.x
    svgPoint.y = point.y
    const local = svgPoint.matrixTransform(ctm.inverse())
    return { x: local.x, y: local.y }
  }

  const zoomAt = (factor: number, cx = WIDTH / 2, cy = HEIGHT / 2) => {
    setTransform((current) => {
      const k = clamp(current.k * factor, MIN_ZOOM, MAX_ZOOM)
      if (Math.abs(k - current.k) < 0.0001) return current
      const ratio = k / current.k
      return clampTransform({
        k,
        x: cx - (cx - current.x) * ratio,
        y: cy - (cy - current.y) * ratio
      })
    })
  }

  useEffect(() => {
    if (!selectedId) return
    const point = points.find((item) => item.id === selectedId)
    if (!point) return
    const coords = projection([point.lng, point.lat])
    if (!coords) return

    setTransform((current) => {
      const k = Math.max(current.k, SELECTED_ZOOM)
      return clampTransform({
        k,
        x: WIDTH / 2 - coords[0] * k,
        y: HEIGHT / 2 - coords[1] * k
      })
    })
  }, [points, selectedId])

  // Desktop wheel/trackpad zoom. This is deliberately native and non-passive
  // so the page never scrolls while the pointer is over the map.
  useEffect(() => {
    const node = svgRef.current
    if (!node) return

    const handleWheel = (event: WheelEvent) => {
      if (window.matchMedia('(pointer: coarse)').matches) return
      event.preventDefault()
      event.stopPropagation()

      const center = clientToSvg({ x: event.clientX, y: event.clientY })
      const normalized = event.deltaMode === 1
        ? event.deltaY * 16
        : event.deltaMode === 2
          ? event.deltaY * 180
          : event.deltaY
      const delta = clamp(normalized, -120, 120)
      const sensitivity = event.ctrlKey ? 0.008 : 0.0052
      const factor = Math.exp(-delta * sensitivity)
      zoomAt(factor, center.x, center.y)
    }

    node.addEventListener('wheel', handleWheel, { passive: false })
    return () => node.removeEventListener('wheel', handleWheel)
  }, [])

  // Mobile: one finger remains native page scrolling. Two fingers are owned by
  // the map and provide pinch-to-zoom + two-finger pan around the pinch center.
  useEffect(() => {
    const node = svgRef.current
    if (!node) return

    const startPinch = (touches: TouchList) => {
      if (touches.length < 2) return
      const aClient = touchPoint(touches[0])
      const bClient = touchPoint(touches[1])
      const center = clientToSvg(midpoint(aClient, bClient))
      const base = transformRef.current
      touchGestureRef.current = {
        distance: Math.max(1, distance(aClient, bClient)),
        base,
        anchor: {
          x: (center.x - base.x) / base.k,
          y: (center.y - base.y) / base.k
        }
      }
      touchMovedRef.current = false
      setDragging(true)
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        event.preventDefault()
        singleTouchStartRef.current = null
        startPinch(event.touches)
      } else if (event.touches.length === 1) {
        singleTouchStartRef.current = touchPoint(event.touches[0])
        touchMovedRef.current = false
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        if (event.touches.length === 1 && singleTouchStartRef.current) {
          if (distance(singleTouchStartRef.current, touchPoint(event.touches[0])) > 12) touchMovedRef.current = true
        }
        return
      }
      event.preventDefault()
      event.stopPropagation()
      if (!touchGestureRef.current) startPinch(event.touches)
      const gesture = touchGestureRef.current
      if (!gesture) return

      const aClient = touchPoint(event.touches[0])
      const bClient = touchPoint(event.touches[1])
      const currentCenter = clientToSvg(midpoint(aClient, bClient))
      const ratio = distance(aClient, bClient) / gesture.distance
      const k = clamp(gesture.base.k * ratio, MIN_ZOOM, MAX_ZOOM)

      touchMovedRef.current = true
      setTransform(clampTransform({
        k,
        x: currentCenter.x - gesture.anchor.x * k,
        y: currentCenter.y - gesture.anchor.y * k
      }))
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        startPinch(event.touches)
        return
      }

      const hadPinch = Boolean(touchGestureRef.current)
      touchGestureRef.current = null
      singleTouchStartRef.current = null
      setDragging(false)

      if (hadPinch || touchMovedRef.current || event.changedTouches.length !== 1) {
        touchMovedRef.current = false
        return
      }

      // Natural mobile double-tap zoom, without stealing normal single-finger scrolling.
      const changed = event.changedTouches[0]
      const now = Date.now()
      const point = { x: changed.clientX, y: changed.clientY }
      const previous = lastTapRef.current
      if (previous && now - previous.time < 310 && distance(previous.point, point) < 32) {
        event.preventDefault()
        const center = clientToSvg(point)
        zoomAt(DOUBLE_ZOOM_FACTOR, center.x, center.y)
        lastTapRef.current = null
      } else {
        lastTapRef.current = { time: now, point }
      }
    }

    const handleTouchCancel = () => {
      touchGestureRef.current = null
      singleTouchStartRef.current = null
      touchMovedRef.current = false
      setDragging(false)
    }

    node.addEventListener('touchstart', handleTouchStart, { passive: false })
    node.addEventListener('touchmove', handleTouchMove, { passive: false })
    node.addEventListener('touchend', handleTouchEnd, { passive: false })
    node.addEventListener('touchcancel', handleTouchCancel, { passive: true })
    return () => {
      node.removeEventListener('touchstart', handleTouchStart)
      node.removeEventListener('touchmove', handleTouchMove)
      node.removeEventListener('touchend', handleTouchEnd)
      node.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [])

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    mouseGestureRef.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      base: transformRef.current
    }
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== 'mouse') return
    const gesture = mouseGestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId || !svgRef.current) return
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
    if (event.pointerType !== 'mouse') return
    mouseGestureRef.current = null
    setDragging(false)
  }

  const reset = () => setTransform({ x: 0, y: 0, k: 1 })

  return (
    <div className={`map-shell ${dragging ? 'is-dragging' : ''}`} aria-label="Interactive Moodaro world map">
      <div className="map-glow map-glow-a" />
      <div className="map-glow map-glow-b" />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="world-map"
        role="img"
        aria-label="Interactive Moodaro world map showing real anonymous mood check-ins"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPointer}
        onPointerCancel={stopPointer}
        onPointerLeave={(event: ReactPointerEvent<SVGSVGElement>) => {
          if (event.pointerType === 'mouse' && event.buttons === 0) stopPointer(event)
        }}
        onDoubleClick={(event: ReactMouseEvent<SVGSVGElement>) => {
          event.preventDefault()
          const center = clientToSvg({ x: event.clientX, y: event.clientY })
          zoomAt(DOUBLE_ZOOM_FACTOR, center.x, center.y)
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
            const radius = 4.2 + Math.min(1.8, Math.log2(point.activity + 1) * 0.55)
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
                onClick={(event: ReactMouseEvent<SVGGElement>) => {
                  event.stopPropagation()
                  onSelect(point)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelect(point)
                }}
                aria-label={`${point.label}, ${emotion.name}, mood ${point.score.toFixed(1)}, ${point.activity} real check-ins`}
              >
                <circle className="point-hit" r={18} />
                <circle className="point-aura moodaro-point-aura" r={radius * 2.25} />
                <g className="moodaro-pin" style={{ '--pin-color': tone } as CSSProperties}>
                  <path className="moodaro-pin-body" d="M0,0 C0,0 -11,-7.5 -11,-17 C-11,-24.8 -6,-31 0,-31 C6,-31 11,-24.8 11,-17 C11,-7.5 0,0 0,0 Z" />
                  <circle className="moodaro-pin-face" cx="0" cy="-17.5" r="8.7" />
                  <text className="moodaro-pin-emoji" x="0" y="-17.2" textAnchor="middle">{emotion.emoji}</text>
                </g>
                {active && (
                  <g className="point-readout moodaro-readout" transform="translate(14,-34)">
                    <rect x="0" y="-15" rx="10" width="82" height="29" />
                    <text x="9" y="3">{emotion.name} · {point.score.toFixed(1)}</text>
                  </g>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      <div className="map-controls" aria-label="Map zoom controls">
        <button onClick={() => zoomAt(BUTTON_ZOOM_FACTOR)} aria-label="Zoom in"><Plus size={18} /></button>
        <button onClick={() => zoomAt(1 / BUTTON_ZOOM_FACTOR)} aria-label="Zoom out"><Minus size={18} /></button>
        <button onClick={reset} aria-label="Reset map"><RotateCcw size={17} /></button>
      </div>

      <div className="zoom-indicator">{transform.k < 10 ? transform.k.toFixed(1) : Math.round(transform.k)}×</div>
      <div className="map-touch-hint" aria-hidden="true">Two-finger pinch · double-tap to zoom</div>
      <div className="map-noise" aria-hidden="true" />
    </div>
  )
}
