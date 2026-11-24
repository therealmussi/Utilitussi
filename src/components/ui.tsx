import { forwardRef, type ReactNode } from 'react'
import type { Confidence, SourceInfo } from '../types'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', ...rest }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50'
    const sizes = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
    const variants = {
      primary: 'bg-accent-strong text-ink-950 hover:bg-accent dark:text-ink-950',
      secondary:
        'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-ink-800 dark:text-slate-100 dark:hover:bg-ink-700',
      ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-800',
      danger: 'bg-negative-soft text-negative hover:bg-negative/20 border border-negative/30',
    }
    return <button ref={ref} className={`${base} ${sizes} ${variants[variant]} ${className}`} {...rest} />
  },
)
Button.displayName = 'Button'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 ' +
        'focus:border-accent-strong focus:outline-none focus:ring-1 focus:ring-accent-strong ' +
        'dark:border-ink-600 dark:bg-ink-850 dark:text-slate-100 dark:placeholder-slate-500 ' +
        props.className
      }
      {...props}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={
        'w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
        'focus:border-accent-strong focus:outline-none focus:ring-1 focus:ring-accent-strong ' +
        'dark:border-ink-600 dark:bg-ink-850 dark:text-slate-100 ' +
        props.className
      }
      {...props}
    />
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs muted">{hint}</p> : null}
    </div>
  )
}

export function Card({
  title,
  subtitle,
  right,
  children,
  className = '',
}: {
  title?: string
  subtitle?: string
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-ink-800 sm:px-5">
          <div>
            {title && (
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs muted">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="panel-pad">{children}</div>
    </section>
  )
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'neutral',
  icon,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'neutral' | 'positive' | 'negative' | 'warning' | 'accent'
  icon?: ReactNode
}) {
  const tones = {
    neutral: 'text-slate-900 dark:text-white',
    positive: 'text-positive',
    negative: 'text-negative',
    warning: 'text-warning',
    accent: 'text-accent',
  }
  return (
    <div className="panel panel-pad">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide muted">{label}</p>
        {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-extrabold tracking-tight ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs muted">{sub}</p>}
    </div>
  )
}

const CONFIDENCE_STYLES: Record<Confidence, string> = {
  HIGH: 'bg-positive-soft text-positive border-positive/30',
  MEDIUM: 'bg-warning-soft text-warning border-warning/30',
  LOW: 'bg-negative-soft text-negative border-negative/30',
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span
      title={
        confidence === 'HIGH'
          ? 'High: official or well-documented data with strong coverage'
          : confidence === 'MEDIUM'
            ? 'Medium: aggregated or crowdsourced data with sufficient observations'
            : 'Low: limited observations, dated or approximate estimates — verify before deciding'
      }
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${CONFIDENCE_STYLES[confidence]}`}
    >
      {confidence}
    </span>
  )
}

export function SourceNote({ source, link }: { source?: SourceInfo; link?: string }) {
  if (!source) return null
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] muted">
      <ConfidenceBadge confidence={source.confidence} />
      <span>
        {source.kind} · source: {source.name} · reference date {source.referenceDate}
      </span>
      {link && (
        <a
          className="font-semibold text-accent-strong underline-offset-2 hover:underline"
          href={link}
          target="_blank"
          rel="noreferrer noopener"
        >
          verify ↗
        </a>
      )}
    </p>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-ink-600">
      {icon && <div className="mb-3 text-slate-300 dark:text-ink-500">{icon}</div>}
      <p className="font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-1 max-w-md text-sm muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Banner({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'error' | 'success'
  children: ReactNode
}) {
  const tones = {
    info: 'border-accent/30 bg-accent-soft text-slate-700 dark:text-slate-200',
    warning: 'bg-warning-soft border-warning/30 text-slate-700 dark:text-slate-200',
    error: 'bg-negative-soft border-negative/30 text-slate-700 dark:text-slate-200',
    success: 'bg-positive-soft border-positive/30 text-slate-700 dark:text-slate-200',
  }
  return <div className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${tones[tone]}`}>{children}</div>
}

export function OutcomeBadge({
  outcome,
  children,
}: {
  outcome: 'better' | 'equivalent' | 'worse'
  children: ReactNode
}) {
  const styles = {
    better: 'bg-positive-soft text-positive border-positive/30',
    equivalent: 'bg-warning-soft text-warning border-warning/30',
    worse: 'bg-negative-soft text-negative border-negative/30',
  }
  return (
    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${styles[outcome]}`}>
      {children}
    </span>
  )
}

export function Flag({ code, size = 'text-2xl' }: { code: string; size?: string }) {
  return (
    <span className={size} role="img" aria-label={`Flag of ${code}`} title={code}>
      {code
        .toUpperCase()
        .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))}
    </span>
  )
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex cursor-help items-center">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-normal normal-case leading-relaxed text-slate-700 opacity-0 shadow-card transition-opacity group-hover:opacity-100 dark:border-ink-600 dark:bg-ink-850 dark:text-slate-300"
      >
        {text}
      </span>
    </span>
  )
}
