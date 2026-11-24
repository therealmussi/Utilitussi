import { useMemo, useState } from 'react'
import { Trash2, Link2, Sparkles, Star, MapPin, CalendarDays } from 'lucide-react'
import type { Connection, KnowledgeNode } from '@/types'
import { useAppStore } from '@/store/useAppStore'
import { KIND_COLORS, NODE_KINDS, DEFAULT_RELATIONS } from '@/services/factory'
import { Button, Input, Select, Textarea, Tag, SectionTitle } from '@/components/ui'
import { localExpand, type ProposedNode } from '@/ai'
import { truncate } from '@/utils/text'

export function NodePanel({
  node,
  nodes,
  connections,
  onClose,
  onFocus,
}: {
  node: KnowledgeNode
  nodes: KnowledgeNode[]
  connections: Connection[]
  onClose: () => void
  onFocus: (id: string) => void
}) {
  const updateNode = useAppStore((s) => s.updateNode)
  const deleteNode = useAppStore((s) => s.deleteNode)
  const addConnection = useAppStore((s) => s.addConnection)
  const updateConnection = useAppStore((s) => s.updateConnection)
  const deleteConnection = useAppStore((s) => s.deleteConnection)
  const addNodes = useAppStore((s) => s.addNodes)

  const [expanded, setExpanded] = useState<ProposedNode[]>([])
  const links = connections.filter((c) => c.sourceId === node.id || c.targetId === node.id)
  const titleById = useMemo(() => new Map(nodes.map((n) => [n.id, n.title])), [nodes])
  const color = KIND_COLORS[node.kind]

  return (
    <div className="flex h-full w-[330px] shrink-0 flex-col overflow-y-auto border-l border-hair bg-panel">
      <div className="border-b border-hair p-4" style={{ boxShadow: `inset 0 2px 0 ${color}` }}>
        <input
          className="w-full bg-transparent text-base font-semibold text-ink outline-none"
          value={node.title}
          onChange={(e) => void updateNode(node.id, { title: e.target.value })}
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Tag label={node.kind} color={color} />
          {node.tags.map((t) => (
            <Tag key={t} label={`#${t}`} />
          ))}
          <button
            className={`ml-auto rounded p-1 ${node.favorite ? 'text-warn' : 'text-ink-3 hover:text-ink'}`}
            onClick={() => void updateNode(node.id, { favorite: !node.favorite })}
            title="Favourite"
          >
            <Star size={14} fill={node.favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <SectionTitle right={<span className="text-[10px] text-ink-3">saved automatically</span>}>Content</SectionTitle>
          <Textarea rows={5} value={node.content} onChange={(e) => void updateNode(node.id, { content: e.target.value })} placeholder="Write what this concept means to you…" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-ink-3">
            Type
            <Select className="mt-1" value={node.kind} onChange={(e) => void updateNode(node.id, { kind: e.target.value as KnowledgeNode['kind'] })}>
              {NODE_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </Select>
          </label>
          <label className="text-[11px] text-ink-3">
            Importance
            <Select className="mt-1" value={String(node.importance)} onChange={(e) => void updateNode(node.id, { importance: Number(e.target.value) as 1 | 2 | 3 })}>
              <option value="1">Low</option>
              <option value="2">Normal</option>
              <option value="3">High</option>
            </Select>
          </label>
          <label className="text-[11px] text-ink-3">
            Tags (comma separated)
            <Input className="mt-1" value={node.tags.join(', ')} onChange={(e) => void updateNode(node.id, { tags: e.target.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) })} />
          </label>
          <label className="text-[11px] text-ink-3">
            Date (YYYY-MM-DD)
            <Input className="mt-1" type="date" value={node.metadata.date ?? ''} onChange={(e) => void updateNode(node.id, { metadata: { ...node.metadata, date: e.target.value || undefined } })} />
          </label>
          <label className="text-[11px] text-ink-3 col-span-1">
            Latitude
            <Input className="mt-1" type="number" step="any" value={node.metadata.lat ?? ''} onChange={(e) => void updateNode(node.id, { metadata: { ...node.metadata, lat: e.target.value === '' ? undefined : Number(e.target.value) } })} />
          </label>
          <label className="text-[11px] text-ink-3 col-span-1">
            Longitude
            <Input className="mt-1" type="number" step="any" value={node.metadata.lng ?? ''} onChange={(e) => void updateNode(node.id, { metadata: { ...node.metadata, lng: e.target.value === '' ? undefined : Number(e.target.value) } })} />
          </label>
        </div>

        <div>
          <SectionTitle right={<span className="text-[10px] text-ink-3">{links.length} links</span>}>Connections</SectionTitle>
          <div className="space-y-1.5">
            {links.length === 0 && <div className="text-xs text-ink-3">No connections yet. Use the graph to connect this node.</div>}
            {links.map((c) => {
              const otherId = c.sourceId === node.id ? c.targetId : c.sourceId
              const outgoing = c.sourceId === node.id
              return (
                <div key={c.id} className="rounded-md border border-hair bg-panel-2 p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <button className="min-w-0 flex-1 truncate text-left text-ink hover:text-accent" onClick={() => onFocus(otherId)}>
                      {outgoing ? '→' : '←'} {titleById.get(otherId) ?? 'unknown'}
                    </button>
                    <button className="text-ink-3 hover:text-bad" onClick={() => void deleteConnection(c.id)} title="Delete connection">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <Select
                      className="!py-0.5 text-[11px]"
                      value={c.type}
                      onChange={(e) => void updateConnection(c.id, { type: e.target.value })}
                    >
                      {[...new Set([c.type as string, ...DEFAULT_RELATIONS])].map((r) => (
                        <option key={r} value={r}>{r.replace(/-/g, ' ')}</option>
                      ))}
                    </Select>
                    <Input
                      className="!py-0.5 text-[11px]"
                      placeholder="explanation (optional)"
                      value={c.description}
                      onChange={(e) => void updateConnection(c.id, { description: e.target.value })}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <SectionTitle>AI suggestions</SectionTitle>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const neighbors = links.map((c) => nodes.find((n) => n.id === (c.sourceId === node.id ? c.targetId : c.sourceId))).filter((n): n is KnowledgeNode => !!n)
              setExpanded(localExpand(node, neighbors))
            }}
          >
            <Sparkles size={13} /> Expand this concept
          </Button>
          {expanded.map((p) => (
            <div key={p.title} className="mt-2 rounded-md border border-hair bg-panel-2 p-2 text-xs">
              <div className="font-medium text-ink">{p.title}</div>
              <div className="mt-0.5 text-ink-2">{truncate(p.content, 160)}</div>
              <div className="mt-1.5 flex gap-1.5">
                <Button
                  variant="primary"
                  className="text-xs"
                  onClick={async () => {
                    const created = await addNodes([{ title: p.title, kind: p.kind, content: p.content, tags: p.tags, origin: 'ai' }])
                    for (const c of created) {
                      const target = nodes.find((n) => n.title === (p.connectTo?.[0] ?? ''))
                      if (target) await addConnection(c.id, target.id, 'influences', 'suggested by local engine')
                    }
                    setExpanded((e) => e.filter((x) => x.title !== p.title))
                  }}
                >
                  Add
                </Button>
                <Button variant="ghost" onClick={() => setExpanded((e) => e.filter((x) => x.title !== p.title))}>Reject</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-hair pt-3 text-[10px] text-ink-3">
          <span className="flex items-center gap-1"><Link2 size={11} /> Created {new Date(node.createdAt).toLocaleDateString()}</span>
          {node.metadata.lat != null && node.metadata.lng != null && (
            <a
              className="flex items-center gap-1 hover:text-ink"
              href={`https://www.openstreetmap.org/?mlat=${node.metadata.lat}&mlon=${node.metadata.lng}#map=12/${node.metadata.lat}/${node.metadata.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={11} /> OSM
            </a>
          )}
          {node.metadata.date && (
            <span className="flex items-center gap-1">
              <CalendarDays size={11} /> {node.metadata.date}
            </span>
          )}
          <button className="text-bad hover:opacity-80" onClick={() => void deleteNode(node.id).then(onClose)}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}
