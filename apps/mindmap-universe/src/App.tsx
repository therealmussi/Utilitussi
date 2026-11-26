import { useEffect, useState } from 'react'
import { Layout, type Page } from '@/components/Layout'
import { useAppStore } from '@/store/useAppStore'
import { UniverseGraph } from '@/features/universe/UniverseGraph'
import { KnowledgePage } from '@/features/knowledge/KnowledgePage'
import { MindMapsPage } from '@/features/mindmaps/MindMapsPage'
import { AssistantPage } from '@/features/assistant/AssistantPage'
import { ResearchLibraryPage } from '@/features/library/ResearchLibraryPage'
import { LearningPathsPage } from '@/features/learning/LearningPathsPage'
import { InsightsPage } from '@/features/insights/InsightsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ImportCenter } from '@/features/import/ImportCenter'

const PAGES: Page[] = ['universe', 'knowledge', 'mindmaps', 'assistant', 'library', 'learning', 'insights', 'settings', 'import']

function pageFromHash(): Page {
  const h = window.location.hash.replace('#', '')
  return (PAGES.includes(h as Page) ? h : 'universe') as Page
}

function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md rounded-xl border border-bad/50 bg-panel p-6 text-center">
        <h2 className="mb-2 text-sm font-semibold text-bad">Something broke in the workspace</h2>
        <p className="mb-3 text-xs text-ink-2">{error.message}</p>
        <button className="rounded-md border border-hair px-3 py-1.5 text-xs hover:bg-panel-2" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  )
}

const seen = new Map<string, string>()
function trackRender(c: string) {
  seen.set(c, c)
}

export default function App() {
  const ready = useAppStore((s) => s.ready)
  const initError = useAppStore((s) => s.initError)
  const preferences = useAppStore((s) => s.preferences)
  const init = useAppStore((s) => s.init)
  const [page, setPage] = useState<Page>(pageFromHash)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', preferences.theme === 'light')
    document.documentElement.style.setProperty('--color-accent', preferences.accent)
    document.documentElement.style.fontSize = `${preferences.textSize}px`
    localStorage.setItem('mmu.page', page)
    if (!window.location.hash) window.location.hash = page
  }, [preferences.theme, preferences.accent, preferences.textSize, page])

  trackRender(page)

  const navigate = (p: Page) => {
    window.location.hash = p
    setPage(p)
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-sm text-ink-3">Opening your universe…</div>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-lg rounded-xl border border-warn/40 bg-panel p-6">
          <h2 className="mb-2 text-sm font-semibold text-warn">The universe could not be opened</h2>
          <p className="mb-3 text-xs text-ink-2">
            Local storage (IndexedDB) is unavailable in this browser session. This can happen in private
            browsing, with storage-blocking extensions, or in embedded browsers. The app cannot start without
            it, because your knowledge graph is stored locally by design.
          </p>
          <p className="mb-4 rounded-md border border-hair bg-panel-2 p-3 font-mono text-xs text-ink-3">{initError}</p>
          <button
            className="rounded-md border border-hair px-3 py-1.5 text-xs hover:bg-panel-2"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorFallback error={error} reset={() => { setError(null); setTick((t) => t + 1) }} />
  }

  try {
    return (
      <div key={tick} className="h-full">
        <Layout page={page} setPage={navigate}>
          <div className="h-full overflow-y-auto">
            {page === 'universe' && <FullFrame><UniverseGraph /></FullFrame>}
            {page === 'knowledge' && <KnowledgePage />}
            {page === 'mindmaps' && <MindMapsPage />}
            {page === 'assistant' && <AssistantPage />}
            {page === 'library' && <ResearchLibraryPage />}
            {page === 'learning' && <LearningPathsPage />}
            {page === 'insights' && <InsightsPage />}
            {page === 'settings' && <SettingsPage />}
            {page === 'import' && <ImportCenter />}
          </div>
        </Layout>
      </div>
    )
  } catch (err) {
    setError(err instanceof Error ? err : new Error(String(err)))
    return null
  }
}

function FullFrame({ children }: { children: React.ReactNode }) {
  return <div className="h-full">{children}</div>
}
