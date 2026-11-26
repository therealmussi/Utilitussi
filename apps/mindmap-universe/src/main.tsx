import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootEl = document.getElementById('root')!

function showFatalError(kind: string, detail: unknown): void {
  const alreadyMounted = rootEl.querySelector('[data-mmu-mounted]')
  if (alreadyMounted) return
  const box = document.createElement('pre')
  box.style.cssText =
    'margin:0;padding:24px;min-height:100vh;background:#070b14;color:#e5646e;font:12px/1.6 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere'
  box.textContent = `MindMap Universe failed to start (${kind})\n\n${String(detail instanceof Error ? (detail.stack ?? detail.message) : detail)}`
  rootEl.replaceChildren(box)
}

window.addEventListener('error', (e) => showFatalError('uncaught error', e.error ?? e.message))
window.addEventListener('unhandledrejection', (e) => showFatalError('unhandled rejection', e.reason))

try {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (err) {
  showFatalError('mount', err)
}
