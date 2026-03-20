'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'
interface SafeItem {
  id: string
  name: string
  parent_id: string | null
  safe_type: string | null
}

interface AddSafeModalProps {
  isOpen: boolean
  onClose: () => void
  onSafeAdded: () => void
  parentSafe?: SafeItem | null
}

export default function AddSafeModal({ isOpen, onClose, onSafeAdded, parentSafe }: AddSafeModalProps) {
  const [safeName, setSafeName] = useState('')
  const [initialBalance, setInitialBalance] = useState<string>('0')
  const [supportsDrawers, setSupportsDrawers] = useState(false)
  const [showTransfers, setShowTransfers] = useState(true)
  const [balanceDestination, setBalanceDestination] = useState<'safe' | 'transfers'>('safe')
  const [isLoading, setIsLoading] = useState(false)

  const isSubSafe = !!parentSafe

  const handleSave = async () => {
    if (!safeName.trim()) return

    setIsLoading(true)
    try {
      const balance = parseFloat(initialBalance) || 0
      const { data: newRecord, error } = await supabase
        .from('records')
        .insert({
          name: safeName.trim(),
          is_primary: false,
          is_active: true,
          initial_balance: balance,
          parent_id: parentSafe?.id || null,
          safe_type: isSubSafe ? 'sub' : 'main',
          supports_drawers: isSubSafe ? false : supportsDrawers,
          show_transfers: isSubSafe ? true : (supportsDrawers ? true : showTransfers),
        } as any)
        .select('id')
        .single()

      if (error) {
        console.error('Error creating safe:', error)
        return
      }

      // Create cash_drawer for the new safe
      if (newRecord?.id) {
        const isTransfers = balanceDestination === 'transfers'

        if (supportsDrawers) {
          // For drawer safes: main safe gets balance if transfers, otherwise 0
          const mainBalance = isTransfers ? balance : 0
          const { data: newDrawer, error: drawerError } = await supabase
            .from('cash_drawers')
            .insert({
              record_id: newRecord.id,
              current_balance: mainBalance
            })
            .select('id')
            .single()
          if (drawerError) {
            console.error('Error creating cash drawer:', drawerError)
          }

          // If transfers, create transfer_in transaction on main safe
          if (newDrawer?.id && isTransfers && balance > 0) {
            await supabase.from('cash_drawer_transactions').insert({
              record_id: newRecord.id,
              drawer_id: newDrawer.id,
              amount: balance,
              balance_after: balance,
              transaction_type: 'transfer_in',
              notes: 'رصيد افتتاحي - تحويلات'
            })
          }

          // Auto-create first drawer
          const subBalance = isTransfers ? 0 : balance
          const { data: drawerRecord } = await supabase
            .from('records')
            .insert({
              name: 'درج 1',
              is_primary: false,
              is_active: true,
              initial_balance: subBalance,
              parent_id: newRecord.id,
              safe_type: 'sub',
              supports_drawers: false,
            } as any)
            .select('id')
            .single()

          if (drawerRecord?.id) {
            const { data: subDrawer } = await supabase.from('cash_drawers').insert({
              record_id: drawerRecord.id,
              current_balance: subBalance
            }).select('id').single()

            // Create opening balance transaction for the sub-drawer (only if not transfers)
            if (subDrawer?.id && !isTransfers && balance > 0) {
              await supabase.from('cash_drawer_transactions').insert({
                record_id: drawerRecord.id,
                drawer_id: subDrawer.id,
                amount: balance,
                balance_after: balance,
                transaction_type: 'deposit',
                notes: 'رصيد افتتاحي'
              })
            }
          }
        } else {
          // Non-drawer safe
          const { data: newDrawer, error: drawerError } = await supabase
            .from('cash_drawers')
            .insert({
              record_id: newRecord.id,
              current_balance: balance
            })
            .select('id')
            .single()
          if (drawerError) {
            console.error('Error creating cash drawer:', drawerError)
          }

          // Create opening balance transaction
          if (newDrawer?.id && balance > 0) {
            await supabase.from('cash_drawer_transactions').insert({
              record_id: newRecord.id,
              drawer_id: newDrawer.id,
              amount: balance,
              balance_after: balance,
              transaction_type: isTransfers ? 'transfer_in' : 'deposit',
              notes: isTransfers ? 'رصيد افتتاحي - تحويلات' : 'رصيد افتتاحي'
            })
          }
        }
      }

      onSafeAdded()
      handleClose()
    } catch (error) {
      console.error('Error creating safe:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSafeName('')
    setInitialBalance('0')
    setSupportsDrawers(false)
    setShowTransfers(true)
    setBalanceDestination('safe')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-pos-darker rounded-lg p-6 w-96 max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {parentSafe ? `إضافة درج في "${parentSafe.name}"` : 'إضافة خزنة جديدة'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {isSubSafe ? 'اسم الدرج' : 'اسم الخزنة'}
            </label>
            <input
              type="text"
              value={safeName}
              onChange={(e) => setSafeName(e.target.value)}
              placeholder={isSubSafe ? 'مثال: كاشير 1...' : 'أدخل اسم الخزنة...'}
              className="w-full bg-gray-700 text-white placeholder-gray-400 px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          {/* Supports Drawers Toggle - only when creating main safe */}
          {!isSubSafe && (
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={supportsDrawers}
                  onChange={(e) => setSupportsDrawers(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  disabled={isLoading}
                />
                <span className="text-sm font-medium text-gray-300">تدعم الأدراج</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 mr-8">يمكنك إضافة أدراج داخل الخزنة لاحقاً</p>
            </div>
          )}

          {/* Show Transfers Toggle - only for non-drawer main safes */}
          {!isSubSafe && !supportsDrawers && (
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTransfers}
                  onChange={(e) => setShowTransfers(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  disabled={isLoading}
                />
                <span className="text-sm font-medium text-gray-300">فصل التحويلات</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 mr-8">فصل رصيد التحويلات عن رصيد الخزنة</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              الرصيد الافتتاحي
            </label>
            <input
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full bg-gray-700 text-white placeholder-gray-400 px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
              dir="ltr"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">يمكنك تركه صفر إذا كانت الخزنة فارغة</p>
          </div>

          {/* Balance Destination - only when balance > 0 and transfers are enabled */}
          {(parseFloat(initialBalance) || 0) > 0 && (supportsDrawers || showTransfers) && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                وجهة الرصيد الافتتاحي
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="balanceDestination"
                    checked={balanceDestination === 'safe'}
                    onChange={() => setBalanceDestination('safe')}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-300">
                    {supportsDrawers ? 'درج 1' : 'في الخزنة'}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="balanceDestination"
                    checked={balanceDestination === 'transfers'}
                    onChange={() => setBalanceDestination('transfers')}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-300">التحويلات</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            disabled={isLoading}
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={!safeName.trim() || isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  )
}
