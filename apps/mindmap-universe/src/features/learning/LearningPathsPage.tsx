import { useMemo, useState } from 'react'
import { Route, Plus, Trash2, CheckCircle2, CircleDashed, CircleDot, RefreshCcw, Play } from 'lucide-react'
import type { LearningPath, LearningStatus } from '@/types'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore, useUniverseData } from '@/store/useAppStore'
import { climbPathOrder, generateQuiz, type QuizQuestion } from '@/ai/localEngine'
import { Button, Input, Select, EmptyState, Modal, SectionTitle } from '@/components/ui'
import { truncate } from '@/utils/text'
import { KIND_COLORS } from '@/services/factory'

const STATUS_META: Record<LearningStatus, { label: string; icon: React.ReactNode; color: string }> = {
  'not-started': { label: 'Not started', icon: <CircleDashed size={13} />, color: 'var(--color-ink-3)' },
  'in-progress': { label: 'In progress', icon: <CircleDot size={13} />, color: 'var(--color-warn)' },
  understood: { label: 'Understood', icon: <CheckCircle2 size={13} />, color: 'var(--color-good)' },
  'needs-revision': { label: 'Needs revision', icon: <RefreshCcw size={13} />, color: 'var(--color-bad)' },
}

export function LearningPathsPage() {
  const { nodes, connections } = useUniverseData()
  const paths = useAppStore(useShallow((s) => s.learningPaths.filter((p) => p.universeId === s.activeUniverseId)))
  const createLearningPath = useAppStore((s) => s.createLearningPath)
  const saveLearningPath = useAppStore((s) => s.saveLearningPath)
  const setLearningStatus = useAppStore((s) => s.setLearningStatus)
  const deleteLearningPath = useAppStore((s) => s.deleteLearningPath)

  const [openPathId, setOpenPathId] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)

  const path = paths.find((p) => p.id === openPathId)
  const pathNodes = useMemo(
    () => (path ? path.itemIds.map((id) => nodes.find((n) => n.id === id)).filter((n): n is NonNullable<typeof n> => !!n) : []),
    [path, nodes],
  )
  const progress = path ? Math.round((pathNodes.filter((n) => path.items[n.id]?.status === 'understood').length / Math.max(pathNodes.length, 1)) * 100) : 0

  if (path && quiz) {
    const q = quiz[quizIndex]
    const finished = quizIndex >= quiz.length
    return (
      <div className="mx-auto max-w-2xl overflow-y-auto p-6">
        <h1 className="text-lg font-semibold">Quiz: {path.title}</h1>
        <p className="mb-4 text-xs text-ink-2">Generated from your own entries.</p>
        {!finished ? (
          <div className="rounded-lg border border-hair bg-panel p-4">
            <div className="mb-1 text-[10px] text-ink-3">Question {quizIndex + 1} of {quiz.length}</div>
            <div className="mb-3 text-sm">{q.question}</div>
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const state = quizAnswer === null ? 'idle' : i === q.answerIndex ? 'correct' : i === quizAnswer ? 'wrong' : 'idle'
                return (
                  <button
                    key={i}
                    disabled={quizAnswer !== null}
                    className={`w-full rounded-md border p-2.5 text-left text-sm ${
                      state === 'correct' ? 'border-good text-good' : state === 'wrong' ? 'border-bad text-bad' : 'border-hair text-ink hover:border-accent'
                    }`}
                    onClick={() => setQuizAnswer(i)}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            {quizAnswer !== null && (
              <Button
                variant="primary"
                className="mt-3"
                onClick={() => {
                  setQuizIndex((i) => i + 1)
                  setQuizAnswer(null)
                }}
              >
                Next
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-hair bg-panel p-4 text-sm">
            Quiz completed — score recorded in this session only. Use "Needs revision" on path items you keep missing.
            <Button variant="outline" className="mt-3" onClick={() => { setQuiz(null); setQuizIndex(0); setQuizAnswer(null) }}>Back to path</Button>
          </div>
        )}
      </div>
    )
  }

  if (path) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mb-1 flex items-center gap-3">
          <Button variant="ghost" onClick={() => setOpenPathId(null)}>All paths</Button>
          <h1 className="text-lg font-semibold">{path.title}</h1>
          <Button variant="outline" className="text-xs" disabled={pathNodes.length < 3} onClick={() => setQuiz(generateQuiz(pathNodes, 8))}>
            <Play size={12} /> Generate quiz
          </Button>
        </div>
        <p className="mb-4 text-xs text-ink-2">{path.description}</p>
        <div className="mb-5">
          <div className="mb-1 flex justify-between text-[11px] text-ink-3">
            <span>{progress}% understood · {pathNodes.length} concepts</span>
            <span>{pathNodes.filter((n) => path.items[n.id]?.status === 'needs-revision').length} need revision</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-panel-3">
            <div className="h-full rounded-full bg-good transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="relative">
          <div className="absolute top-0 bottom-0 left-[7px] w-px bg-hair" />
          {pathNodes.map((n, i) => {
            const status = path.items[n.id]?.status ?? 'not-started'
            const meta = STATUS_META[status]
            return (
              <div key={n.id} className="relative pl-8">
                <div className="absolute top-4 left-0" style={{ color: meta.color }}>{meta.icon}</div>
                <div className="mb-3 rounded-lg border border-hair bg-panel p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-ink-3">#{i + 1}</span>
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="rounded bg-panel-3 px-1.5 py-0.5 text-[10px]" style={{ color: KIND_COLORS[n.kind] }}>{n.kind}</span>
                    <Select className="ml-auto !w-40 text-xs" value={status} onChange={(e) => void setLearningStatus(path.id, n.id, e.target.value as LearningStatus)}>
                      <option value="not-started">Not started</option>
                      <option value="in-progress">In progress</option>
                      <option value="understood">Understood</option>
                      <option value="needs-revision">Needs revision</option>
                    </Select>
                  </div>
                  {n.content && <div className="mt-1 text-xs text-ink-2">{truncate(n.content, 220)}</div>}
                </div>
              </div>
            )
          })}
        </div>
        {pathNodes.length === 0 && <div className="text-xs text-ink-3">This path has no concepts yet. Recreate it from a root node.</div>}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="text-lg font-semibold">Learning Paths</h1>
      <p className="mb-4 text-xs text-ink-2">
        Pick a root concept: the path is ordered from the root outward through your real connections, so prerequisites come first.
      </p>

      {paths.length === 0 && (
        <EmptyState icon={<Route size={36} />} title="No learning path yet" hint="Paths are built from your actual graph, not a generic curriculum." />
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {paths.map((p) => {
          const total = p.itemIds.length
          const done = p.itemIds.filter((id) => p.items[id]?.status === 'understood').length
          return (
            <div key={p.id} className="group rounded-lg border border-hair bg-panel p-4">
              <div className="flex items-start justify-between">
                <button className="text-left" onClick={() => setOpenPathId(p.id)}>
                  <div className="text-sm font-semibold">{p.title}</div>
                  <div className="mt-0.5 text-xs text-ink-2">{p.description || 'Custom path'}</div>
                </button>
                <button className="text-ink-3 opacity-0 group-hover:opacity-100 hover:text-bad" onClick={() => void deleteLearningPath(p.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel-3">
                <div className="h-full rounded-full bg-good" style={{ width: `${Math.round((done / Math.max(total, 1)) * 100)}%` }} />
              </div>
              <div className="mt-1.5 text-[10px] text-ink-3">{done}/{total} concepts understood</div>
            </div>
          )
        })}
      </div>

      <PathCreator onCreate={async (title, description, rootId) => {
        const p = await createLearningPath(title, description)
        const ordered = climbPathOrder(rootId, nodes, connections).map((n) => n.id)
        await saveLearningPath({ ...p, itemIds: ordered, items: Object.fromEntries(ordered.map((id) => [id, { status: 'not-started' as LearningStatus }])) })
        setOpenPathId(p.id)
      }} />
    </div>
  )
}

function PathCreator({ onCreate }: { onCreate: (title: string, description: string, rootId: string) => Promise<void> }) {
  const nodes = useUniverseData().nodes
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button className="mt-4" variant="primary" onClick={() => setOpen(true)}><Plus size={14} /> New learning path</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New learning path">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const rootId = String(fd.get('root'))
            if (!rootId) return
            setOpen(false)
            await onCreate(String(fd.get('title')), String(fd.get('description')), rootId)
          }}
        >
          <Input name="title" placeholder="Path title" required />
          <Input name="description" placeholder='Goal, e.g. "Understand urban planning from beginner to advanced"' />
          <Select name="root" required defaultValue="">
            <option value="" disabled>Root concept — where you start from</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
          </Select>
          <div>
            <SectionTitle>How the order is computed</SectionTitle>
            <p className="text-[11px] text-ink-2">
              Breadth-first traversal of your saved connections, starting from the chosen root. Items closest to the root are treated as prerequisites;
              more advanced or peripheral concepts come later.
            </p>
          </div>
          <Button type="submit" variant="primary" className="w-full">Build path</Button>
        </form>
      </Modal>
    </>
  )
}
