import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'LemGil — Ministerio Apostólico',
        short_name: 'LemGil',
        description: 'Sistema de gestión eclesial',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f1117',
        theme_color: '#d4a843',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/ykynzeykphufrkwgncyu\.supabase\.co\/.*/i,
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase-api', expiration: { maxEntries: 50, maxAgeSeconds: 300 } }
        }]
      }
    })
  ],
})
