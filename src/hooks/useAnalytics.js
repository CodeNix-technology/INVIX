import { useMemo } from 'react'
import { useData } from '../store/data'
import {
  resolvePeriod, deriveComparison, inRange, buildFacts, collectPayments,
  computeKPIs, monthlyAnalytics, trendAnalytics, cumulativeSeries, salesHighlights,
  forecastSeries, fySummary, clientAnalytics, productAnalytics, paymentAnalytics,
  taxAnalytics, isoDay,
} from '../utils/analytics'
import { expenseAnalytics, goalProgress, generateInsights, buildNotifications } from '../utils/analyticsExtras'

/** One shared analytics computation used by the dashboard, analytics page and exports. */
export function useAnalytics({ periodId = 'thisMonth', compareMode = 'previous', custom = {}, granularity = 'monthly', periods = 12 } = {}) {
  const invoices = useData((s) => s.invoices)
  const items = useData((s) => s.items)
  const expenses = useData((s) => s.expenses)
  const goals = useData((s) => s.goals)
  const currency = useData((s) => s.settings.currency) || 'INR'
  const activeBusinessId = useData((s) => s.activeBusinessId)
  const todayKey = isoDay(new Date())

  const range = useMemo(() => resolvePeriod(periodId, new Date(), custom), [periodId, custom.from, custom.to, todayKey])
  const compare = useMemo(() => deriveComparison(range, compareMode), [range, compareMode])

  const allFacts = useMemo(() => buildFacts(invoices, activeBusinessId), [invoices, activeBusinessId])
  const allPayments = useMemo(() => collectPayments(invoices, activeBusinessId), [invoices, activeBusinessId])

  const facts = useMemo(() => allFacts.filter((f) => inRange(f.date, range)), [allFacts, range])
  const payments = useMemo(() => allPayments.filter((p) => inRange(p.date, range)), [allPayments, range])
  const compareFacts = useMemo(() => compare ? allFacts.filter((f) => inRange(f.date, compare)) : [], [allFacts, compare])
  const comparePayments = useMemo(() => compare ? allPayments.filter((p) => inRange(p.date, compare)) : [], [allPayments, compare])

  const kpis = useMemo(() => computeKPIs({ facts, payments, compareFacts, comparePayments, range, currency }), [facts, payments, compareFacts, comparePayments, range, currency])
  const monthly = useMemo(() => monthlyAnalytics(allFacts, allPayments, 12), [allFacts, allPayments])
  const trend = useMemo(() => trendAnalytics(allFacts, allPayments, granularity, periods), [allFacts, allPayments, granularity, periods])
  const cumulative = useMemo(() => cumulativeSeries(monthly), [monthly])
  const highlights = useMemo(() => salesHighlights(monthly, allFacts), [monthly, allFacts])
  const forecast = useMemo(() => forecastSeries(monthly, 3), [monthly])
  const fy = useMemo(() => fySummary(allFacts, allPayments), [allFacts, allPayments])
  const clients = useMemo(() => clientAnalytics(facts, payments), [facts, payments])
  const products = useMemo(() => productAnalytics(facts, items), [facts, items])
  const receivables = useMemo(() => paymentAnalytics(allFacts, allPayments), [allFacts, allPayments])
  const tax = useMemo(() => taxAnalytics(allFacts, 12), [allFacts])
  const expense = useMemo(() => expenseAnalytics(expenses, facts, payments, range), [expenses, facts, payments, range])
  const goalList = useMemo(() => goalProgress(goals, allFacts), [goals, allFacts])
  const notifications = useMemo(() => buildNotifications(allFacts, allPayments), [allFacts, allPayments])
  const insights = useMemo(() => generateInsights({
    cards: kpis.cards,
    metrics: kpis.metrics,
    monthly,
    highlights,
    clients,
    products,
    payments: receivables,
    expenses: expense,
    goals: goalList,
  }), [kpis, monthly, highlights, clients, products, receivables, expense, goalList])

  return {
    range, compare, kpis, allFacts, allPayments, facts, payments,
    monthly, trend, cumulative, highlights, forecast, fy,
    clients, products, receivables, tax, expense, goals: goalList,
    notifications, insights, currency,
  }
}
