'use client'

import { useState } from 'react'
import {
  ReceiptPercentIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CalculatorIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import Sidebar from '../../components/layout/Sidebar'
import TopHeader from '../../components/layout/TopHeader'
import ExpensesTab from './components/ExpensesTab'
import RecurringTab from './components/RecurringTab'
import AnalyticsTab from './components/AnalyticsTab'
import FinancialSummaryTab from './components/FinancialSummaryTab'
import BudgetsTab from './components/BudgetsTab'
import type { RecurringExpense } from './services/expenseService'

const AddExpenseModal = dynamic(() => import('./components/AddExpenseModal'), { ssr: false })

type ExpenseTabType = 'expenses' | 'recurring' | 'analytics' | 'financial' | 'budgets'

const tabs: { id: ExpenseTabType; label: string; icon: typeof ReceiptPercentIcon }[] = [
  { id: 'expenses', label: 'المصروفات', icon: ReceiptPercentIcon },
  { id: 'recurring', label: 'المتكررة', icon: ArrowPathIcon },
  { id: 'analytics', label: 'التحليلات', icon: ChartBarIcon },
  { id: 'financial', label: 'ملخص مالي', icon: CalculatorIcon },
  { id: 'budgets', label: 'ميزانيات', icon: CurrencyDollarIcon },
]

export default function ExpensesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ExpenseTabType>('expenses')
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [expensePrefill, setExpensePrefill] = useState<any>(undefined)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'expenses':
        return <ExpensesTab onAddExpense={() => setIsAddExpenseModalOpen(true)} refreshTrigger={refreshTrigger} />
      case 'recurring':
        return <RecurringTab onGenerateExpense={(r: RecurringExpense) => {
          setExpensePrefill({
            amount: r.amount,
            description: r.description || r.name,
            categoryId: r.category_id,
            recordId: r.record_id,
            recurringExpenseId: r.id,
          })
          setIsAddExpenseModalOpen(true)
        }} />
      case 'analytics':
        return <AnalyticsTab />
      case 'financial':
        return <FinancialSummaryTab />
      case 'budgets':
        return <BudgetsTab />
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen bg-[var(--dash-bg-base)]">
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden pt-12">
        <TopHeader
          pageTitle="المصروفات"
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Tabs */}
        <div className="flex gap-0 px-4 bg-[var(--dash-bg-raised)] border-b border-[var(--dash-border-subtle)]">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-blue-400'
                    : 'text-[var(--dash-text-muted)] border-transparent hover:text-[var(--dash-text-secondary)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {renderTabContent()}
        </div>

        {/* Add button (floating) */}
        <button
          onClick={() => setIsAddExpenseModalOpen(true)}
          className="fixed bottom-6 left-6 bg-red-600 hover:bg-red-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors z-30"
          title="تسجيل مصروف جديد"
        >
          +
        </button>
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => { setIsAddExpenseModalOpen(false); setExpensePrefill(undefined) }}
        onSuccess={() => {
          setRefreshTrigger(prev => prev + 1)
        }}
        prefill={expensePrefill}
      />
    </div>
  )
}
