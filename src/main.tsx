import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'

registerSW({ immediate: true })

function isMapGestureTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('.map-shell'))
}

// Keep the application viewport stable on mobile while leaving the map as the
// only surface that accepts pinch zoom. The viewport meta is the primary lock;
// these handlers cover Safari gesture events as well.
document.addEventListener('gesturestart', (event) => {
  if (!isMapGestureTarget(event.target)) event.preventDefault()
}, { passive: false })

document.addEventListener('gesturechange', (event) => {
  if (!isMapGestureTarget(event.target)) event.preventDefault()
}, { passive: false })

document.addEventListener('touchmove', (event) => {
  if (event.touches.length > 1 && !isMapGestureTarget(event.target)) event.preventDefault()
}, { passive: false })

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
