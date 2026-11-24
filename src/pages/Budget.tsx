import { useMemo, useState } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts'
import { Save, Trash2, Download, Printer, FolderOpen } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import type { BudgetGroup } from '../types'
import { savingsRate, annualise, roundToCents } from '../lib/finance'
import { formatMoney, formatPct } from '../lib/currency'
import { downloadCsv, budgetToCsv } from '../lib/export'
import { Card, Button, Input, Select, Field, StatCard } from '../components/ui'

const COLORS = ['#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fbbf24', '#fb923c', '#f87171', '#a3e635', '#34d399', '#94a3b8', '#cbd5e1']

const DEFAULT_GROUPS: BudgetGroup[] = [
  {
    id: 'income', label: 'Income', income: true,
    lines: [
      { label: 'Net salary', amount: 2500 },
      { label: 'Freelance income', amount: 0 },
      { label: 'Investments', amount: 0 },
      { label: 'Other income', amount: 0 },
    ],
  },
  {
    id: 'housing', label: 'Housing', income: false,
    lines: [
      { label: 'Rent', amount: 780 },
      { label: 'Mortgage', amount: 0 },
      { label: 'Building fees', amount: 30 },
      { label: 'Home insurance', amount: 15 },
    ],
  },
  {
    id: 'food', label: 'Food', income: false,
    lines: [
      { label: 'Supermarket', amount: 280 },
      { label: 'Restaurants', amount: 120 },
      { label: 'Takeaway', amount: 60 },
    ],
  },
  {
    id: 'transport', label: 'Transport', income: false,
    lines: [
      { label: 'Public transport', amount: 40 },
      { label: 'Fuel', amount: 0 },
      { label: 'Car insurance', amount: 0 },
      { label: 'Vehicle maintenance', amount: 0 },
      { label: 'Parking', amount: 0 },
    ],
  },
  {
    id: 'utilities', label: 'Utilities', income: false,
    lines: [
      { label: 'Electricity', amount: 45 },
      { label: 'Heating', amount: 25 },
      { label: 'Water', amount: 20 },
      { label: 'Internet', amount: 30 },
      { label: 'Mobile phone', amount: 15 },
    ],
  },
  {
    id: 'lifestyle', label: 'Lifestyle', income: false,
    lines: [
      { label: 'Gym', amount: 40 },
      { label: 'Sports', amount: 15 },
      { label: 'Entertainment', amount: 60 },
      { label: 'Travel', amount: 80 },
      { label: 'Shopping', amount: 60 },
      { label: 'Subscriptions', amount: 25 },
    ],
  },
  {
    id: 'other', label: 'Other', income: false,
    lines: [
      { label: 'Healthcare', amount: 30 },
      { label: 'Education', amount: 0 },
      { label: 'Taxes (not deducted from income)', amount: 0 },
      { label: 'Unexpected expenses', amount: 50 },
    ],
  },
]

export default function Budget() {
  const store = useAppStore()
  const [groups, setGroups] = useState<BudgetGroup[]>(() => structuredClone(DEFAULT_GROUPS))
  const [name, setName] = useState('My budget')
  const [compareId, setCompareId] = useState('')

  const totals = useMemo(() => {
    const income = roundToCents(groups.filter((g) => g.income).flatMap((g) => g.lines).reduce((s, l) => s + (l.amount || 0), 0))
    const expenses = roundToCents(groups.filter((g) => !g.income).flatMap((g) => g.lines).reduce((s, l) => s + (l.amount || 0), 0))
    return {
      income,
      expenses,
      disposable: roundToCents(income - expenses),
      savings: roundToCents(income - expenses),
      rate: savingsRate(income, expenses),
      annualExpenses: annualise(expenses),
      annualSavings: annualise(income - expenses),
    }
  }, [groups])

  const distribution = useMemo(
    () =>
      groups
        .filter((g) => !g.income)
        .map((g) => ({
          name: g.label,
          value: Math.round(g.lines.reduce((s, l) => s + (l.amount || 0), 0) * 100) / 100,
        }))
        .filter((d) => d.value > 0),
    [groups],
  )

  const compareBudget = store.savedBudgets.find((b) => b.id === compareId)
  const compareTotals = useMemo(() => {
    if (!compareBudget) return null
    const income = compareBudget.groups.filter((g) => g.income).flatMap((g) => g.lines).reduce((s, l) => s + l.amount, 0)
    const expenses = compareBudget.groups.filter((g) => !g.income).flatMap((g) => g.lines).reduce((s, l) => s + l.amount, 0)
    return { income, expenses, disposable: income - expenses, rate: savingsRate(income, expenses) }
  }, [compareBudget])

  const setAmount = (groupId: string, lineIdx: number, value: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        const lines = g.lines.map((l, i) => (i === lineIdx ? { ...l, amount: Number(value.replace(/[^0-9.]/g, '')) || 0 } : l))
        return { ...g, lines }
      }),
    )
  }

  const save = () => {
    store.saveBudget({ name: name.trim() || 'Untitled budget', groups: structuredClone(groups) })
  }

  const current = store.displayCurrency

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-h1">⇲ Monthly Budget</h1>
          <p className="mt-1 text-sm muted">Build your personal budget with real figures you control. Currency: {current}.</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadCsv(`budget-${name.toLowerCase().replace(/\s+/g, '-')}.csv`, budgetToCsv({ id: 'x', name, createdAt: '', groups: structuredClone(groups) }))}
          >
            <Download size={13} /> Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={13} /> Print / PDF
          </Button>
          <Button size="sm" onClick={save}>
            <Save size={13} /> Save
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total monthly income" value={formatMoney(totals.income, current)} tone="positive" />
        <StatCard label="Total monthly expenses" value={formatMoney(totals.expenses, current)} tone="negative" />
        <StatCard
          label="Disposable income"
          value={formatMoney(totals.disposable, current)}
          tone={totals.disposable >= 0 ? 'positive' : 'negative'}
        />
        <StatCard label="Savings rate" value={formatPct(totals.rate)} tone={totals.rate >= 10 ? 'positive' : totals.rate >= 0 ? 'warning' : 'negative'} />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {groups.map((group) => (
            <Card key={group.id} title={group.label} right={<span className="text-xs font-bold tabular-nums">{formatMoney(group.lines.reduce((s, l) => s + l.amount, 0), current)}</span>}>
              <div className="space-y-2">
                {group.lines.map((line, i) => (
                  <div key={line.label} className="flex items-center gap-3">
                    <span className="flex-1 text-sm">{line.label}</span>
                    <Input
                      type="number"
                      min={0}
                      className="w-32 text-right"
                      value={line.amount}
                      onChange={(e) => setAmount(group.id, i, e.target.value)}
                      aria-label={`${line.label} amount`}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card title="Expense distribution">
            {distribution.length === 0 ? (
              <p className="text-sm muted">Enter expenses to see the distribution.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={1}>
                      {distribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip formatter={(v) => formatMoney(Number(v), current)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Annual view">
            <ul className="divide-y divide-slate-100 text-sm dark:divide-ink-800">
              <li className="flex justify-between py-2"><span>Annual expenditure</span><b className="tabular-nums">{formatMoney(totals.annualExpenses, current)}</b></li>
              <li className="flex justify-between py-2"><span>Annual savings</span><b className="tabular-nums">{formatMoney(totals.annualSavings, current)}</b></li>
            </ul>
          </Card>

          <Card title="Save & compare" subtitle="Budgets live in your browser storage">
            <Field label="Budget name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Button className="mt-3 w-full" onClick={save}>
              <Save size={14} /> Save this budget
            </Button>
            {store.savedBudgets.length > 0 && (
              <>
                <div className="mt-4">
                  <Field label="Compare with saved budget">
                    <Select value={compareId} onChange={(e) => setCompareId(e.target.value)}>
                      <option value="">— choose a saved budget —</option>
                      {store.savedBudgets.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                {compareTotals && (
                  <ul className="mt-3 divide-y divide-slate-100 text-xs dark:divide-ink-800">
                    <li className="flex justify-between py-1.5"><span>Their income</span><b className="tabular-nums">{formatMoney(compareTotals.income, current)}</b></li>
                    <li className="flex justify-between py-1.5"><span>Their expenses</span><b className="tabular-nums">{formatMoney(compareTotals.expenses, current)}</b></li>
                    <li className="flex justify-between py-1.5"><span>Their disposable</span><b className="tabular-nums">{formatMoney(compareTotals.disposable, current)}</b></li>
                    <li className="flex justify-between py-1.5"><span>Their savings rate</span><b className="tabular-nums">{formatPct(compareTotals.rate)}</b></li>
                  </ul>
                )}
              </>
            )}
            {store.savedBudgets.length > 0 && (
              <ul className="mt-4 space-y-1">
                {store.savedBudgets.map((b) => (
                  <li key={b.id} className="flex items-center justify-between rounded border border-slate-100 px-2 py-1.5 text-xs dark:border-ink-800">
                    <button className="font-semibold hover:text-accent-strong" onClick={() => { setGroups(structuredClone(b.groups)); setName(b.name) }}>
                      <FolderOpen size={12} className="mr-1 inline" />{b.name}
                    </button>
                    <button aria-label={`Delete ${b.name}`} className="text-negative" onClick={() => store.deleteBudget(b.id)}>
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {store.savedBudgets.length === 0 && (
              <p className="mt-3 text-xs muted">No saved budgets yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

