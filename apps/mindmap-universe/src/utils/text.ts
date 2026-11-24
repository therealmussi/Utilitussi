const STOPWORDS = new Set(
  `a an the and or but if then else when while of in on at to from by for with without within into onto over under above below between among through during before after is are was were be been being it its this that these those there their they them he she his her we our you your i my not no nor only own same so than too very can will just should now also does did doing done have has had having about after all almost also although always among any anyone anything around because been before being both but came cannot come could day did does doing done down each either enough even ever every few first for found from get give go had has have having he help her here him his how however i if in into is it its itself just keep know large last later least less let like likely made make many may me might mine more most much must my myself near need never new next no none nor not nothing now of off often on once one only or other others our ours out over own part per perhaps place please put rather really right said same say says see seem seen several she should show side since so some someone something still such sure take than that the their theirs them themselves then there therefore these they thing things think this those though through thus time to together too took toward under until up upon us use used uses using usually very want way we well went were what when where which while who whom whose why will wish with within without work world would year years yet you your`.split(
    /\s+/,
  ),
)

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z\u00e0-\u00fc][a-z\u00e0-\u00fc'-]+/g) ?? []
}

export function extractKeywords(text: string, max = 12): string[] {
  const counts = new Map<string, number>()
  const words = tokenize(text)
  for (const w of words) {
    if (w.length < 4 || STOPWORDS.has(w)) continue
    counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  if (words.length <= 6) {
    for (const w of words) {
      if (w.length >= 3 && !STOPWORDS.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([w]) => w)
}

export function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

export function truncate(s: string, max = 160): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let t: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}
