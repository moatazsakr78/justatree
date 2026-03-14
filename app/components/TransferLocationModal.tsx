'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ArrowsRightLeftIcon, BuildingOfficeIcon, BuildingStorefrontIcon, CheckIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'

interface Location {
  id: string
  name: string
  address?: string
  phone?: string
  is_active?: boolean | null
  type: 'branch' | 'warehouse'
}

interface TransferLocationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (fromLocation: Location, toLocation: Location) => void
}

export default function TransferLocationModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}: TransferLocationModalProps) {
  const [fromLocation, setFromLocation] = useState<Location | null>(null)
  const [toLocation, setToLocation] = useState<Location | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'from' | 'to'>('from')

  // Fetch branches and warehouses from database
  const fetchLocations = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Get branches
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, name, address, phone, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true })
      
      if (branchesError) throw branchesError

      // Get warehouses
      const { data: warehousesData, error: warehousesError } = await supabase
        .from('warehouses')
        .select('id, name, address, phone')
        .order('name', { ascending: true })
      
      if (warehousesError) throw warehousesError

      // Combine and mark types
      const allLocations: Location[] = [
        ...(branchesData || []).map(branch => ({ ...branch, type: 'branch' as const })),
        ...(warehousesData || []).map(warehouse => ({ ...warehouse, type: 'warehouse' as const, is_active: true }))
      ]
      
      setLocations(allLocations)
      
    } catch (error) {
      console.error('Error fetching locations:', error)
      setError('فشل في تحميل المواقع')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch locations when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLocations()
      // Reset selections when modal opens
      setFromLocation(null)
      setToLocation(null)
      setCurrentStep('from')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleLocationSelect = (location: Location) => {
    if (currentStep === 'from') {
      setFromLocation(location)
      setCurrentStep('to')
    } else {
      setToLocation(location)
    }
  }

  const handleConfirm = () => {
    if (fromLocation && toLocation) {
      if (fromLocation.id === toLocation.id) {
        alert('لا يمكن أن يكون مصدر ووجهة النقل نفس المكان')
        return
      }
      onConfirm(fromLocation, toLocation)
      onClose()
    }
  }

  const handleBack = () => {
    if (currentStep === 'to') {
      setCurrentStep('from')
      setToLocation(null)
    }
  }

  const handleReset = () => {
    setFromLocation(null)
    setToLocation(null)
    setCurrentStep('from')
  }

  const getAvailableLocations = () => {
    if (currentStep === 'from') {
      return locations
    } else {
      // For "to" step, exclude the selected "from" location
      return locations.filter(location => location.id !== fromLocation?.id)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#374151] rounded-lg w-[600px] shadow-2xl max-h-[80vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <div className="flex items-center gap-2">
            <ArrowsRightLeftIcon className="h-5 w-5 text-green-400" />
            <h2 className="text-white text-lg font-semibold">
              {currentStep === 'from' ? 'اختيار مصدر النقل' : 'اختيار وجهة النقل'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-[#2B3544]">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${currentStep === 'from' ? 'text-green-400' : fromLocation ? 'text-green-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                fromLocation ? 'border-green-400 bg-green-400' : currentStep === 'from' ? 'border-green-400' : 'border-gray-400'
              }`}>
                {fromLocation ? <CheckIcon className="h-4 w-4 text-white" /> : '1'}
              </div>
              <span className="text-sm font-medium">من</span>
            </div>
            
            <ArrowsRightLeftIcon className="h-5 w-5 text-gray-400" />
            
            <div className={`flex items-center gap-2 ${currentStep === 'to' ? 'text-green-400' : toLocation ? 'text-green-400' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                toLocation ? 'border-green-400 bg-green-400' : currentStep === 'to' ? 'border-green-400' : 'border-gray-400'
              }`}>
                {toLocation ? <CheckIcon className="h-4 w-4 text-white" /> : '2'}
              </div>
              <span className="text-sm font-medium">إلى</span>
            </div>
          </div>

          {/* Current Selections */}
          {(fromLocation || toLocation) && (
            <div className="mt-4 p-3 bg-gray-600/30 rounded-lg">
              <div className="text-xs text-gray-400 mb-2">التحديدات الحالية:</div>
              <div className="flex items-center justify-between text-sm">
                <div className={fromLocation ? 'text-white' : 'text-gray-500'}>
                  من: {fromLocation?.name || 'غير محدد'}
                </div>
                <ArrowsRightLeftIcon className="h-4 w-4 text-gray-400 mx-2" />
                <div className={toLocation ? 'text-white' : 'text-gray-500'}>
                  إلى: {toLocation?.name || 'غير محدد'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Description */}
          <p className="text-gray-300 text-center mb-6 leading-relaxed">
            {currentStep === 'from' 
              ? 'اختر المصدر الذي ترغب في النقل منه (فرع أو مخزن)'
              : 'اختر الوجهة التي ترغب في النقل إليها (فرع أو مخزن)'
            }
          </p>

          {/* Location Selection */}
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-4"></div>
                <p className="text-gray-400">جاري تحميل المواقع...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-8">
                <BuildingOfficeIcon className="h-16 w-16 text-red-500 mb-4" />
                <p className="text-red-400 text-lg mb-2">خطأ في التحميل</p>
                <p className="text-gray-500 text-sm mb-4">{error}</p>
                <button
                  onClick={fetchLocations}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : getAvailableLocations().length > 0 ? (
              getAvailableLocations().map((location) => (
                <div
                  key={location.id}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:border-green-400 ${
                    (currentStep === 'from' && fromLocation?.id === location.id) ||
                    (currentStep === 'to' && toLocation?.id === location.id)
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-600 bg-[#2B3544]'
                  }`}
                  onClick={() => handleLocationSelect(location)}
                >
                  {/* Location Type Icon */}
                  <div className="absolute left-4 top-4">
                    {location.type === 'branch' ? (
                      <BuildingOfficeIcon className="h-6 w-6 text-blue-400" />
                    ) : (
                      <BuildingStorefrontIcon className="h-6 w-6 text-purple-400" />
                    )}
                  </div>

                  {/* Location Info */}
                  <div className="pr-10">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold text-lg">
                        {location.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        location.type === 'branch' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {location.type === 'branch' ? 'فرع' : 'مخزن'}
                      </span>
                    </div>
                    {location.address && (
                      <p className="text-gray-400 text-sm mb-1">
                        {location.address}
                      </p>
                    )}
                    {location.phone && (
                      <p className="text-gray-500 text-xs">
                        الهاتف: {location.phone}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-8">
                <BuildingOfficeIcon className="h-16 w-16 text-gray-500 mb-4" />
                <p className="text-gray-400 text-lg mb-2">لا توجد مواقع متاحة</p>
                <p className="text-gray-500 text-sm">لا توجد مواقع متاحة للنقل</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-600 p-4 flex justify-between gap-3">
          <div className="flex gap-3">
            {currentStep === 'to' && (
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
              >
                السابق
              </button>
            )}
            {(fromLocation || toLocation) && (
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
              >
                إعادة تعيين
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              disabled={!fromLocation || !toLocation}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              تأكيد النقل
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}