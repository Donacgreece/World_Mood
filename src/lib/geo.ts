import { geoContains } from 'd3-geo'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'
import { countriesByNumeric, countryNameByCode } from '../data/countries'

const worldData = world as any
const countries = (feature(worldData, worldData.objects.countries) as any).features as any[]

export function countryForCoordinates(lat: number, lng: number) {
  const point: [number, number] = [lng, lat]
  for (const country of countries) {
    if (!geoContains(country, point)) continue
    const numeric = String(country.id ?? '').padStart(3, '0')
    return countriesByNumeric[numeric]
  }
  return undefined
}

export function countryName(code?: string) {
  if (!code) return undefined
  return countryNameByCode[code.toUpperCase()]
}
