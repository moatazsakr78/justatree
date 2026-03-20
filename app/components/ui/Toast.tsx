'use client'

import { useEffect, useState } from 'react'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface ToastProps {
  message: string
  isVisible: boolean
  onClose: () => void
  type?: 'success' | 'error' | 'info'
  duration?: number
}

export default function Toast({
  message,
  isVisible,
  onClose,
  type = 'success',
  duration = 3000
}: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible) return null

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-[var(--dash-bg-raised)] border-[var(--dash-accent-green)] text-[var(--dash-text-primary)]'
      case 'error':
        return 'bg-[var(--dash-bg-raised)] border-[var(--dash-accent-red)] text-[var(--dash-text-primary)]'
      case 'info':
        return 'bg-[var(--dash-bg-raised)] border-[var(--dash-accent-blue)] text-[var(--dash-text-primary)]'
      default:
        return 'bg-[var(--dash-bg-raised)] border-[var(--dash-accent-green)] text-[var(--dash-text-primary)]'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-200" />
      case 'error':
        return <XMarkIcon className="h-5 w-5 text-red-200" />
      case 'info':
        return <CheckCircleIcon className="h-5 w-5 text-blue-200" />
      default:
        return <CheckCircleIcon className="h-5 w-5 text-green-200" />
    }
  }

  return (
    <div className="fixed top-4 right-4 z-[100]">
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-dash-md border-r-[3px] border-y-0 border-l-0 shadow-dash-lg backdrop-blur-sm
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getToastStyles()}
        min-w-[250px] max-w-[400px]
      `}>
        {getIcon()}
        <span className="text-sm font-medium flex-1 text-right">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}