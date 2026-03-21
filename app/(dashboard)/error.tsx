'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--dash-bg-base)]" dir="rtl">
      <div className="text-center p-8 rounded-xl bg-[var(--dash-bg-surface)] max-w-md w-full mx-4">
        <div className="text-dash-accent-red text-5xl mb-4">⚠</div>
        <h2 className="text-xl font-bold text-[var(--dash-text-primary)] mb-2">حدث خطأ غير متوقع</h2>
        <p className="text-[var(--dash-text-muted)] mb-6 text-sm">
          نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 dash-btn-primary rounded-lg transition-colors font-medium"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  )
}
