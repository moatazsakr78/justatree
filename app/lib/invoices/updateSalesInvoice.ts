'use client'

import { supabase } from '../supabase/client'
import { roundMoney } from '../utils/money'
import { getSignedAmount } from '../utils/transactionTypes'

export interface UpdateSalesInvoiceParams {
  saleId: string
  newRecordId?: string | null      // الخزنة الجديدة (null = "لا يوجد")
  newCustomerId?: string | null    // العميل الجديد
  newBranchId?: string | null      // الفرع الجديد
  newPaymentMethod?: string        // طريقة الدفع الجديدة
  userId?: string | null
  userName?: string | null
}

export interface UpdateSalesInvoiceResult {
  success: boolean
  message: string
  changes?: {
    record?: { old: string | null, new: string | null }
    customer?: { old: string | null, new: string | null }
    branch?: { old: string | null, new: string | null }
    payment_method?: { old: string | null, new: string | null }
  }
}

export async function updateSalesInvoice({
  saleId,
  newRecordId,
  newCustomerId,
  newBranchId,
  newPaymentMethod,
  userId = null,
  userName = null
}: UpdateSalesInvoiceParams): Promise<UpdateSalesInvoiceResult> {
  if (!saleId) {
    return { success: false, message: 'معرف الفاتورة مطلوب' }
  }

  try {
    // 1. جلب بيانات الفاتورة الحالية
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single()

    if (saleError || !sale) {
      return { success: false, message: 'لم يتم العثور على الفاتورة' }
    }

    // 2. جلب كل سجلات المعاملات الحالية (قد يكون هناك أكثر من معاملة لنفس الفاتورة - split payment / hierarchical safes)
    const { data: allTransactions, error: txError } = await supabase
      .from('cash_drawer_transactions')
      .select('*')
      .eq('sale_id', saleId)

    if (txError) {
      console.warn('Error fetching transactions:', txError)
    }

    const transactions = allTransactions || []
    // For backward compat: use first transaction as "the transaction" for single-transaction logic
    const transaction = transactions.length === 1 ? transactions[0] : null
    const transactionAmount = transactions.reduce((sum: number, tx: any) => sum + getSignedAmount(tx.amount || 0, tx.transaction_type), 0) || sale.total_amount || 0

    // تتبع التغييرات
    const changes: UpdateSalesInvoiceResult['changes'] = {}
    const updateHistory: any[] = Array.isArray(sale.update_history) ? sale.update_history : []

    // استخدام record_id من المعاملات كمصدر الحقيقة
    // في النظام الهرمي قد تكون المعاملات مقسمة على عدة خزن (main + sub)
    const uniqueOldRecordIds = [...new Set(transactions.map((tx: any) => tx.record_id).filter(Boolean))]
    const actualCurrentRecordId = transaction?.record_id ?? sale.record_id

    // 3. تعديل الخزنة (إذا تم تغييرها)
    if (newRecordId !== undefined && newRecordId !== actualCurrentRecordId) {
      const oldRecordId = actualCurrentRecordId

      // Reverse each transaction from its current drawer (Bug 2 fix - atomic RPC)
      const completedReversals: { drawerId: string; delta: number }[] = []
      for (const tx of transactions) {
        if (tx.drawer_id) {
          const delta = -getSignedAmount(tx.amount || 0, tx.transaction_type)
          try {
            const { data: rpcResult, error: rpcErr } = await supabase.rpc(
              'atomic_adjust_drawer_balance' as any,
              { p_drawer_id: tx.drawer_id, p_change: delta }
            )
            if (rpcErr) throw new Error(`Failed to update drawer: ${rpcErr.message}`)
            completedReversals.push({ drawerId: tx.drawer_id, delta })

            const newOldBalance = rpcResult?.[0]?.new_balance ?? roundMoney(delta)
            console.log(`✅ خصم ${tx.amount} من الخزنة ${tx.record_id}، الرصيد الجديد: ${newOldBalance}`)
          } catch (reversalError: any) {
            // Bug 9 fix - rollback all previously completed reversals
            console.error(`Error reversing transaction ${tx.id}:`, reversalError)
            for (const completed of completedReversals) {
              try {
                await supabase.rpc('atomic_adjust_drawer_balance' as any, {
                  p_drawer_id: completed.drawerId, p_change: -completed.delta
                })
              } catch (rollbackErr) {
                console.error(`CRITICAL: Failed to rollback drawer ${completed.drawerId}:`, rollbackErr)
              }
            }
            return { success: false, message: `فشل في عكس معاملات الخزنة القديمة: ${reversalError.message}` }
          }
        }
      }

      // إذا كانت الخزنة الجديدة موجودة - إضافة المبلغ الإجمالي
      let newDrawer: any = null
      let newBalance: number | null = null

      if (newRecordId) {
        const { data: existingDrawer, error: drawerError } = await supabase
          .from('cash_drawers')
          .select('*')
          .eq('record_id', newRecordId)
          .single()

        if (drawerError && drawerError.code === 'PGRST116') {
          const { data: createdDrawer } = await supabase
            .from('cash_drawers')
            .insert({ record_id: newRecordId, current_balance: 0 })
            .select()
            .single()
          newDrawer = createdDrawer
        } else {
          newDrawer = existingDrawer
        }

        if (newDrawer) {
          // Bug 2 fix - use atomic RPC instead of read-modify-write
          const { data: newRpcResult, error: newRpcErr } = await supabase.rpc(
            'atomic_adjust_drawer_balance' as any,
            { p_drawer_id: newDrawer.id, p_change: transactionAmount }
          )
          if (newRpcErr) {
            // Rollback the old drawer reversals
            for (const completed of completedReversals) {
              try {
                await supabase.rpc('atomic_adjust_drawer_balance' as any, {
                  p_drawer_id: completed.drawerId, p_change: -completed.delta
                })
              } catch (rollbackErr) {
                console.error(`CRITICAL: Failed to rollback drawer ${completed.drawerId}:`, rollbackErr)
              }
            }
            return { success: false, message: `فشل في تحديث الخزنة الجديدة: ${newRpcErr.message}` }
          }
          newBalance = newRpcResult?.[0]?.new_balance ?? roundMoney((newDrawer.current_balance || 0) + transactionAmount)

          console.log(`✅ إضافة ${transactionAmount} للخزنة الجديدة، الرصيد الجديد: ${newBalance}`)
        }
      }

      // تحديث كل سجلات المعاملات
      for (const tx of transactions) {
        const txUpdate: any = {}

        if (newRecordId === null) {
          txUpdate.record_id = null
          txUpdate.drawer_id = null
          txUpdate.balance_after = null
        } else if (newRecordId) {
          txUpdate.record_id = newRecordId
          txUpdate.drawer_id = newDrawer?.id || null
          txUpdate.balance_after = newBalance
        }

        if (Object.keys(txUpdate).length > 0) {
          await supabase
            .from('cash_drawer_transactions')
            .update(txUpdate)
            .eq('id', tx.id)
        }
      }

      changes.record = {
        old: oldRecordId,
        new: newRecordId
      }

      updateHistory.push({
        timestamp: new Date().toISOString(),
        user_id: userId,
        user_name: userName,
        field: 'record_id',
        old_value: oldRecordId,
        new_value: newRecordId
      })

      // Update customer_payments safe_id for this sale
      await supabase
        .from('customer_payments')
        .update({ safe_id: newRecordId })
        .eq('sale_id', saleId)
    }

    // 4. تعديل العميل (إذا تم تغييره)
    if (newCustomerId !== undefined && newCustomerId !== sale.customer_id) {
      changes.customer = {
        old: sale.customer_id,
        new: newCustomerId
      }

      updateHistory.push({
        timestamp: new Date().toISOString(),
        user_id: userId,
        user_name: userName,
        field: 'customer_id',
        old_value: sale.customer_id,
        new_value: newCustomerId
      })

      // Reassign customer_payments to the new customer
      if (newCustomerId) {
        await supabase
          .from('customer_payments')
          .update({ customer_id: newCustomerId })
          .eq('sale_id', saleId)
      }
    }

    // 5. تعديل الفرع (إذا تم تغييره)
    if (newBranchId !== undefined && newBranchId !== sale.branch_id) {
      changes.branch = {
        old: sale.branch_id,
        new: newBranchId
      }

      updateHistory.push({
        timestamp: new Date().toISOString(),
        user_id: userId,
        user_name: userName,
        field: 'branch_id',
        old_value: sale.branch_id,
        new_value: newBranchId
      })
    }

    // 5b. نقل المخزون عند تغيير الفرع
    if (newBranchId !== undefined && newBranchId !== sale.branch_id && newBranchId) {
      const oldBranchId = sale.branch_id

      // Fetch sale items to adjust inventory
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('id, product_id, quantity, notes, branch_id')
        .eq('sale_id', saleId)

      if (!itemsError && saleItems && saleItems.length > 0) {
        const inventoryPromises = saleItems.map(async (item) => {
          try {
            const itemOldBranch = item.branch_id || oldBranchId

            // Return quantity to old branch: +quantity for sales (was -), -quantity for returns (was +)
            // item.quantity is positive for sales, negative for returns
            // So adding item.quantity back reverses the original deduction
            await supabase.rpc(
              'atomic_adjust_inventory' as any,
              {
                p_product_id: item.product_id,
                p_branch_id: itemOldBranch,
                p_warehouse_id: null,
                p_change: item.quantity,
                p_allow_negative: true
              }
            )

            // Deduct from new branch: opposite direction
            await supabase.rpc(
              'atomic_adjust_inventory' as any,
              {
                p_product_id: item.product_id,
                p_branch_id: newBranchId,
                p_warehouse_id: null,
                p_change: -item.quantity,
                p_allow_negative: true
              }
            )
          } catch (err) {
            console.warn(`Error adjusting inventory for product ${item.product_id} during branch change:`, err)
          }
        })

        // Handle variant quantities (colors and shapes from notes)
        const variantPromises = saleItems
          .filter(item => item.notes)
          .flatMap(item => {
            const itemOldBranch = item.branch_id || oldBranchId
            const isReturn = item.quantity < 0
            const promises: Promise<void>[] = []

            // Parse colors
            const colorMatch = item.notes.match(/الألوان المحددة:\s*(.+?)(?:\s*\||$)/)
            if (colorMatch) {
              const colorEntries = colorMatch[1].split(',').map((e: string) => e.trim()).filter(Boolean)
              for (const entry of colorEntries) {
                const lastColon = entry.lastIndexOf(':')
                if (lastColon === -1) continue
                const colorName = entry.substring(0, lastColon).trim()
                const colorQty = parseInt(entry.substring(lastColon + 1).trim(), 10)
                if (!colorName || isNaN(colorQty) || colorQty <= 0) continue

                promises.push((async () => {
                  try {
                    const { data: varDef } = await supabase
                      .from('product_color_shape_definitions')
                      .select('id')
                      .eq('product_id', item.product_id)
                      .eq('name', colorName)
                      .eq('variant_type', 'color')
                      .single()

                    if (!varDef) return

                    // Restore to old branch
                    const restoreChange = isReturn ? -colorQty : colorQty
                    await supabase.rpc('atomic_adjust_variant_quantity' as any, {
                      p_variant_definition_id: varDef.id,
                      p_branch_id: itemOldBranch,
                      p_change: restoreChange,
                      p_allow_negative: true
                    })

                    // Deduct from new branch
                    await supabase.rpc('atomic_adjust_variant_quantity' as any, {
                      p_variant_definition_id: varDef.id,
                      p_branch_id: newBranchId,
                      p_change: -restoreChange,
                      p_allow_negative: true
                    })
                  } catch (err) {
                    console.warn(`Error adjusting color variant ${colorName}:`, err)
                  }
                })())
              }
            }

            // Parse shapes
            const shapeMatch = item.notes.match(/الأشكال المحددة:\s*(.+?)(?:\s*\||$)/)
            if (shapeMatch) {
              const shapeEntries = shapeMatch[1].split(',').map((e: string) => e.trim()).filter(Boolean)
              for (const entry of shapeEntries) {
                const lastColon = entry.lastIndexOf(':')
                if (lastColon === -1) continue
                const shapeName = entry.substring(0, lastColon).trim()
                const shapeQty = parseInt(entry.substring(lastColon + 1).trim(), 10)
                if (!shapeName || isNaN(shapeQty) || shapeQty <= 0) continue

                promises.push((async () => {
                  try {
                    const { data: varDef } = await supabase
                      .from('product_color_shape_definitions')
                      .select('id')
                      .eq('product_id', item.product_id)
                      .eq('name', shapeName)
                      .eq('variant_type', 'shape')
                      .single()

                    if (!varDef) return

                    const restoreChange = isReturn ? -shapeQty : shapeQty
                    await supabase.rpc('atomic_adjust_variant_quantity' as any, {
                      p_variant_definition_id: varDef.id,
                      p_branch_id: itemOldBranch,
                      p_change: restoreChange,
                      p_allow_negative: true
                    })

                    await supabase.rpc('atomic_adjust_variant_quantity' as any, {
                      p_variant_definition_id: varDef.id,
                      p_branch_id: newBranchId,
                      p_change: -restoreChange,
                      p_allow_negative: true
                    })
                  } catch (err) {
                    console.warn(`Error adjusting shape variant ${shapeName}:`, err)
                  }
                })())
              }
            }

            return promises
          })

        await Promise.all([...inventoryPromises, ...variantPromises])

        // Update branch_id in all sale_items
        await supabase
          .from('sale_items')
          .update({ branch_id: newBranchId })
          .eq('sale_id', saleId)

        console.log(`✅ Inventory moved from branch ${oldBranchId} to ${newBranchId} for sale ${saleId}`)
      }
    }

    // 6. تعديل طريقة الدفع (إذا تم تغييرها)
    if (newPaymentMethod !== undefined && newPaymentMethod !== sale.payment_method) {
      changes.payment_method = {
        old: sale.payment_method,
        new: newPaymentMethod
      }

      updateHistory.push({
        timestamp: new Date().toISOString(),
        user_id: userId,
        user_name: userName,
        field: 'payment_method',
        old_value: sale.payment_method,
        new_value: newPaymentMethod
      })

      // Look up is_physical for the OLD payment method
      let oldIsPhysical = true
      const { data: oldPmRow } = await supabase
        .from('payment_methods')
        .select('is_physical')
        .eq('name', sale.payment_method)
        .maybeSingle()
      if (oldPmRow) oldIsPhysical = oldPmRow.is_physical !== false

      // Look up is_physical for the NEW payment method
      let newIsPhysical = true
      const { data: pmRow } = await supabase
        .from('payment_methods')
        .select('is_physical')
        .eq('name', newPaymentMethod)
        .maybeSingle()
      if (pmRow) newIsPhysical = pmRow.is_physical !== false

      const isReturn = sale.invoice_type === 'Sale Return'
      const newTransactionType = isReturn
        ? (newIsPhysical ? 'return' : 'transfer_out')
        : (newIsPhysical ? 'sale' : 'transfer_in')

      // Check if physical nature changed AND section 3 didn't already handle the move
      const physicalNatureChanged = oldIsPhysical !== newIsPhysical
      const safeAlreadyChanged = !!changes.record
      const transactionsWithDrawers = transactions.filter((tx: any) => tx.drawer_id)

      if (physicalNatureChanged && !safeAlreadyChanged && transactionsWithDrawers.length > 0) {
        // Need to move transactions between drawers
        // Determine the new target record based on physical nature change
        let targetRecordId: string | null = null

        if (newIsPhysical) {
          // Non-physical → Physical: move from main safe to a sub-safe (drawer)
          const currentRecordId = transactionsWithDrawers[0].record_id
          if (currentRecordId) {
            const { data: subSafes } = await supabase
              .from('records')
              .select('id')
              .eq('parent_id', currentRecordId)
              .eq('safe_type', 'sub')
              .eq('is_active', true)
              .order('created_at', { ascending: true })
              .limit(1)

            if (subSafes && subSafes.length > 0) {
              targetRecordId = subSafes[0].id
            }
          }
        } else {
          // Physical → Non-physical: move from sub-safe to parent main safe
          const currentRecordId = transactionsWithDrawers[0].record_id
          if (currentRecordId) {
            const { data: currentRecord } = await supabase
              .from('records')
              .select('parent_id')
              .eq('id', currentRecordId)
              .single()

            if (currentRecord?.parent_id) {
              targetRecordId = currentRecord.parent_id
            }
          }
        }

        if (targetRecordId && targetRecordId !== transactionsWithDrawers[0].record_id) {
          // Move money: reverse from old drawer, add to new drawer
          const pmCompletedReversals: { drawerId: string; delta: number }[] = []

          for (const tx of transactionsWithDrawers) {
            const delta = -getSignedAmount(tx.amount || 0, tx.transaction_type)
            try {
              const { error: rpcErr } = await supabase.rpc(
                'atomic_adjust_drawer_balance' as any,
                { p_drawer_id: tx.drawer_id, p_change: delta }
              )
              if (rpcErr) throw new Error(`Failed to reverse drawer: ${rpcErr.message}`)
              pmCompletedReversals.push({ drawerId: tx.drawer_id, delta })
            } catch (reversalError: any) {
              // Rollback completed reversals
              for (const completed of pmCompletedReversals) {
                try {
                  await supabase.rpc('atomic_adjust_drawer_balance' as any, {
                    p_drawer_id: completed.drawerId, p_change: -completed.delta
                  })
                } catch (rollbackErr) {
                  console.error(`CRITICAL: Failed to rollback drawer ${completed.drawerId}:`, rollbackErr)
                }
              }
              return { success: false, message: `فشل في عكس معاملات الخزنة عند تغيير طريقة الدفع: ${reversalError.message}` }
            }
          }

          // Get or create drawer for new target
          let newTargetDrawer: any = null
          const { data: existingDrawer, error: drawerError } = await supabase
            .from('cash_drawers')
            .select('*')
            .eq('record_id', targetRecordId)
            .single()

          if (drawerError && drawerError.code === 'PGRST116') {
            const { data: createdDrawer } = await supabase
              .from('cash_drawers')
              .insert({ record_id: targetRecordId, current_balance: 0 })
              .select()
              .single()
            newTargetDrawer = createdDrawer
          } else {
            newTargetDrawer = existingDrawer
          }

          if (newTargetDrawer) {
            // Calculate total signed amount with NEW transaction type
            const newTotalAmount = transactions.reduce((sum: number, tx: any) =>
              sum + getSignedAmount(tx.amount || 0, newTransactionType), 0)

            const { data: newRpcResult, error: newRpcErr } = await supabase.rpc(
              'atomic_adjust_drawer_balance' as any,
              { p_drawer_id: newTargetDrawer.id, p_change: newTotalAmount }
            )

            if (newRpcErr) {
              // Rollback all reversals
              for (const completed of pmCompletedReversals) {
                try {
                  await supabase.rpc('atomic_adjust_drawer_balance' as any, {
                    p_drawer_id: completed.drawerId, p_change: -completed.delta
                  })
                } catch (rollbackErr) {
                  console.error(`CRITICAL: Failed to rollback drawer ${completed.drawerId}:`, rollbackErr)
                }
              }
              return { success: false, message: `فشل في تحديث الخزنة الجديدة عند تغيير طريقة الدفع: ${newRpcErr.message}` }
            }

            const newTargetBalance = newRpcResult?.[0]?.new_balance ?? roundMoney((newTargetDrawer.current_balance || 0) + newTotalAmount)

            // Update all transaction records with new drawer, type, and payment method
            for (const tx of transactions) {
              await supabase
                .from('cash_drawer_transactions')
                .update({
                  transaction_type: newTransactionType,
                  payment_method: newPaymentMethod,
                  record_id: targetRecordId,
                  drawer_id: newTargetDrawer.id,
                  balance_after: newTargetBalance
                })
                .eq('id', tx.id)
            }

            console.log(`✅ نقل المعاملات من الخزنة القديمة إلى ${targetRecordId} عند تغيير طريقة الدفع، الرصيد الجديد: ${newTargetBalance}`)
          } else {
            // Couldn't find/create new drawer - just update labels
            for (const tx of transactions) {
              await supabase
                .from('cash_drawer_transactions')
                .update({ transaction_type: newTransactionType, payment_method: newPaymentMethod })
                .eq('id', tx.id)
            }
          }
        } else {
          // No target change needed (no sub-safe found or same record) - just update labels
          for (const tx of transactions) {
            await supabase
              .from('cash_drawer_transactions')
              .update({ transaction_type: newTransactionType, payment_method: newPaymentMethod })
              .eq('id', tx.id)
          }
        }
      } else {
        // Physical nature didn't change OR section 3 already handled the move - just update labels
        for (const tx of transactions) {
          await supabase
            .from('cash_drawer_transactions')
            .update({ transaction_type: newTransactionType, payment_method: newPaymentMethod })
            .eq('id', tx.id)
        }
      }

      // Update customer_payments payment_method for this sale
      await supabase
        .from('customer_payments')
        .update({ payment_method: newPaymentMethod })
        .eq('sale_id', saleId)
    }

    // 7. تحديث الفاتورة في جدول sales
    const updateData: any = {
      is_updated: true,
      update_history: updateHistory
    }

    if (newRecordId !== undefined) {
      updateData.record_id = newRecordId || null
    }
    if (newCustomerId !== undefined) {
      updateData.customer_id = newCustomerId
    }
    if (newBranchId !== undefined) {
      updateData.branch_id = newBranchId
    }
    if (newPaymentMethod !== undefined) {
      updateData.payment_method = newPaymentMethod
    }

    const { error: updateError } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', saleId)

    if (updateError) {
      console.error('Error updating sale:', updateError)
      return { success: false, message: `خطأ في تحديث الفاتورة: ${updateError.message}` }
    }

    console.log('✅ تم تحديث الفاتورة بنجاح', { saleId, changes })

    return {
      success: true,
      message: 'تم تحديث الفاتورة بنجاح',
      changes
    }

  } catch (error: any) {
    console.error('Error in updateSalesInvoice:', error)
    return {
      success: false,
      message: error.message || 'حدث خطأ أثناء تحديث الفاتورة'
    }
  }
}

// دالة مساعدة لجلب معلومات الفاتورة الكاملة
export async function getSaleDetails(saleId: string) {
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select(`
      *,
      customer:customers(id, name, phone),
      branch:branches(id, name),
      record:records(id, name)
    `)
    .eq('id', saleId)
    .single()

  if (saleError) {
    console.error('Error fetching sale details:', saleError)
    return null
  }

  return sale
}
