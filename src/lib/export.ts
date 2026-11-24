import type { SavedBudget } from '../types'

export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '')
          return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(','),
    )
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function budgetToCsv(budget: SavedBudget): (string | number)[][] {
  const rows: (string | number)[][] = [['Group', 'Line', 'Amount']]
  for (const g of budget.groups) {
    for (const l of g.lines) {
      rows.push([g.label, l.label, l.amount])
    }
  }
  return rows
}

export function currentUid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
