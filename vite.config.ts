import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/World_Mood/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'logo.svg', 'og-image.svg'],
      manifest: {
        name: 'World Mood',
        short_name: 'World Mood',
        description: 'See how the world feels, right now.',
        theme_color: '#0b1020',
        background_color: '#070a13',
        display: 'standalone',
        orientation: 'any',
        scope: '/World_Mood/',
        start_url: '/World_Mood/',
        categories: ['social', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/World_Mood/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  build: {
    target: 'es2022',
    sourcemap: false
  }
})
