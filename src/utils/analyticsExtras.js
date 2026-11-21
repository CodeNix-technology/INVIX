const sum = (a, f) => (a || []).reduce((s, x) => s + (f(x) || 0), 0)
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const pd = (v) => { if (!v) return null; const [y, m, d] = v.slice(0, 10).split('-').map(Number); return y && m && d ? new Date(y, m - 1, d) : null }
const td = (n) => new Date(n.getFullYear(), n.getMonth(), n.getDate())

export const EXPENSE_CATEGORIES = ['Software', 'Travel', 'Office', 'Marketing', 'Utilities', 'Salaries', 'Other']

export function expenseAnalytics(expenses = [], facts = [], payments = [], range = null) {
  const ex = (expenses || []).filter((e) => !range || (e.date >= range.from && e.date <= range.to))
  const total = sum(ex, (e) => e.amount)
  const byCategory = new Map()
  for (const e of ex) byCategory.set(e.category, (byCategory.get(e.category) || 0) + e.amount)
  const categories = [...byCategory.entries()]
    .map(([name, value]) => ({ name, value: r2(value) }))
    .sort((a, b) => b.value - a.value)
  const revenue = sum(facts.filter((f) => f.status !== 'draft'), (f) => f.total)
  const collected = sum(payments, (p) => p.amount)
  const profit = revenue - total
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0
  const rows = [
    { label: 'Revenue (invoiced)', value: r2(revenue), kind: 'income' },
    ...categories.map((c) => ({ label: c.name || 'Other', value: -c.value, kind: 'expense' })),
    { label: 'Net Profit', value: r2(profit), kind: profit >= 0 ? 'total-good' : 'total-bad' },
  ]
  return {
    total: r2(total), categories, revenue: r2(revenue), collected: r2(collected),
    profit: r2(profit), margin: r2(margin), rows, count: ex.length,
  }
}

export function goalProgress(goals = [], facts = [], now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const y = now.getFullYear(), m = now.getMonth() + 1
  const elapsedMonth = now.getDate() / new Date(y, m, 0).getDate()
  const elapsedYear = (now - new Date(y, 0, 1)) / (new Date(y + 1, 0, 1) - new Date(y, 0, 1))
  return (goals || []).map((g) => {
    let actual = 0, elapsed = elapsedMonth
    if (g.periodType === 'monthly') {
      const key = `${g.periodKey || `${y}-${pad(m)}`}`
      actual = sum(facts.filter((f) => f.status !== 'draft' && f.date.slice(0, 7) === key), (f) => f.total)
    } else {
      const key = String(g.periodKey || y)
      elapsed = elapsedYear
      actual = sum(facts.filter((f) => f.status !== 'draft' && f.date.slice(0, 4) === key), (f) => f.total)
    }
    const pct = g.target > 0 ? Math.min(100, (actual / g.target) * 100) : 0
    return { ...g, actual: r2(actual), pct: r2(pct), status: pct >= elapsed * 100 ? 'on-track' : 'behind' }
  })
}

export function generateInsights(ctx = {}) {
  const { cards = [], metrics = {}, monthly = [], highlights = {}, clients = {}, products = {}, payments = {}, expenses = {}, goals = [] } = ctx
  const out = []
  const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
  const revCard = cards.find((c) => c.key === 'revenue')
  if (revCard && Math.abs(revCard.change) >= 1) {
    out.push({
      id: 'revenue-trend', tone: revCard.change > 0 ? 'success' : 'danger', icon: 'trend',
      title: `Revenue ${revCard.change > 0 ? 'up' : 'down'} ${Math.abs(revCard.change).toFixed(1)}%`,
      text: `Compared with ${revCard.change > 0 ? 'the previous' : 'the previous'} period, revenue moved to ${money(metrics.revenue)}.`,
    })
  }
  const alerts = payments.alerts || []
  if (alerts.length) {
    const old = alerts.filter((a) => a.daysOverdue >= 30).length
    out.push({
      id: 'overdue', tone: 'danger', icon: 'alert',
      title: `${alerts.length} invoice${alerts.length > 1 ? 's' : ''} overdue`,
      text: old ? `${old} of them are 30+ days late. Send reminders to speed up collections.` : 'Send reminders to bring these payments in.',
      link: '/analytics?tab=payments',
    })
  }
  const top = (clients.top || [])[0]
  if (top && metrics.revenue > 0) {
    const share = (top.revenue / metrics.revenue) * 100
    if (share >= 15) out.push({
      id: 'concentration', tone: share >= 40 ? 'warning' : 'info', icon: 'users',
      title: `${top.name} drives ${share.toFixed(0)}% of revenue`,
      text: 'Diversifying your client base reduces concentration risk.', link: '/analytics?tab=clients',
    })
  }
  if (payments.avgDaysToPaid != null) out.push({
    id: 'payment-speed', tone: payments.avgDaysToPaid <= 15 ? 'success' : 'warning', icon: 'clock',
    title: `Average payment time: ${payments.avgDaysToPaid} days`,
    text: `On-time payment rate is ${payments.onTimeRate.toFixed(0)}%.`,
  })
  const behind = goals.filter((g) => g.status === 'behind')
  if (behind.length) out.push({
    id: 'goals', tone: 'warning', icon: 'target',
    title: `${behind.length} target${behind.length > 1 ? 's' : ''} behind schedule`,
    text: `You are at ${behind[0].pct.toFixed(0)}% of ${behind[0].periodType} target.`, link: '/analytics?tab=goals',
  })
  if (expenses.margin != null && metrics.revenue > 0) out.push({
    id: 'margin', tone: expenses.margin >= 30 ? 'success' : 'info', icon: 'wallet',
    title: `Profit margin: ${expenses.margin.toFixed(1)}%`,
    text: `Revenue ${money(expenses.revenue)} less expenses ${money(expenses.total)}.`,
  })
  const best = highlights.best
  if (best) out.push({
    id: 'best-month', tone: 'success', icon: 'chart',
    title: `Best month: ${best.label}`,
    text: `${money(best.invoiced)} invoiced — keep the momentum going.`,
  })
  return out.slice(0, 7)
}

export function buildNotifications(facts = [], payments = [], now = new Date()) {
  const today = td(now)
  const out = []
  for (const f of facts) {
    if (f.status === 'overdue' && f.daysOverdue > 0) out.push({
      id: `od-${f.id}`, type: 'danger', icon: 'alert', title: 'Payment overdue',
      text: `${f.number} · ${f.clientName} · ${f.daysOverdue}d late`, date: f.dueDate, href: `/builder/${f.id}`,
    })
    else if (f.dueDate && f.status !== 'paid' && f.status !== 'draft') {
      const d = pd(f.dueDate), days = d ? Math.round((d - today) / 86400000) : -1
      if (days >= 0 && days <= 7) out.push({
        id: `due-${f.id}`, type: 'warning', icon: 'clock', title: days === 0 ? 'Due today' : `Due in ${days} day${days > 1 ? 's' : ''}`,
        text: `${f.number} · ${f.clientName}`, date: f.dueDate, href: `/builder/${f.id}`,
      })
    }
  }
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 7)
  for (const p of payments) {
    const d = pd(p.date)
    if (d && d >= cutoff && d <= today) out.push({
      id: `pay-${p.id}`, type: 'success', icon: 'check', title: 'Payment received',
      text: `${p.clientName} · ${money0(p.amount)}`, date: p.date, href: `/builder/${p.invoiceId}`,
    })
  }
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 20)
}

function money0(n) {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0) } catch { return String(n || 0) }
}

