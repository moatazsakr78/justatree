'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase/client'
import { useFormatPrice } from '@/lib/hooks/useCurrency'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface PeriodData {
  revenue: number
  grossProfit: number
  expenses: number
  netProfit: number
  salesCount: number
  expenseCount: number
}

interface DailyComparison {
  date: string
  revenue: number
  expenses: number
  profit: number
}

const PERIODS = [
  { type: 'month', label: 'هذا الشهر' },
  { type: '3months', label: '3 أشهر' },
  { type: 'year', label: 'السنة' },
]

export default function FinancialSummaryTab() {
  const formatPrice = useFormatPrice()
  const [period, setPeriod] = useState('month')
  const [current, setCurrent] = useState<PeriodData>({ revenue: 0, grossProfit: 0, expenses: 0, netProfit: 0, salesCount: 0, expenseCount: 0 })
  const [previous, setPrevious] = useState<PeriodData>({ revenue: 0, grossProfit: 0, expenses: 0, netProfit: 0, salesCount: 0, expenseCount: 0 })
  const [chartData, setChartData] = useState<DailyComparison[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const getDateRanges = useCallback((p: string) => {
    const now = new Date()
    let currentStart: Date, previousStart: Date, previousEnd: Date

    switch (p) {
      case 'month': {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
        previousEnd = new Date(currentStart.getTime() - 1)
        previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), 1)
        break
      }
      case '3months': {
        currentStart = new Date(now); currentStart.setMonth(now.getMonth() - 3)
        previousEnd = new Date(currentStart.getTime() - 1)
        previousStart = new Date(previousEnd); previousStart.setMonth(previousEnd.getMonth() - 3)
        break
      }
      case 'year': {
        currentStart = new Date(now.getFullYear(), 0, 1)
        previousEnd = new Date(currentStart.getTime() - 1)
        previousStart = new Date(previousEnd.getFullYear(), 0, 1)
        break
      }
      default: {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
        previousEnd = new Date(currentStart.getTime() - 1)
        previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), 1)
      }
    }

    return {
      currentStart: currentStart.toISOString(),
      currentEnd: now.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString(),
    }
  }, [])

  const fetchPeriodData = async (start: string, end: string): Promise<PeriodData> => {
    const [salesRes, expensesRes] = await Promise.all([
      supabase.from('sales').select('total_amount, profit').neq('status', 'cancelled').gte('created_at', start).lte('created_at', end),
      supabase.from('expenses').select('amount').eq('status', 'completed').gte('created_at', start).lte('created_at', end),
    ])

    const sales = (salesRes.data as any[]) || []
    const expenses = (expensesRes.data as any[]) || []

    const revenue = sales.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
    const grossProfit = sales.reduce((s, r) => s + (Number(r.profit) || 0), 0)
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)

    return {
      revenue,
      grossProfit,
      expenses: totalExpenses,
      netProfit: grossProfit - totalExpenses,
      salesCount: sales.length,
      expenseCount: expenses.length,
    }
  }

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const ranges = getDateRanges(period)

      const [curr, prev] = await Promise.all([
        fetchPeriodData(ranges.currentStart, ranges.currentEnd),
        fetchPeriodData(ranges.previousStart, ranges.previousEnd),
      ])

      setCurrent(curr)
      setPrevious(prev)

      // Build daily chart data for current period
      const [salesRes, expensesRes] = await Promise.all([
        supabase.from('sales').select('total_amount, profit, created_at').neq('status', 'cancelled').gte('created_at', ranges.currentStart).lte('created_at', ranges.currentEnd),
        supabase.from('expenses').select('amount, created_at').eq('status', 'completed').gte('created_at', ranges.currentStart).lte('created_at', ranges.currentEnd),
      ])

      const dailyMap: Record<string, { revenue: number; expenses: number; profit: number }> = {}

      for (const s of (salesRes.data as any[] || [])) {
        const day = new Date(s.created_at).toISOString().split('T')[0]
        if (!dailyMap[day]) dailyMap[day] = { revenue: 0, expenses: 0, profit: 0 }
        dailyMap[day].revenue += Number(s.total_amount) || 0
        dailyMap[day].profit += Number(s.profit) || 0
      }

      for (const e of (expensesRes.data as any[] || [])) {
        const day = new Date(e.created_at).toISOString().split('T')[0]
        if (!dailyMap[day]) dailyMap[day] = { revenue: 0, expenses: 0, profit: 0 }
        dailyMap[day].expenses += Number(e.amount) || 0
      }

      // Fill missing days
      const chart: DailyComparison[] = []
      const d = new Date(ranges.currentStart)
      const endDate = new Date(ranges.currentEnd)
      while (d <= endDate) {
        const key = d.toISOString().split('T')[0]
        const entry = dailyMap[key] || { revenue: 0, expenses: 0, profit: 0 }
        chart.push({ date: key, revenue: entry.revenue, expenses: entry.expenses, profit: entry.profit - entry.expenses })
        d.setDate(d.getDate() + 1)
      }
      setChartData(chart)

    } catch (error) {
      console.error('Error loading financial summary:', error)
    } finally {
      setIsLoading(false)
    }
  }, [period, getDateRanges])

  useEffect(() => { load() }, [load])

  const getChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }

  const profitMargin = current.revenue > 0 ? Math.round((current.netProfit / current.revenue) * 100) : 0

  if (isLoading) {
    return <div className="p-8 text-center text-[var(--dash-text-muted)]">جاري التحميل...</div>
  }

  return (
    <div className="p-4 space-y-4">
      {/* Period Selector */}
      <div className="flex gap-2">
        {PERIODS.map(opt => (
          <button key={opt.type} onClick={() => setPeriod(opt.type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              period === opt.type ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] border border-[var(--dash-border-subtle)]'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="إجمالي الإيرادات" value={formatPrice(current.revenue)} change={getChange(current.revenue, previous.revenue)} />
        <SummaryCard label="إجمالي المصروفات" value={formatPrice(current.expenses)} change={getChange(current.expenses, previous.expenses)} invertColor />
        <SummaryCard label="صافي الربح" value={formatPrice(current.netProfit)} change={getChange(current.netProfit, previous.netProfit)} accent={current.netProfit >= 0 ? 'green' : 'red'} />
        <SummaryCard label="هامش الربح" value={`${profitMargin}%`} subtitle={`${current.salesCount} عملية بيع`} />
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="bg-[var(--dash-bg-raised)] border border-[var(--dash-border-subtle)] rounded-xl p-4">
        <h4 className="text-sm font-semibold text-[var(--dash-text-primary)] mb-4">الإيرادات مقابل المصروفات</h4>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(v) => new Date(v).getDate().toString()} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3548', borderRadius: '8px', fontSize: '12px' }}
                labelFormatter={(label) => new Date(label).toLocaleDateString('ar-EG')}
                formatter={(value: any, name: any) => {
                  const labels: Record<string, string> = { revenue: 'الإيرادات', expenses: 'المصروفات', profit: 'الربح' }
                  return [formatPrice(value), labels[name] || name]
                }}
              />
              <Legend formatter={(value) => {
                const labels: Record<string, string> = { revenue: 'الإيرادات', expenses: 'المصروفات', profit: 'صافي الربح' }
                return labels[value] || value
              }} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f620" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef444420" strokeWidth={2} />
              <Area type="monotone" dataKey="profit" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-[var(--dash-text-muted)] text-sm">لا توجد بيانات</div>
        )}
      </div>

      {/* Comparison with previous period */}
      <div className="bg-[var(--dash-bg-raised)] border border-[var(--dash-border-subtle)] rounded-xl p-4">
        <h4 className="text-sm font-semibold text-[var(--dash-text-primary)] mb-3">مقارنة بالفترة السابقة</h4>
        <div className="grid grid-cols-3 gap-4">
          <ComparisonRow label="الإيرادات" current={current.revenue} previous={previous.revenue} format={formatPrice} />
          <ComparisonRow label="المصروفات" current={current.expenses} previous={previous.expenses} format={formatPrice} invert />
          <ComparisonRow label="صافي الربح" current={current.netProfit} previous={previous.netProfit} format={formatPrice} />
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, change, subtitle, accent, invertColor }: {
  label: string; value: string; change?: number; subtitle?: string; accent?: 'green' | 'red'; invertColor?: boolean
}) {
  const isPositive = invertColor ? (change || 0) < 0 : (change || 0) > 0
  return (
    <div className={`bg-[var(--dash-bg-raised)] border rounded-xl p-3 ${
      accent === 'green' ? 'border-green-500/30' : accent === 'red' ? 'border-red-500/30' : 'border-[var(--dash-border-subtle)]'
    }`}>
      <div className="text-xs text-[var(--dash-text-muted)] mb-1">{label}</div>
      <div className={`text-xl font-bold ${accent === 'green' ? 'text-green-400' : accent === 'red' ? 'text-red-400' : 'text-[var(--dash-text-primary)]'}`}>
        {value}
      </div>
      {change !== undefined && (
        <div className={`text-xs mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {change > 0 ? '▲' : '▼'} {Math.abs(change)}% عن الفترة السابقة
        </div>
      )}
      {subtitle && <div className="text-xs text-[var(--dash-text-muted)] mt-1">{subtitle}</div>}
    </div>
  )
}

function ComparisonRow({ label, current, previous, format, invert }: {
  label: string; current: number; previous: number; format: (n: number) => string; invert?: boolean
}) {
  const diff = current - previous
  const isPositive = invert ? diff < 0 : diff > 0
  return (
    <div className="text-center">
      <div className="text-xs text-[var(--dash-text-muted)] mb-1">{label}</div>
      <div className="text-sm font-semibold text-[var(--dash-text-primary)]">{format(current)}</div>
      <div className="text-xs text-[var(--dash-text-muted)] mt-0.5">سابقاً: {format(previous)}</div>
      <div className={`text-xs mt-0.5 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {diff > 0 ? '+' : ''}{format(diff)}
      </div>
    </div>
  )
}
