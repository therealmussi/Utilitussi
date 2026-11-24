import { useMemo, useState } from 'react'
import { Plus, Trash2, LayoutTemplate, ArrowLeft, PenLine } from 'lucide-react'
import type { MindMap, MindMapNode } from '@/types'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore, useUniverseData } from '@/store/useAppStore'
import { uid } from '@/services/factory'
import { Button, Input, Modal, Select, EmptyState } from '@/components/ui'
import { MindMapEditor } from './MindMapEditor'
import { TEMPLATES } from './templates'
import { truncate } from '@/utils/text'

export function MindMapsPage() {
  const mindMaps = useAppStore(useShallow((s) => s.mindMaps.filter((m) => m.universeId === s.activeUniverseId)))
  const createMindMap = useAppStore((s) => s.createMindMap)
  const saveMindMap = useAppStore((s) => s.saveMindMap)
  const deleteMindMap = useAppStore((s) => s.deleteMindMap)
  const activeUniverseId = useAppStore((s) => s.activeUniverseId)
  const [openMapId, setOpenMapId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)

  const openMap = useMemo(() => mindMaps.find((m) => m.id === openMapId), [mindMaps, openMapId])

  if (openMap) {
    return <MindMapEditor map={openMap} onSave={saveMindMap} onBack={() => setOpenMapId(null)} />
  }

  const blank = async (title: string, description: string) => {
    const map = await createMindMap(title || 'Untitled map', description)
    setOpenMapId(map.id)
  }

  const fromTemplate = async (templateId: string, title: string) => {
    const t = TEMPLATES.find((x) => x.id === templateId)
    const map = await createMindMap(title || t?.name || 'New map', t?.description ?? '')
    if (!t) {
      setOpenMapId(map.id)
      return
    }
    const rootId = uid('mmr_')
    const nodes: MindMapNode[] = [{ id: rootId, parentId: null, text: title || t.root, note: '', color: '#4f8cff', collapsed: false }]
    t.branches.forEach((b, i) => {
      const branchId = uid('mmb_')
      nodes.push({ id: branchId, parentId: rootId, text: b.text, note: '', color: ['#4f8cff', '#3ecfa0', '#e5b567', '#e98cb0', '#a78bfa'][i % 5], collapsed: false })
      b.children.forEach((c) => {
        nodes.push({ id: uid('mmc_'), parentId: branchId, text: c, note: '', color: nodes[nodes.length - 1].color, collapsed: false })
      })
    })
    await saveMindMap({ ...map, nodes })
    setOpenMapId(map.id)
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Mind Maps</h1>
          <p className="text-xs text-ink-2">Dedicated editors, independent from the global graph. Use templates to start fast.</p>
        </div>
        <Button variant="primary" onClick={() => { setWizardOpen(true); setWizardStep(0) }}>
          <Plus size={14} /> New mind map
        </Button>
      </div>

      {mindMaps.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate size={36} />}
          title="No mind maps yet"
          hint="Open a separate canvas for brainstorming, studying or planning. Templates are pre-structured and fully editable."
          action={<Button variant="primary" onClick={() => setWizardOpen(true)}><Plus size={14} /> Create your first map</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {mindMaps.map((m) => (
            <div key={m.id} className="group rounded-lg border border-hair bg-panel p-4 transition-colors hover:border-accent">
              <div className="flex items-start justify-between">
                <button className="text-left" onClick={() => setOpenMapId(m.id)}>
                  <div className="text-sm font-semibold">{m.title}</div>
                  <div className="mt-0.5 text-xs text-ink-2">{truncate(m.description, 90) || 'No description'}</div>
                </button>
                <button className="text-ink-3 opacity-0 group-hover:opacity-100 hover:text-bad" onClick={() => void deleteMindMap(m.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-ink-3">
                <span>{m.nodes.length} nodes</span>
                <button className="flex items-center gap-1 text-accent hover:underline" onClick={() => setOpenMapId(m.id)}>
                  <PenLine size={10} /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={wizardOpen} onClose={() => setWizardOpen(false)} title="New mind map">
        {wizardStep === 0 ? (
          <div className="space-y-2">
            <button
              className="w-full rounded-md border border-hair bg-panel-2 p-3 text-left text-sm hover:border-accent"
              onClick={() => setWizardStep(1)}
            >
              <div className="font-medium">Start from an empty canvas</div>
              <div className="text-xs text-ink-2">A blank canvas with a single central concept.</div>
            </button>
            <button
              className="w-full rounded-md border border-hair bg-panel-2 p-3 text-left text-sm hover:border-accent"
              onClick={() => setWizardStep(2)}
            >
              <div className="font-medium">Start from a template</div>
              <div className="text-xs text-ink-2">Pre-structured maps for typical thinking patterns.</div>
            </button>
          </div>
        ) : wizardStep === 1 ? (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              const input = (e.currentTarget.elements.namedItem('title') as HTMLInputElement).value
              await blank(input, '')
              setWizardOpen(false)
            }}
          >
            <Input name="title" autoFocus placeholder="Map title" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setWizardStep(0)}>Back</Button>
              <Button type="submit" variant="primary">Create</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                className="w-full rounded-md border border-hair bg-panel-2 p-3 text-left text-sm hover:border-accent"
                onClick={async () => {
                  setWizardOpen(false)
                  await fromTemplate(t.id, t.name)
                }}
              >
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-ink-2">{t.description}</div>
              </button>
            ))}
            <div className="pt-1">
              <Button variant="ghost" onClick={() => setWizardStep(0)}><ArrowLeft size={13} /> Back</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

