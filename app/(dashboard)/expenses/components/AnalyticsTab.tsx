'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase/client'
import { useFormatPrice } from '@/lib/hooks/useCurrency'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts'

interface CategoryBreakdown {
  name: string
  amount: number
  color: string
  count: number
}

interface DailyTrend {
  date: string
  amount: number
}

const PERIOD_OPTIONS = [
  { type: 'week', label: 'آخر أسبوع' },
  { type: 'month', label: 'هذا الشهر' },
  { type: '3months', label: '3 أشهر' },
  { type: 'year', label: 'السنة' },
]

export default function AnalyticsTab() {
  const formatPrice = useFormatPrice()
  const [period, setPeriod] = useState('month')
  const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([])
  const [trendData, setTrendData] = useState<DailyTrend[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const getDateRange = useCallback((p: string) => {
    const now = new Date()
    const end = now.toISOString()
    let start: string

    switch (p) {
      case 'week': {
        const d = new Date(now); d.setDate(d.getDate() - 7); start = d.toISOString(); break
      }
      case 'month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); break
      }
      case '3months': {
        const d = new Date(now); d.setMonth(d.getMonth() - 3); start = d.toISOString(); break
      }
      case 'year': {
        start = new Date(now.getFullYear(), 0, 1).toISOString(); break
      }
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    }
    return { start, end }
  }, [])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const { start, end } = getDateRange(period)

      // Fetch expenses with categories
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, category_id, created_at')
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end)

      // Fetch categories
      const { data: categories } = await supabase
        .from('expense_categories')
        .select('id, name, color')

      const catMap = Object.fromEntries((categories as any[] || []).map(c => [c.id, { name: c.name, color: c.color || '#6b7280' }]))

      // Category breakdown
      const catTotals: Record<string, { amount: number; count: number; name: string; color: string }> = {}
      const dailyTotals: Record<string, number> = {}

      for (const exp of (expenses as any[] || [])) {
        const cat = catMap[exp.category_id] || { name: 'بدون تصنيف', color: '#6b7280' }
        if (!catTotals[exp.category_id]) {
          catTotals[exp.category_id] = { amount: 0, count: 0, name: cat.name, color: cat.color }
        }
        catTotals[exp.category_id].amount += Number(exp.amount) || 0
        catTotals[exp.category_id].count += 1

        const day = new Date(exp.created_at).toISOString().split('T')[0]
        dailyTotals[day] = (dailyTotals[day] || 0) + (Number(exp.amount) || 0)
      }

      setCategoryData(
        Object.values(catTotals)
          .sort((a, b) => b.amount - a.amount)
          .map(c => ({ name: c.name, amount: c.amount, color: c.color, count: c.count }))
      )

      // Build trend data (fill missing days)
      const startDate = new Date(start)
      const endDate = new Date(end)
      const trend: DailyTrend[] = []
      const d = new Date(startDate)
      while (d <= endDate) {
        const key = d.toISOString().split('T')[0]
        trend.push({ date: key, amount: dailyTotals[key] || 0 })
        d.setDate(d.getDate() + 1)
      }
      setTrendData(trend)

    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [period, getDateRange])

  useEffect(() => { load() }, [load])

  const totalExpenses = categoryData.reduce((sum, c) => sum + c.amount, 0)

  if (isLoading) {
    return <div className="p-8 text-center text-[var(--dash-text-muted)]">جاري تحميل التحليلات...</div>
  }

  return (
    <div className="p-4 space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.type}
            onClick={() => setPeriod(opt.type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              period === opt.type
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-[var(--dash-bg-surface)] text-[var(--dash-text-muted)] border border-[var(--dash-border-subtle)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense Trend */}
        <div className="bg-[var(--dash-bg-raised)] border border-[var(--dash-border-subtle)] rounded-xl p-4">
          <h4 className="text-sm font-semibold text-[var(--dash-text-primary)] mb-4">اتجاه المصروفات</h4>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickFormatter={(v) => new Date(v).getDate().toString()} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3548', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value: any) => [formatPrice(value), 'المبلغ']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('ar-EG')}
                />
                <Area type="monotone" dataKey="amount" stroke="#ef4444" fill="#ef444420" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[var(--dash-text-muted)] text-sm">لا توجد بيانات</div>
          )}
        </div>

        {/* Category Breakdown (Pie) */}
        <div className="bg-[var(--dash-bg-raised)] border border-[var(--dash-border-subtle)] rounded-xl p-4">
          <h4 className="text-sm font-semibold text-[var(--dash-text-primary)] mb-4">توزيع حسب التصنيف</h4>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie data={categoryData as any[]} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3548', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: any) => [formatPrice(value), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.slice(0, 6).map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-[var(--dash-text-secondary)] truncate flex-1">{cat.name}</span>
                    <span className="text-xs text-[var(--dash-text-muted)]">
                      {totalExpenses > 0 ? Math.round((cat.amount / totalExpenses) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[var(--dash-text-muted)] text-sm">لا توجد بيانات</div>
          )}
        </div>

        {/* Top Categories Bar Chart */}
        <div className="bg-[var(--dash-bg-raised)] border border-[var(--dash-border-subtle)] rounded-xl p-4 lg:col-span-2">
          <h4 className="text-sm font-semibold text-[var(--dash-text-primary)] mb-4">أعلى التصنيفات إنفاقاً</h4>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#e5e7eb' }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3548', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any) => [formatPrice(value), 'المبلغ']}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {categoryData.slice(0, 8).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[var(--dash-text-muted)] text-sm">لا توجد بيانات</div>
          )}
        </div>
      </div>
    </div>
  )
}
