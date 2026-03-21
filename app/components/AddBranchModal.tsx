'use client'

import { useState, useEffect } from 'react'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'

interface Branch {
  id: string
  name: string
  name_en: string | null
  address: string
  phone: string
  manager_id: string | null
  allow_variants: boolean
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  location_link: string | null
}

interface AddBranchModalProps {
  isOpen: boolean
  onClose: () => void
  onBranchCreated?: () => void
  editBranch?: Branch | null
  isEditing?: boolean
}

export default function AddBranchModal({ isOpen, onClose, onBranchCreated, editBranch, isEditing }: AddBranchModalProps) {
  const [activeTab, setActiveTab] = useState('details')
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    locationLink: '',
    allowShapeColors: false
  })

  // Pre-fill form data when editing
  useEffect(() => {
    if (isEditing && editBranch) {
      setFormData({
        name: editBranch.name || '',
        address: editBranch.address || '',
        phone: editBranch.phone || '',
        locationLink: editBranch.location_link || '',
        allowShapeColors: editBranch.allow_variants || false
      })
    } else if (!isEditing) {
      setFormData({
        name: '',
        address: '',
        phone: '',
        locationLink: '',
        allowShapeColors: false
      })
    }
  }, [isEditing, editBranch])

  const tabs = [
    { id: 'details', label: 'تفاصيل الفرع', active: true }
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.address.trim() || !formData.phone.trim()) {
      return
    }
    
    setIsSaving(true)
    try {
      if (isEditing && editBranch) {
        // Update existing branch
        const { error } = await supabase
          .from('branches')
          .update({
            name: formData.name.trim(),
            address: formData.address.trim(),
            phone: formData.phone.trim(),
            location_link: formData.locationLink.trim() || null,
            allow_variants: formData.allowShapeColors,
            updated_at: new Date().toISOString()
          })
          .eq('id', editBranch.id)

        if (error) throw error
      } else {
        // Create new branch
        const { error } = await supabase
          .from('branches')
          .insert({
            name: formData.name.trim(),
            address: formData.address.trim(),
            phone: formData.phone.trim(),
            location_link: formData.locationLink.trim() || null,
            allow_variants: formData.allowShapeColors,
            is_active: true
          })

        if (error) throw error
      }
      
      // Reset form and close
      setFormData({
        name: '',
        address: '',
        phone: '',
        locationLink: '',
        allowShapeColors: false
      })
      
      if (onBranchCreated) {
        onBranchCreated()
      }
      onClose()
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} branch:`, error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      locationLink: '',
      allowShapeColors: false
    })
    onClose()
  }

  const handleClearFields = () => {
    // Instant clearing without confirmation
    setFormData({
      name: '',
      address: '',
      phone: '',
      locationLink: '',
      allowShapeColors: false
    })
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar - starts below header with exact dark theme colors */}
      <div className={`fixed top-12 right-0 h-[calc(100vh-3rem)] w-96 bg-[var(--dash-bg-surface)] z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } shadow-[var(--dash-shadow-lg)] ${isOpen ? 'animate-dash-scale-in' : ''}`}>
        
        {/* Header - dark gray header matching design */}
        <div className="bg-[var(--dash-bg-surface)] px-4 py-3 flex items-center justify-start border-b border-[var(--dash-border-default)]">
          <h2 className="text-[var(--dash-text-primary)] text-lg font-medium flex-1 text-right">
            {isEditing ? 'تعديل الفرع' : 'إضافة فرع'}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--dash-text-primary)] hover:text-gray-200 transition-colors ml-4"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation Bar - matching reference design */}
        <div className="bg-[var(--dash-bg-surface)] border-b border-[var(--dash-border-default)]">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#5DADE2]' // Light blue text for selected
                    : 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text-primary)]'
                }`}
              >
                {tab.label}
                {/* Light blue underline for active tab */}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5DADE2]"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 h-[calc(100%-180px)] overflow-y-auto scrollbar-hide">
          
          {/* Branch Name Field */}
          <div className="space-y-2">
            <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
              اسم الفرع *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="أدخل اسم الفرع"
              className="w-full px-3 py-2 bg-[var(--dash-bg-base)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-transparent text-right text-sm"
            />
          </div>

          {/* Address Field */}
          <div className="space-y-2">
            <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
              العنوان *
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="أدخل عنوان الفرع"
              rows={3}
              className="w-full px-3 py-2 bg-[var(--dash-bg-base)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-transparent text-right text-sm resize-none"
            />
          </div>

          {/* Phone Number Field */}
          <div className="space-y-2">
            <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
              رقم الهاتف *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="أدخل رقم الهاتف"
              className="w-full px-3 py-2 bg-[var(--dash-bg-base)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-transparent text-right text-sm"
            />
          </div>

          {/* Location Link Field */}
          <div className="space-y-2">
            <label className="block text-[var(--dash-text-primary)] text-sm font-medium text-right">
              رابط الموقع
            </label>
            <input
              type="url"
              name="locationLink"
              value={formData.locationLink}
              onChange={handleInputChange}
              placeholder="أدخل رابط خرائط Google أو Apple Maps"
              className="w-full px-3 py-2 bg-[var(--dash-bg-base)] border border-[var(--dash-border-default)] rounded text-[var(--dash-text-primary)] placeholder-[var(--dash-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--dash-accent-blue)] focus:border-transparent text-right text-sm"
            />
          </div>

          {/* Allow Shape & Colors Field */}
          <div className="space-y-2">
            <label className="block text-white text-sm font-medium mb-4 text-right">
              السماح بإضافة الأشكال والألوان للمنتج
            </label>
            <div className="flex items-center gap-3 justify-end">
              <span className="text-[var(--dash-text-secondary)] text-sm">
                {formData.allowShapeColors ? 'مسموح' : 'غير مسموح'}
              </span>
              <button
                onClick={() => setFormData(prev => ({ ...prev, allowShapeColors: !prev.allowShapeColors }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  formData.allowShapeColors ? 'bg-[#3B82F6]' : 'bg-[var(--dash-bg-overlay)]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.allowShapeColors ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons - exact design match */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-[var(--dash-bg-surface)] border-t border-[var(--dash-border-default)]">
          <div className="flex gap-2">
            {/* Clear Cells Button - matching reference design */}
            <button
              onClick={handleClearFields}
              className="bg-transparent hover:bg-[#EF4444]/10 text-[#EF4444] px-4 py-2 rounded-md border border-[#EF4444] hover:border-[#DC2626] hover:text-[#DC2626] text-sm font-medium transition-all duration-200"
            >
              تصفية الخلايا
            </button>
            
            <div className="flex-1"></div>
            
            {/* Cancel and Save buttons - exact styling */}
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="bg-transparent hover:bg-[var(--dash-bg-overlay)]/10 text-[var(--dash-text-secondary)] border border-[var(--dash-border-default)] hover:border-[var(--dash-bg-highlight)] px-4 py-2 text-sm font-medium transition-all duration-200 min-w-[80px] flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim() || !formData.address.trim() || !formData.phone.trim()}
                className="bg-transparent hover:bg-[var(--dash-bg-overlay)]/10 text-[var(--dash-text-secondary)] border border-[var(--dash-border-default)] hover:border-[var(--dash-bg-highlight)] px-4 py-2 text-sm font-medium transition-all duration-200 min-w-[80px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m12 2a10 10 0 1 0 10 10c0-5.52-4.48-10-10-10zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
{isSaving ? (isEditing ? 'جاري التحديث...' : 'جاري الحفظ...') : (isEditing ? 'تحديث' : 'حفظ')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}