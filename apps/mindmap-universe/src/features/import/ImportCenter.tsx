import { useMemo, useRef, useState } from 'react'
import { ClipboardType, FileUp, FileText, Globe, Upload, Ban, CheckSquare, Square } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { extractKeywords, truncate } from '@/utils/text'
import { Button, Input, Modal, SectionTitle, Tag, EmptyState } from '@/components/ui'
import { localGenerateMap } from '@/ai'
import { Textarea } from '@/components/ui'

interface DraftItem {
  title: string
  content: string
  tags: string[]
  tempImported: boolean
}

export function ImportCenter() {
  const addNodes = useAppStore((s) => s.addNodes)
  const addSource = useAppStore((s) => s.addSource)
  const [source, setSource] = useState<'text' | 'url' | 'document' | null>('text')
  const [url, setUrl] = useState('')
  const [textContent, setTextContent] = useState('')
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [accepted, setAccepted] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileName = useRef('')

  const preview = useMemo(() => {
    const text = url ? `[Web page] ${url}\n\n${textContent}` : textContent
    if (!text.trim()) return []
    const keywords = extractKeywords(text, 18)
    const map = localGenerateMap(keywords[0] ?? 'New topic')
    const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 30)
    const items: DraftItem[] = []
    for (const kw of keywords.slice(0, 8)) {
      const supporting = sentences.filter((s) => s.toLowerCase().includes(kw))
      items.push({
        title: kw,
        content: supporting.length > 0 ? supporting.slice(0, 3).join(' ') : `Extracted concept from imported material "${truncate(fileName.current || (url || 'pasted text'), 60)}".`,
        tags: [],
        tempImported: true,
      })
    }
    if (items.length === 0 && text.trim()) {
      items.push({ title: truncate(text.trim().split(/\s+/).slice(0, 8).join(' '), 40), content: text, tags: [], tempImported: true })
    }
    return items
  }, [textContent, url])

  const accept = async () => {
    const picked = preview
      .map((p, i) => drafts[i] ? { ...p, ...drafts[i] } : p)
      .filter((_, i) => selected.has(i))
    if (picked.length === 0) return
    await addNodes(picked.map((p) => ({ title: p.title, content: p.content, tags: p.tags, origin: 'import' as const })))
    if (url || fileName.current) {
      await addSource(url || fileName.current, {
        title: url ? truncate(url, 80) : fileName.current,
        type: url ? 'web' : 'document',
        url,
        origin: 'import',
        notes: `Imported ${picked.length} concepts on ${new Date().toLocaleDateString()}.`,
      })
    }
    setAccepted((a) => a + picked.length)
    setDrafts([])
    setSelected(new Set())
    setTextContent('')
    setUrl('')
  }

  const readFile = async (file: File) => {
    fileName.current = file.name
    let text = ''
    if (/\.(txt|md|markdown|csv)$/i.test(file.name) || file.type.startsWith('text') || file.type === 'application/json') {
      text = await file.text()
    } else if (/\.docx$/i.test(file.name)) {
      const arrayBuf = await file.arrayBuffer()
      text = extractDocxText(arrayBuf)
    } else if (/\.pdf$/i.test(file.name)) {
      const arrayBuf = await file.arrayBuffer()
      text = extractPdfText(arrayBuf)
    } else if (file.type.startsWith('image/')) {
      text = `Image file "${file.name}". Vision extraction requires a configured vision model — add a note describing the image instead.`
    } else {
      text = ''
    }
    setTextContent(text)
    setSource('document')
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="text-lg font-semibold">Import Center</h1>
      <p className="mb-4 text-xs text-ink-2">
        Import from text, URLs or documents. Nothing enters the graph automatically: everything goes through the review stage below.
      </p>

      {url && !textContent && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-warn bg-warn/10 p-3 text-xs text-ink-2">
          <Ban size={14} className="text-warn" />
          Content extraction from the web needs a backend or extraction service (see AI settings). Paste the page text manually below to continue.
        </div>
      )}

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <ImportCard icon={<ClipboardType size={18} />} title="Paste text" active={source === 'text'} onClick={() => setSource('text')} />
        <ImportCard icon={<Globe size={18} />} title="Web URL" active={source === 'url'} onClick={() => { setSource('url') }} />
        <ImportCard icon={<FileText size={18} />} title="Document" active={source === 'document'} onClick={() => fileRef.current?.click()} />
        <ImportCard icon={<Upload size={18} />} title="Note" active={false} onClick={() => setSource('text')} />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.txt,.md,.markdown,.csv,.docx,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void readFile(f)
        }}
      />

      {(source === 'text' || source === 'document') && (
        <div className="mb-5 rounded-lg border border-hair bg-panel p-3">
          <SectionTitle right={<span className="text-[10px] text-ink-3">{textContent.length} chars</span>}>
            {source === 'document' ? `Document: ${fileName.current || 'none loaded'}` : 'Paste or write text'}
          </SectionTitle>
          <Textarea rows={8} value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Paste an article, essay, class notes…" />
          <div className="mt-2"><Input placeholder="Source URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} /></div>
        </div>
      )}

      {source === 'url' && !textContent && (
        <div className="rounded-lg border border-hair bg-panel p-3">
          <Input placeholder="https://example.com/article" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      )}

      <div className="mb-2 mt-4 flex items-center justify-between">
        <SectionTitle>Review preview — {preview.length} extracted concepts</SectionTitle>
        {preview.length > 0 && (
          <div className="mb-3 flex gap-2">
            <Button variant="outline" onClick={() => setSelected(new Set(preview.map((_, i) => i)))}>
              <CheckSquare size={13} /> Select all
            </Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}><Square size={13} /></Button>
            <Button variant="primary" onClick={() => void accept()}>Import {selected.size} concepts</Button>
          </div>
        )}
      </div>

      {preview.length === 0 ? (
        <EmptyState icon={<FileUp size={32} />} title="Nothing to review yet" hint="Paste text or load a document above. Each extracted concept can be accepted, rejected or edited before saving." />
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {preview.map((d, i) => (
            <div key={i} className={`rounded-md border p-2.5 ${selected.has(i) ? 'border-accent bg-accent-soft' : 'border-hair bg-panel'}`}>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selected.has(i)} onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })} />
                <Input
                  value={d.title}
                  onChange={(e) => setDrafts((ds) => ds.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  className="!py-0.5 text-xs"
                />
              </div>
              <div className="mt-1.5 text-[11px] text-ink-2">{truncate(d.content, 180)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 text-[11px] text-ink-3">
        <FileUp size={12} /> {accepted} concepts imported so far in this session. Supported formats: PDF (raw text), TXT, Markdown, CSV, DOCX (basic extraction), images (with vision model note).
      </div>
    </div>
  )
}

function ImportCard({ icon, title, active, onClick }: { icon: React.ReactNode; title: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-3 text-left text-sm transition-colors ${active ? 'border-accent bg-accent-soft text-ink' : 'border-hair bg-panel text-ink-2 hover:border-accent hover:text-ink'}`}
    >
      <div className="mb-1">{icon}</div>
      {title}
    </button>
  )
}

function extractDocxText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let text = ''
  let i = 0
  const decoder = new TextDecoder('utf-8', { fatal: false })
  const raw = bytes.length > 3_000_000 ? null : decoder.decode(buffer)
  if (raw) {
    const xml = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    const matches = xml.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/g)
    for (const m of matches) text += `${m[1]} `
  } else {
    while (i < bytes.length) {
      i += 1
    }
  }
  return text.trim()
}

function extractPdfText(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('latin1')
  const raw = decoder.decode(buffer)
  const out: string[] = []
  const chunks = raw.matchAll(/\(((?:\\.|[^()\\])*)\)/g)
  for (const c of chunks) {
    const t = c[1].replace(/\\/g, '')
    if (t.trim().length > 1) out.push(t)
  }
  return out.join(' ').trim()
}
