import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import countries110 from 'world-atlas/countries-110m.json'
import type { MoodPoint } from '../lib/types'
import { emotionMeta } from '../i18n'

const projection = geoNaturalEarth1().scale(151).translate([480, 250])
const path = geoPath(projection)

function scoreTone(score: number) {
  if (score >= 8) return 'var(--mood-great)'
  if (score >= 7) return 'var(--mood-good)'
  if (score >= 6) return 'var(--mood-calm)'
  if (score >= 5) return 'var(--mood-okay)'
  if (score >= 4) return 'var(--mood-tired)'
  if (score >= 3) return 'var(--mood-low)'
  return 'var(--mood-stressed)'
}

export function WorldMap({ points, selectedId, onSelect }: { points: MoodPoint[]; selectedId?: string; onSelect: (point: MoodPoint) => void }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const countries = useMemo(() => {
    const topo = countries110 as unknown as { objects: { countries: object } }
    const result = feature(topo as never, topo.objects.countries as never) as unknown as { features: Array<{ type: string; geometry: unknown; properties?: Record<string, unknown> }> }
    return result.features
  }, [])

  return (
    <div className="map-shell" aria-label="World mood map">
      <div className="map-glow map-glow-a" />
      <div className="map-glow map-glow-b" />
      <svg viewBox="0 0 960 500" className="world-map" role="img" aria-label="Animated world mood map">
        <g className="countries">
          {countries.map((country, index) => (
            <path key={index} d={path(country as never) || ''} />
          ))}
        </g>
        <g className="mood-points">
          {points.map((point, index) => {
            const coords = projection([point.lng, point.lat])
            if (!coords) return null
            const active = selectedId === point.id || hoveredId === point.id
            const radius = 5.5 + Math.min(9, point.activity / 280)
            const tone = scoreTone(point.score)
            return (
              <g
                key={point.id}
                transform={`translate(${coords[0]},${coords[1]})`}
                className={`mood-point ${active ? 'is-active' : ''}`}
                style={{ '--point-color': tone, '--delay': `${(index % 12) * -0.27}s` } as CSSProperties}
                onMouseEnter={() => setHoveredId(point.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelect(point)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(point) }}
                aria-label={`${point.city}, mood ${point.score}`}
              >
                <circle className="point-aura" r={radius * 3.3} />
                <circle className="point-pulse" r={radius * 1.55} />
                <circle className="point-core" r={radius} />
                {active && (
                  <g className="map-tooltip" transform="translate(14,-50)">
                    <rect x="0" y="0" rx="12" width="152" height="58" />
                    <text x="12" y="22" className="tooltip-title">{point.city}</text>
                    <text x="12" y="43" className="tooltip-meta">{emotionMeta[point.emotion].emoji} {point.score.toFixed(1)} · {point.activity.toLocaleString()}</text>
                  </g>
                )}
              </g>
            )
          })}
        </g>
      </svg>
      <div className="map-noise" aria-hidden="true" />
    </div>
  )
}
