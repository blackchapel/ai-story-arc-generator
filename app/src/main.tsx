import React from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import './index.css'
import App from './App'

// ─── PWA Service Worker ───────────────────────────────────────────────────────
// Auto-updates in background; prompts user on next visit if new content exists
registerSW({
  onNeedRefresh() {
    // In a full app: show a toast/snackbar offering the user to refresh
    console.info('[arc] New content available. Refresh to update.')
  },
  onOfflineReady() {
    console.info('[arc] App ready to work offline.')
  },
})

// ─── React 18 root ───────────────────────────────────────────────────────────
const container = document.getElementById('root')

if (!container) {
  throw new Error(
    '[arc] Root element #root not found. Check your index.html.',
  )
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
