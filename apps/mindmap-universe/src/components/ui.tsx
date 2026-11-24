import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, useEffect } from 'react'
import { X } from 'lucide-react'

type Variant = 'primary' | 'ghost' | 'outline' | 'danger'

export function Button({
  children,
  variant = 'outline',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = 'inline-flex items-center gap-2 rounded-md text-sm px-3 py-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none'
  const styles: Record<Variant, string> = {
    primary: 'bg-accent text-white hover:brightness-110',
    ghost: 'text-ink-2 hover:text-ink hover:bg-panel-2',
    outline: 'border border-hair text-ink hover:bg-panel-2',
    danger: 'border border-transparent bg-bad/10 text-bad hover:bg-bad/20',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-hair bg-panel-2 px-3 py-1.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent ${className}`}
      {...rest}
    />
  )
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-md border border-hair bg-panel-2 px-3 py-1.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent ${className}`}
      {...rest}
    />
  )
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-md border border-hair bg-panel-2 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
}

export function Badge({ children, color, className = '' }: { children: ReactNode; color?: string; className?: string }) {
  const style = color
    ? { borderColor: `${color}55`, color, background: `${color}15` }
    : { color: 'var(--color-ink-2)', backgroundColor: 'var(--color-panel-3)' }
  return (
    <span className={`inline-flex items-center rounded-full border border-hair px-2 py-0.5 text-[11px] font-medium ${className}`} style={style}>
      {children}
    </span>
  )
}

export function Tag({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px]"
      style={color ? { background: `${color}18`, color } : { background: 'var(--color-panel-3)', color: 'var(--color-ink-2)' }}
    >
      {label}
    </span>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 pt-[8vh]" onMouseDown={onClose}>
      <div
        className={`animate-fade-in max-h-[80vh] w-full ${wide ? 'max-w-2xl' : 'max-w-xl'} overflow-y-auto rounded-xl border border-hair bg-panel shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-hair bg-panel px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button className="text-ink-3 hover:text-ink" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-ink-3">{icon}</div>}
      <div className="text-sm font-medium text-ink-2">{title}</div>
      {hint && <div className="max-w-md text-xs text-ink-3">{hint}</div>}
      {action}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[11px] font-semibold tracking-widest text-ink-3 uppercase">{children}</h2>
      {right}
    </div>
  )
}

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = value > 0.6 ? 'var(--color-good)' : value > 0.35 ? 'var(--color-warn)' : 'var(--color-ink-3)'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-panel-3">
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 5)}%`, background: color }} />
      </div>
      <span className="text-[11px] text-ink-3">{pct}%</span>
    </div>
  )
}
