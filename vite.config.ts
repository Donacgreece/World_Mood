import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/World_Mood/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'apple-touch-icon.png',
        'logo.svg',
        'logo-mark.svg',
        'og-image.svg',
        'splash/*.png'
      ],
      manifest: {
        id: '/World_Mood/',
        name: 'Moodaro',
        short_name: 'Moodaro',
        description: 'Moodaro is a playful live social mood map built from real anonymous check-ins.',
        theme_color: '#f5f6ff',
        background_color: '#f5f6ff',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'any',
        scope: '/World_Mood/',
        start_url: '/World_Mood/',
        categories: ['social', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          {
            name: 'Share your mood',
            short_name: 'Check in',
            url: '/World_Mood/?compose=1',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'Moodaro Mini',
            short_name: 'Mini pulse',
            url: '/World_Mood/?mini=1',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
          }
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
