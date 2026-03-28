'use client'

import { useState, useEffect, useRef } from 'react'
import { Shape } from '../../lib/hooks/useShapes'

interface ShapeModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, imageUrl?: string | null) => Promise<void>
  shape?: Shape | null
}

export function ShapeModal({ isOpen, onClose, onSave, shape }: ShapeModalProps) {
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName(shape?.name || '')
      setImageUrl(shape?.image_url || null)
      setError('')
    }
  }, [isOpen, shape])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 1MB)
    if (file.size > 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 1 ميجابايت')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setImageUrl(reader.result as string)
      setError('')
    }
    reader.onerror = () => {
      setError('فشل في قراءة الصورة')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('يرجى إدخال اسم الشكل')
      return
    }

    setLoading(true)
    setError('')

    try {
      await onSave(name.trim(), imageUrl)
    } catch (err) {
      setError('فشل في حفظ الشكل')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[var(--dash-bg-surface)] rounded-lg p-6 w-full max-w-md mx-4 shadow-[var(--dash-shadow-lg)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--dash-text-primary)]">
            {shape ? 'تعديل الشكل' : 'إضافة شكل جديد'}
          </h2>
          <button
            onClick={handleClose}
            className="text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] p-1 transition-colors"
            disabled={loading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--dash-text-secondary)] mb-2">
              اسم الشكل
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسم الشكل"
              className="w-full px-3 py-2 bg-[var(--dash-bg-raised)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-transparent"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--dash-text-secondary)] mb-2">
              صورة الشكل
            </label>

            {imageUrl ? (
              <div className="space-y-2">
                <div className="relative w-full h-40 bg-[var(--dash-bg-raised)] rounded-lg overflow-hidden border border-[var(--dash-border-default)]">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={loading}
                  className="w-full dash-btn-red py-2 rounded-lg disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  إزالة الصورة
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={loading}
                  className="hidden"
                  id="shape-image-input"
                />
                <label
                  htmlFor="shape-image-input"
                  className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[var(--dash-border-default)] rounded-lg cursor-pointer bg-[var(--dash-bg-raised)] hover:bg-[var(--dash-bg-overlay)] transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-12 h-12 text-[var(--dash-text-muted)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-[var(--dash-text-muted)] text-center">
                    <span className="font-medium text-dash-accent-blue">اضغط لاختيار صورة</span>
                    <br />
                    <span className="text-xs">الحد الأقصى: 1 ميجابايت</span>
                  </p>
                </label>
              </div>
            )}
          </div>

          {error && (
            <div className="text-dash-accent-red text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 dash-btn-primary py-2 rounded-lg disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? 'جاري الحفظ...' : (shape ? 'تحديث' : 'إضافة')}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-[var(--dash-bg-overlay)] hover:bg-[var(--dash-bg-overlay)] text-[var(--dash-text-primary)] py-2 rounded-lg disabled:opacity-50 transition-colors font-medium"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
