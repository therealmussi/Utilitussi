import { useEffect, useMemo, useState } from 'react'
import {
  Network, Library, Map, Sparkles, BookOpen, Route, ChartPie, Settings as SettingsIcon,
  Plus, Search, Globe2, ChevronDown, Keyboard, Inbox,
} from 'lucide-react'
import { useAppStore, useUniverseData } from '@/store/useAppStore'
import { Modal, Button, Input, Textarea, Select, Tag } from './ui'
import { KIND_COLORS, NODE_KINDS } from '@/services/factory'
import type { NodeKind } from '@/types'

export type Page = 'universe' | 'knowledge' | 'mindmaps' | 'assistant' | 'library' | 'learning' | 'insights' | 'settings' | 'import'

const NAV: Array<{ id: Page; label: string; icon: React.ReactNode }> = [
  { id: 'universe', label: 'Universe', icon: <Network size={17} /> },
  { id: 'knowledge', label: 'My Knowledge', icon: <Library size={17} /> },
  { id: 'mindmaps', label: 'Mind Maps', icon: <Map size={17} /> },
  { id: 'assistant', label: 'AI Assistant', icon: <Sparkles size={17} /> },
  { id: 'library', label: 'Research Library', icon: <BookOpen size={17} /> },
  { id: 'learning', label: 'Learning Paths', icon: <Route size={17} /> },
  { id: 'insights', label: 'Insights', icon: <ChartPie size={17} /> },
  { id: 'import', label: 'Import Center', icon: <Inbox size={17} /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon size={17} /> },
]

export function Layout({ page, setPage, children }: { page: Page; setPage: (p: Page) => void; children: React.ReactNode }) {
  const universes = useAppStore((s) => s.universes)
  const activeUniverseId = useAppStore((s) => s.activeUniverseId)
  const setActiveUniverse = useAppStore((s) => s.setActiveUniverse)
  const createUniverse = useAppStore((s) => s.createUniverse)
  const [universeMenuOpen, setUniverseMenuOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const nodes = useAppStore((s) => s.nodes)
  const activeName = universes.find((u) => u.id === activeUniverseId)?.name ?? 'No universe'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        setQuickAddOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-hair bg-panel">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
              <Globe2 size={16} />
            </div>
            <div className="flex-1">
              <div className="text-[13px] leading-tight font-semibold">MindMap Universe</div>
              <div className="text-[10px] text-ink-3">Everything connected.</div>
            </div>
          </div>
        </div>

        <div className="relative px-3 pt-2">
          <button
            className="flex w-full items-center justify-between rounded-md border border-hair bg-panel-2 px-2.5 py-1.5 text-xs text-ink hover:border-accent"
            onClick={() => setUniverseMenuOpen((v) => !v)}
          >
            <span className="max-w-[140px] truncate">{activeName}</span>
            <ChevronDown size={13} className="text-ink-3" />
          </button>
          {universeMenuOpen && (
            <div className="animate-fade-in absolute z-40 mt-1 w-[calc(100%-1.5rem)] rounded-md border border-hair bg-panel-2 py-1 shadow-xl">
              {universes.map((u) => (
                <button
                  key={u.id}
                  className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-panel-3 ${u.id === activeUniverseId ? 'text-accent' : 'text-ink'}`}
                  onClick={() => {
                    setActiveUniverse(u.id)
                    setUniverseMenuOpen(false)
                  }}
                >
                  {u.name}
                </button>
              ))}
              <button
                className="block w-full px-3 py-1.5 text-left text-xs text-accent hover:bg-panel-3"
                onClick={async () => {
                  const name = window.prompt('Name of the new universe:')
                  if (name?.trim()) await createUniverse(name.trim())
                  setUniverseMenuOpen(false)
                }}
              >
                + New universe
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-3 py-3">
          <button
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-hair bg-panel-2 py-1.5 text-xs text-ink-2 hover:text-ink"
            onClick={() => setPaletteOpen(true)}
          >
            <Search size={13} /> Search
          </button>
          <button
            className="flex items-center justify-center rounded-md bg-accent px-2.5 py-1.5 text-white hover:brightness-110"
            onClick={() => setQuickAddOpen(true)}
            title="Quick add (Ctrl+N)"
          >
            <Plus size={14} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                page === item.id ? 'bg-accent-soft text-ink font-medium' : 'text-ink-2 hover:bg-panel-2 hover:text-ink'
              }`}
            >
              <span className={page === item.id ? 'text-accent' : ''}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-hair px-3 py-2 text-[10px] text-ink-3">
          <div className="flex items-center gap-1.5">
            <Keyboard size={12} />
            <span>Ctrl+K search · Ctrl+N add</span>
          </div>
          <div className="mt-0.5">{nodes.length} nodes saved locally</div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">{children}</main>

      {quickAddOpen && <QuickAddModal onClose={() => setQuickAddOpen(false)} />}
      {paletteOpen && <SearchPalette onClose={() => setPaletteOpen(false)} setPage={setPage} />}
    </div>
  )
}

function QuickAddModal({ onClose }: { onClose: () => void }) {
  const addNode = useAppStore((s) => s.addNode)
  const activeUniverseId = useAppStore((s) => s.activeUniverseId)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [kind, setKind] = useState<NodeKind>('concept')
  const [tags, setTags] = useState('')

  return (
    <Modal open onClose={onClose} title="Quick add to your universe">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!title.trim() || !activeUniverseId) return
          await addNode(title.trim(), {
            content: content.trim(),
            kind,
            tags: tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
          })
          onClose()
        }}
      >
        <Input autoFocus placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea rows={4} placeholder="Content — what do you want to remember about this?" value={content} onChange={(e) => setContent(e.target.value)} />
        <div className="flex gap-2">
          <Select value={kind} onChange={(e) => setKind(e.target.value as NodeKind)} className="flex-1">
            {NODE_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </Select>
          <Input placeholder="tags, comma separated" value={tags} onChange={(e) => setTags(e.target.value)} className="flex-1" />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save node</Button>
        </div>
      </form>
    </Modal>
  )
}

function SearchPalette({ onClose, setPage }: { onClose: () => void; setPage: (p: Page) => void }) {
  const { nodes, connections } = useUniverseData()
  const addConnection = useAppStore((s) => s.addConnection)
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    const lower = q.trim().toLowerCase()
    if (!lower) return nodes.slice(0, 8)
    return nodes.filter((n) => `${n.title} ${n.content} ${n.tags.join(' ')}`.toLowerCase().includes(lower)).slice(0, 12)
  }, [q, nodes])
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <Modal open onClose={onClose} title={selected ? `Connect to: ${nodes.find((n) => n.id === selected)?.title}` : 'Search your universe'}>
      <Input autoFocus placeholder="Type to search nodes…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 space-y-1">
        {results.length === 0 && <div className="py-6 text-center text-xs text-ink-3">No matches. The graph only includes saved nodes.</div>}
        {results.map((n) => (
          <button
            key={n.id}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-panel-2 ${selected === n.id ? 'bg-panel-2' : ''}`}
            onClick={() => {
              if (!selected) {
                setSelected(n.id)
                setQ('')
              } else if (selected !== n.id) {
                void addConnection(selected, n.id, 'is-related-to')
                onClose()
              }
            }}
          >
            <span className="max-w-[70%] truncate">{n.title}</span>
            <span className="flex items-center gap-2 text-[11px] text-ink-3">
              <Tag label={n.kind} color={KIND_COLORS[n.kind]} />
              {selected && <span className="text-accent">connect →</span>}
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="mt-3 flex justify-between">
          <span className="text-[11px] text-ink-3">Pick a second node to create a connection, or press Escape to cancel.</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setSelected(null) }}>Reset</Button>
            <Button variant="outline" onClick={() => { onClose(); setPage('universe') }}>View in graph</Button>
          </div>
        </div>
      )}
      <div className="mt-2 text-[11px] text-ink-3">{connections.length} connections in this universe.</div>
    </Modal>
  )
}
