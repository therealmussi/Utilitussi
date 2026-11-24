import { useRef, useState } from 'react'
import { Download, Upload, Trash2, Globe2, Palette, Server, DatabaseBackup, AlertTriangle } from 'lucide-react'
import { useAppStore, useActiveUniverse } from '@/store/useAppStore'
import * as storage from '@/services/storage'
import { sanitizeImport } from '@/services/storage'
import { Button, Input, Select, SectionTitle } from '@/components/ui'
import type { GraphLayoutKind, UniverseExportFile } from '@/types'
import { truncate } from '@/utils/text'

const ACCENTS = ['#4f8cff', '#3ecfa0', '#e6b567', '#e98cb0', '#a78bfa', '#f07f6a', '#c3a6ff']

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function SettingsPage() {
  const preferences = useAppStore((s) => s.preferences)
  const setPreferences = useAppStore((s) => s.setPreferences)
  const universes = useAppStore((s) => s.universes)
  const deleteUniverse = useAppStore((s) => s.deleteUniverse)
  const importFile = useAppStore((s) => s.importFile)
  const exportFile = useAppStore((s) => s.exportFile)
  const activeUniverse = useActiveUniverse()
  const fileRef = useRef<HTMLInputElement>(null)
  const fullRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  void setPreferences

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="text-lg font-semibold">Settings</h1>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-hair bg-panel p-4">
          <SectionTitle right={<Palette size={14} className="text-ink-3" />}>Appearance</SectionTitle>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span>Theme</span>
            <Select
              className="!w-36"
              value={preferences.theme}
              onChange={async (e) => {
                const theme = e.target.value as 'dark' | 'light'
                await setPreferences({ theme })
                document.documentElement.classList.toggle('light', theme === 'light')
              }}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </Select>
          </div>
          <div className="mb-3 text-sm">
            <div className="mb-1.5">Accent color</div>
            <div className="flex gap-2">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  className={`h-6 w-6 rounded-full border-2 ${preferences.accent === c ? 'border-ink' : 'border-transparent'}`}
                  style={{ background: c }}
                  onClick={async () => {
                    document.documentElement.style.setProperty('--color-accent', c)
                    await setPreferences({ accent: c })
                  }}
                />
              ))}
            </div>
          </div>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span>Default graph layout</span>
            <Select className="!w-40" value={preferences.defaultLayout} onChange={async (e) => await setPreferences({ defaultLayout: e.target.value as GraphLayoutKind })}>
              <option value="force">Force-directed</option>
              <option value="radial">Radial</option>
              <option value="hierarchical">Hierarchical</option>
              <option value="circular">Circular</option>
              <option value="timeline">Timeline</option>
            </Select>
          </div>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span>Text size</span>
            <Select className="!w-36" value={String(preferences.textSize)} onChange={async (e) => await setPreferences({ textSize: Number(e.target.value) })}>
              <option value="13">Compact (13px)</option>
              <option value="14">Default (14px)</option>
              <option value="16">Large (16px)</option>
            </Select>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Interface density</span>
            <Select className="!w-36" value={preferences.density} onChange={async (e) => await setPreferences({ density: e.target.value as 'compact' | 'comfortable' })}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </Select>
          </div>
        </section>

        <section className="rounded-xl border border-hair bg-panel p-4">
          <SectionTitle right={<Server size={14} className="text-ink-3" />}>AI provider (optional)</SectionTitle>
          <p className="mb-3 text-[11px] text-ink-2">
            OpenAI-compatible endpoint. Keys live in your browser storage and are sent only to the endpoint you configure — never to any other
            server. Without configuration the app uses the built-in deterministic local engine and always labels its output.
          </p>
          <div className="space-y-2">
            <Input
              placeholder="Base URL (e.g. https://api.openai.com/v1)"
              value={preferences.ai.baseUrl}
              onChange={async (e) => await setPreferences({ ai: { ...preferences.ai, baseUrl: e.target.value } })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input type="password" placeholder="API key (optional)" value={preferences.ai.apiKey} onChange={async (e) => await setPreferences({ ai: { ...preferences.ai, apiKey: e.target.value } })} />
              <Input placeholder="Model (e.g. gpt-4o-mini)" value={preferences.ai.model} onChange={async (e) => await setPreferences({ ai: { ...preferences.ai, model: e.target.value } })} />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-ink-3">
            Environment variables <code>VITE_AI_BASE_URL</code>, <code>VITE_AI_API_KEY</code>, <code>VITE_AI_MODEL</code> are used as defaults. See <code>.env.example</code>.
          </div>
        </section>

        <section className="rounded-xl border border-hair bg-panel p-4">
          <SectionTitle right={<Download size={14} className="text-ink-3" />}>Data portability</SectionTitle>
          <div className="mb-2 text-xs text-ink-2">
            Export preserves every id, relationship, tag, source link and mind map position. The JSON format is documented in <code>docs/DATA-FORMAT.md</code>.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => download(new Blob([JSON.stringify(exportFile(activeUniverse?.id ?? null), null, 2)], { type: 'application/json' }), `mindmap-universe-${truncate(activeUniverse?.name ?? 'universe', 20).replace(/\s+/g, '-').toLowerCase()}.json`)}
            >
              <Download size={13} /> Export current universe
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload size={13} /> Import universe JSON
            </Button>
            <Button
              variant="outline"
              onClick={async () => download(new Blob([JSON.stringify(exportFile(null), null, 2)], { type: 'application/json' }), 'mindmap-universe-full-backup.json')}
            >
              <DatabaseBackup size={13} /> Full backup (all universes)
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const data = await storage.loadAll()
                download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'mindmap-universe-backup.json')
                setNotice('Full backup created from IndexedDB.')
              }}
            >
              <DatabaseBackup size={13} /> Backup (direct read)
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                const raw = JSON.parse(await f.text())
                const data = sanitizeImport(raw)
                if (!data) {
                  setNotice('Invalid file: expected a MindMap Universe JSON export (format: mindmap-universe).')
                  return
                }
                await importFile(mergeIntoUpload(data))
                setNotice(`Imported ${data.nodes.length} nodes, ${data.connections.length} connections.`)
              } catch (err) {
                setNotice(truncate(err instanceof Error ? err.message : String(err), 120))
              }
            }}
          />
          <input
            ref={fullRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const data = sanitizeImport(JSON.parse(await f.text()))
              if (!data) {
                setNotice('Invalid backup file.')
                return
              }
              await storage.restoreFull(data)
              window.location.reload()
            }}
          />
          <div className="mt-3">
            <Button variant="ghost" className="text-xs" onClick={() => fullRef.current?.click()}>
              Restore full backup (replaces everything)
            </Button>
          </div>
          {notice && <div className="animate-fade-in mt-3 rounded-md border border-hair bg-panel-2 p-2 text-xs text-ink-2">{notice}</div>}
        </section>

        <section className="rounded-xl border border-bad/40 bg-panel p-4">
          <SectionTitle right={<AlertTriangle size={14} className="text-bad" />}>Universe management</SectionTitle>
          <div className="space-y-2">
            {universes.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-md border border-hair bg-panel-2 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Globe2 size={13} className="text-accent" /> {u.name}
                    {u.id === activeUniverse?.id && <span className="text-[10px] text-ink-3">(active)</span>}
                  </div>
                  {u.description && <div className="truncate text-[11px] text-ink-3">{u.description}</div>}
                </div>
                {confirmDelete === u.id ? (
                  <div className="flex gap-1.5">
                    <Button variant="danger" className="text-xs" onClick={async () => { await deleteUniverse(u.id); setConfirmDelete(null) }}>
                      Delete permanently
                    </Button>
                    <Button variant="ghost" className="text-xs" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                  </div>
                ) : (
                  <Button variant="ghost" className="!text-bad text-xs" onClick={() => setConfirmDelete(u.id)}>
                    <Trash2 size={12} /> Delete
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-ink-3">Deleting a universe removes its nodes, connections, collections, sources and maps. Export first.</div>
        </section>
      </div>
    </div>
  )
}

const mergeIntoUpload = (data: UniverseExportFile): UniverseExportFile => data
