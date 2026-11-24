import { useMemo, useRef, useState } from 'react'
import { Send, Sparkles, Network, Puzzle, GraduationCap, CircleHelp, FileText as SourceIcon } from 'lucide-react'
import type { KnowledgeNode } from '@/types'
import { useUniverseData } from '@/store/useAppStore'
import { askUniverse, generateMap, expandConcept, type ProposedMap } from '@/ai'
import { suggestConnections, findDuplicates, detectKnowledgeGaps, type ConnectionSuggestion } from '@/knowledge/discovery'
import { useAppStore } from '@/store/useAppStore'
import { Badge, Button, ConfidenceBar, EmptyState, Input, Select, SectionTitle, Tag } from '@/components/ui'
import { truncate } from '@/utils/text'
import { KIND_COLORS } from '@/services/factory'

type Message = { role: 'user' | 'assistant'; text: string; usedNodeIds?: string[]; engine?: string; error?: string }

export function AssistantPage() {
  const { nodes, connections } = useUniverseData()
  const addNodes = useAppStore((s) => s.addNodes)
  const addConnection = useAppStore((s) => s.addConnection)
  const mergeDuplicate = useAppStore((s) => s.mergeDuplicate)
  const addNode = useAppStore((s) => s.addNode)
  const prefs = useAppStore((s) => s.preferences)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [mapTopic, setMapTopic] = useState('')
  const [mapPreview, setMapPreview] = useState<ProposedMap | null>(null)
  const [selected, setSelected] = useState<string>('')
  const selectedNode = nodes.find((n) => n.id === selected)

  const connSuggestions = useMemo(() => suggestConnections(nodes, connections, 8), [nodes, connections])
  const duplicates = useMemo(() => findDuplicates(nodes), [nodes])
  const gaps = useMemo(() => (selectedNode ? detectKnowledgeGaps(nodes, selectedNode.title) : detectKnowledgeGaps(nodes, nodes[0]?.title ?? '')), [nodes, selectedNode])

  const send = async () => {
    const q = input.trim()
    if (!q) return
    setMessages((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setBusy('Thinking over your universe…')
    const res = await askUniverse(prefs, q, nodes, connections)
    const resError = 'error' in res ? (res as { error?: string }).error : undefined
    setMessages((m) => [...m, { role: 'assistant', text: res.answer, usedNodeIds: res.usedNodes.map((n) => n.id), engine: res.engine, error: resError }])
    setBusy(null)
  }

  const runGenerateMap = async () => {
    if (!mapTopic.trim()) return
    setBusy('Generating map skeleton…')
    const res = await generateMap(prefs, mapTopic.trim())
    setMapPreview(res.result)
    setBusy(null)
  }

  const runExpand = async () => {
    if (!selectedNode) return
    setBusy('Expanding concept…')
    const neighbors = connections.filter((c) => c.sourceId === selectedNode.id || c.targetId === selectedNode.id).length
    const siblings = nodes.filter((n) => n.id !== selectedNode.id).sort((a, b) => b.importance - a.importance).slice(0, 6)
    const res = await expandConcept(prefs, selectedNode, siblings)
    void neighbors
    for (const p of res.result) {
      const created = await addNodes([{ title: p.title, kind: 'concept', content: p.content, tags: p.tags, origin: 'ai' }])
      for (const c of created) await addConnection(c.id, selectedNode.id, (p.relation as never) ?? 'is-related-to', 'AI expansion suggestion')
    }
    setBusy(null)
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto border-r border-hair p-5">
        <h1 className="text-lg font-semibold">AI Assistant</h1>
        <p className="mb-4 text-xs text-ink-2">
          Answers first from your saved entries, then from model knowledge. Configure a provider in Settings — without one, the
          deterministic local engine is used and clearly labelled.
        </p>

        <div className="mb-4 rounded-xl border border-hair bg-panel p-3">
          <div className="mb-2 text-[11px] font-semibold tracking-widest text-ink-3 uppercase">Generate a knowledge map</div>
          <div className="flex gap-2">
            <Input placeholder='Topic, e.g. "The history of urban transportation"' value={mapTopic} onChange={(e) => setMapTopic(e.target.value)} />
            <Button variant="primary" onClick={() => void runGenerateMap()} disabled={!!busy}><Network size={14} /> Generate</Button>
          </div>
          {mapPreview && (
            <div className="animate-fade-in mt-3 rounded-md border border-hair bg-panel-2 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Badge color={mapPreview.engine === 'remote' ? '#3ecfa0' : '#e5b567'}>{mapPreview.engine === 'remote' ? 'AI provider' : 'local heuristic'}</Badge>
                <span className="text-[11px] text-ink-2">{truncate(mapPreview.explanation, 150)}</span>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {mapPreview.nodes.map((n) => (
                  <div key={n.title} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-panel-3">
                    <span className="max-w-[45%] truncate font-medium text-ink">{n.title}</span>
                    <span className="text-ink-3">→ {n.connectTo?.[0] ?? 'root'}</span>
                    <span className="ml-auto max-w-[40%] truncate text-ink-2">{truncate(n.content, 70)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="primary"
                  onClick={async () => {
                    const created = await addNodes(mapPreview.nodes.map((n) => ({ title: n.title, content: n.content, tags: n.tags, origin: 'ai' as const })))
                    const byTitle = new Map<string, KnowledgeNode>()
                    nodes.forEach((n) => byTitle.set(n.title, n))
                    created.forEach((n) => byTitle.set(n.title, n))
                    for (const n of mapPreview.nodes) {
                      const src = byTitle.get(n.title)
                      for (const target of n.connectTo ?? []) {
                        const dst = byTitle.get(target)
                        if (src && dst && src.id !== dst.id) await addConnection(src.id, dst.id, (n.relation as never) ?? 'is-related-to')
                      }
                    }
                    setMapPreview(null)
                    setMapTopic('')
                  }}
                >
                  Add all to universe
                </Button>
                <Button variant="ghost" onClick={() => setMapPreview(null)}>Discard</Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {messages.length === 0 && (
            <EmptyState
              icon={<CircleHelp size={32} />}
              title="Ask your knowledge universe"
              hint='Try: "What do I know about gentrification?" — answers always show which saved entries support them.'
            />
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-line ${
                m.role === 'user' ? 'self-end bg-accent text-white' : 'self-start border border-hair bg-panel text-ink'
              }`}
            >
              {m.text}
              {m.role === 'assistant' && m.usedNodeIds && m.usedNodeIds.length > 0 && (
                <div className="mt-2 border-t border-hair pt-2">
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                    <SourceIcon size={10} /> Supported by saved entries
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {m.usedNodeIds.map((id) => {
                      const n = nodes.find((x) => x.id === id)
                      if (!n) return null
                      return <Tag key={id} label={n.title} color={KIND_COLORS[n.kind]} />
                    })}
                  </div>
                </div>
              )}
              {m.role === 'assistant' && (m.engine || m.error) && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-ink-3">
                  {m.engine && <Badge color={m.engine === 'remote' ? '#3ecfa0' : '#e5b567'}>{m.engine === 'remote' ? 'provider' : 'local fallback'}</Badge>}
                  {m.error && <span>provider error: {truncate(m.error, 90)}</span>}
                </div>
              )}
            </div>
          ))}
          {busy && <div className="self-start rounded-xl border border-hair bg-panel px-4 py-2 text-xs text-ink-2">{busy}</div>}
        </div>

        <div className="sticky bottom-0 mt-4 flex gap-2 bg-app py-3">
          <Input
            placeholder="Ask something about your saved knowledge…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !busy && void send()}
          />
          <Button variant="primary" onClick={() => void send()} disabled={!!busy}>
            <Send size={14} />
          </Button>
        </div>
      </div>

      <div className="w-[360px] shrink-0 space-y-4 overflow-y-auto bg-panel p-4">
        <div>
          <SectionTitle right={<span className="text-[10px] text-ink-3">{connSuggestions.length}</span>}>
            Knowledge Discovery — hidden connections
          </SectionTitle>
          {connSuggestions.length === 0 && <div className="text-xs text-ink-3">Not enough overlapping material yet. Add tags and descriptions to more entries.</div>}
          {connSuggestions.map((s) => (
            <SuggestionCard
              key={`${s.sourceId}-${s.targetId}`}
              suggestion={s}
              nodes={nodes}
              onAccept={async () => {
                await addConnection(s.sourceId, s.targetId, s.type, s.explanation)
              }}
            />
          ))}
        </div>

        <div>
          <SectionTitle right={<span className="text-[10px] text-ink-3">{duplicates.length}</span>}>Possible duplicates</SectionTitle>
          {duplicates.length === 0 && <div className="text-xs text-ink-3">No likely duplicates detected.</div>}
          {duplicates.map((d) => {
            const keep = nodes.find((n) => n.id === d.keepId)
            const absorb = nodes.find((n) => n.id === d.absorbId)
            if (!keep || !absorb) return null
            return (
              <div key={`${d.keepId}-${d.absorbId}`} className="mb-2 rounded-md border border-hair bg-panel-2 p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{truncate(keep.title, 28)} <span className="text-ink-3">≈</span> {truncate(absorb.title, 28)}</span>
                  <ConfidenceBar value={d.score} />
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  <Button variant="primary" className="text-xs" onClick={() => void mergeDuplicate(d.keepId, d.absorbId)}>Merge</Button>
                  <span className="self-center text-[10px] text-ink-3">connections are preserved</span>
                </div>
              </div>
            )
          })}
        </div>

        <div>
          <SectionTitle right={<span className="text-[10px] text-ink-3">{gaps.length}</span>}>Knowledge gaps</SectionTitle>
          <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="mb-2 text-xs">
            <option value="">Analyze whole universe</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>Topic: {n.title}</option>)}
          </Select>
          {selectedNode && (
            <Button variant="outline" className="mb-2 w-full text-xs" onClick={() => void runExpand()} disabled={!!busy}>
              <Sparkles size={12} /> Expand "{truncate(selectedNode.title, 22)}"
            </Button>
          )}
          {gaps.map((g) => (
            <div key={g.standaloneTitle} className="mb-2 rounded-md border border-hair bg-panel-2 p-2.5 text-xs">
              <div className="font-medium text-ink">{g.standaloneTitle}</div>
              <div className="mt-0.5 text-ink-2">{g.reason}</div>
              <Button
                variant="outline"
                className="mt-1.5 text-xs"
                onClick={async () => {
                  await addNode(g.standaloneTitle, { content: g.reason, tags: [g.domain.split(' ')[0]], metadata: { origin: 'ai' } })
                }}
              >
                Add as concept
              </Button>
            </div>
          ))}
        </div>

        <div>
          <SectionTitle>Quiz from your entries</SectionTitle>
          <p className="mb-2 text-[11px] text-ink-2">Generate questions from your own notes — available in Learning Paths.</p>
          <Button variant="outline" className="text-xs" onClick={() => window.location.hash = '#learning'}>
            <GraduationCap size={13} /> Open Learning Paths
          </Button>
        </div>
      </div>
    </div>
  )
}

function SuggestionCard({
  suggestion, nodes, onAccept,
}: {
  suggestion: ConnectionSuggestion
  nodes: KnowledgeNode[]
  onAccept: () => Promise<void>
}) {
  const a = nodes.find((n) => n.id === suggestion.sourceId)
  const b = nodes.find((n) => n.id === suggestion.targetId)
  const [open, setOpen] = useState(false)
  if (!a || !b) return null
  return (
    <div className="mb-2 rounded-md border border-hair bg-panel-2 p-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <button className="min-w-0 flex-1 text-left font-medium text-ink" onClick={() => setOpen((o) => !o)}>
          {truncate(a.title, 22)} <span className="text-accent">↔</span> {truncate(b.title, 22)}
        </button>
        <ConfidenceBar value={suggestion.confidence} />
      </div>
      {open && (
        <div className="animate-fade-in mt-1.5 space-y-1.5 text-[11px] text-ink-2">
          <div>Suggested relation: <span className="text-accent">{suggestion.type.replace(/-/g, ' ')}</span></div>
          <div>{suggestion.explanation}</div>
          <div className="flex flex-wrap gap-1 text-ink-3">
            {suggestion.signals.map((s) => (
              <span key={s} className="rounded bg-panel px-1.5 py-0.5">{s}</span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-1.5 flex gap-1.5">
        <Button variant="primary" className="text-xs" onClick={() => void onAccept()}>Accept</Button>
        <Button variant="ghost" className="text-xs" onClick={() => setOpen((o) => !o)}>
          <Puzzle size={11} /> {open ? 'Hide' : 'Why?'}
        </Button>
      </div>
    </div>
  )
}
