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
    <div className="flex items-center justify-center min-h-screen bg-[#1F2937]" dir="rtl">
      <div className="text-center p-8 rounded-xl bg-[#2B3544] max-w-md w-full mx-4">
        <div className="text-red-400 text-5xl mb-4">⚠</div>
        <h2 className="text-xl font-bold text-white mb-2">حدث خطأ غير متوقع</h2>
        <p className="text-gray-400 mb-6 text-sm">
          نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  )
}
