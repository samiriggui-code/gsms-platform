import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import './store/useThemeStore'
import App from './App.tsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-secondary">
          <div className="font-sans text-text-tertiary">Loading...</div>
        </div>
      }
    >
      <App />
    </Suspense>
  </StrictMode>,
)
