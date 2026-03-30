/**
 * Server-side execution engine for safe automations.
 * Replicates the withdrawal/deposit/transfer logic from SafeDetailsModal
 * but runs with supabaseAdmin (service role) in cron/API context.
 */

import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { roundMoney } from '@/app/lib/utils/money'
import { resolveNoteTemplate } from '@/app/lib/utils/noteTemplates'

export interface AutomationConfig {
  id: string
  record_id: string
  operation_type: 'withdraw' | 'deposit' | 'transfer'
  source_id: string          // '' | 'all' | 'transfers' | 'safe-only' | drawer UUID
  all_mode: 'full' | 'excluding_reserves' | null
  amount_type: 'fixed' | 'all_available' | 'all_excluding_reserves'
  fixed_amount: number
  target_record_id: string | null
  notes_template: string
}

export interface ExecutionResult {
  status: 'success' | 'skipped' | 'error'
  message: string
  amountExecuted: number | null
  balanceBefore: number | null
  balanceAfter: number | null
  resolvedNotes: string
}

// Helper: get safe record
async function getSafe(supabase: any, recordId: string) {
  const { data, error } = await supabase
    .from('records')
    .select('id, name, parent_id, safe_type, supports_drawers, show_transfers, is_active')
    .eq('id', recordId)
    .single()
  if (error) throw new Error(`Safe not found: ${recordId}`)
  return data
}

// Helper: get child safes with balances
async function getChildSafes(supabase: any, parentId: string) {
  const { data: children } = await supabase
    .from('records')
    .select('id, name, safe_type, parent_id')
    .eq('parent_id', parentId)
    .eq('safe_type', 'sub')
    .eq('is_active', true)

  if (!children || children.length === 0) return []

  const result: { id: string; name: string; balance: number }[] = []
  for (const child of children) {
    const { data: drawer } = await supabase
      .from('cash_drawers')
      .select('current_balance')
      .eq('record_id', child.id)
      .single()
    result.push({
      id: child.id,
      name: child.name,
      balance: roundMoney(drawer?.current_balance || 0)
    })
  }
  return result
}

// Helper: get reserves for a set of record IDs
async function getReserves(supabase: any, recordIds: string[]) {
  const { data } = await supabase
    .from('cash_drawer_reserves')
    .select('*')
    .in('record_id', recordIds)
  return data || []
}

// Helper: get drawer for a record
async function getDrawer(supabase: any, recordId: string) {
  const { data, error } = await supabase
    .from('cash_drawers')
    .select('id, current_balance')
    .eq('record_id', recordId)
    .single()
  if (error || !data) return null
  return data
}

// Helper: atomic balance adjust + create transaction (with rollback)
async function adjustBalanceAndRecord(
  supabase: any,
  drawerId: string,
  recordId: string,
  change: number,
  transactionType: string,
  amount: number,
  notes: string,
  relatedRecordId?: string
): Promise<{ newBalance: number; txId: string }> {
  // Atomic balance update
  const { data: rpcResult, error: rpcErr } = await supabase.rpc(
    'atomic_adjust_drawer_balance',
    { p_drawer_id: drawerId, p_change: change }
  )
  if (rpcErr) throw new Error(`Balance update failed: ${rpcErr.message}`)

  const newBalance = rpcResult?.[0]?.new_balance ?? 0

  // Create transaction record
  const { data: txData, error: txError } = await supabase
    .from('cash_drawer_transactions')
    .insert({
      drawer_id: drawerId,
      record_id: recordId,
      transaction_type: transactionType,
      amount,
      balance_after: roundMoney(newBalance),
      notes,
      performed_by: 'نظام آلي',
      ...(relatedRecordId ? { related_record_id: relatedRecordId } : {})
    })
    .select('id')
    .single()

  if (txError) {
    // Rollback balance change
    await supabase.rpc('atomic_adjust_drawer_balance', { p_drawer_id: drawerId, p_change: -change })
    throw new Error(`Transaction record failed: ${txError.message}`)
  }

  return { newBalance: roundMoney(newBalance), txId: txData.id }
}

// Helper: get or create drawer for a target safe
async function getOrCreateDrawer(supabase: any, recordId: string) {
  let drawer = await getDrawer(supabase, recordId)
  if (!drawer) {
    const { data: newDrawer } = await supabase
      .from('cash_drawers')
      .insert({ record_id: recordId, current_balance: 0, status: 'open' })
      .select('id, current_balance')
      .single()
    drawer = newDrawer
  }
  return drawer
}

// Helper: compute non-drawer transfer balance
async function getNonDrawerTransferBalance(supabase: any, recordId: string): Promise<number> {
  // Sum of transfer_in minus transfer_out
  const { data: txData } = await supabase
    .from('cash_drawer_transactions')
    .select('transaction_type, amount')
    .eq('record_id', recordId)
    .in('transaction_type', ['transfer_in', 'transfer_out'])

  if (!txData) return 0
  let balance = 0
  for (const tx of txData) {
    if (tx.transaction_type === 'transfer_in') balance += tx.amount
    else if (tx.transaction_type === 'transfer_out') balance -= tx.amount
  }
  return roundMoney(Math.max(0, balance))
}

/**
 * Main execution function - runs a single automation
 */
export async function executeAutomation(config: AutomationConfig): Promise<ExecutionResult> {
  const supabase = getSupabaseAdmin()
  const resolvedNotes = resolveNoteTemplate(config.notes_template)

  try {
    const safe = await getSafe(supabase, config.record_id)
    if (!safe.is_active) {
      return { status: 'skipped', message: 'الخزنة غير نشطة', amountExecuted: null, balanceBefore: null, balanceAfter: null, resolvedNotes }
    }

    // ========================================================
    // BRANCH 1: "الكل" (All) for drawer safes - withdraw/transfer
    // ========================================================
    if (config.source_id === 'all' && (config.operation_type === 'withdraw' || config.operation_type === 'transfer') && safe.supports_drawers) {
      const childSafes = await getChildSafes(supabase, safe.id)
      if (childSafes.length === 0) {
        return { status: 'skipped', message: 'لا توجد أدراج في الخزنة', amountExecuted: null, balanceBefore: null, balanceAfter: null, resolvedNotes }
      }

      // Get main safe's own balance (transfers bucket)
      const mainDrawer = await getDrawer(supabase, safe.id)
      const mainSafeOwnBalance = roundMoney(mainDrawer?.current_balance || 0)

      // Collect all sources with balance > 0
      const allSources: { id: string; name: string; balance: number }[] = []
      childSafes.forEach(c => { if (c.balance > 0) allSources.push(c) })
      if (mainSafeOwnBalance > 0) allSources.push({ id: safe.id, name: 'التحويلات', balance: mainSafeOwnBalance })

      // Get reserves
      const allRecordIds = [...childSafes.map(c => c.id), safe.id]
      const reserves = await getReserves(supabase, allRecordIds)

      // Calculate total balance
      const totalBalance = roundMoney(allSources.reduce((sum, s) => sum + s.balance, 0))

      // Determine amount to withdraw
      let targetAmount: number
      const allMode = config.all_mode || 'excluding_reserves'

      if (config.amount_type === 'fixed') {
        targetAmount = config.fixed_amount
        if (totalBalance < targetAmount) {
          return { status: 'skipped', message: `الرصيد غير كافي: ${totalBalance} < ${targetAmount}`, amountExecuted: null, balanceBefore: totalBalance, balanceAfter: null, resolvedNotes }
        }
      } else {
        // all_available or all_excluding_reserves
        targetAmount = totalBalance
      }

      if (targetAmount <= 0) {
        return { status: 'skipped', message: 'لا يوجد رصيد للسحب', amountExecuted: null, balanceBefore: totalBalance, balanceAfter: null, resolvedNotes }
      }

      let totalTransferred = 0
      let cashTransferred = 0
      let transferTransferred = 0

      for (const source of allSources) {
        let withdrawFromSource = source.balance
        if (allMode === 'excluding_reserves' || config.amount_type === 'all_excluding_reserves') {
          const sourceReserveAmount = roundMoney(reserves.filter((r: any) => r.record_id === source.id).reduce((sum: number, r: any) => sum + r.amount, 0))
          withdrawFromSource = Math.max(0, source.balance - sourceReserveAmount)
        }
        if (withdrawFromSource <= 0) continue

        const drawer = await getDrawer(supabase, source.id)
        if (!drawer) continue

        const txType = config.operation_type === 'transfer' ? 'transfer_out' : 'withdrawal'
        const notePrefix = config.operation_type === 'transfer' ? 'تحويل إلى خزنة أخرى (تحويل الكل)' : 'سحب من الخزنة (سحب الكل)'
        const txNotes = resolvedNotes ? `${notePrefix} - ${resolvedNotes}` : notePrefix

        await adjustBalanceAndRecord(
          supabase, drawer.id, source.id,
          -withdrawFromSource, txType, withdrawFromSource,
          txNotes,
          config.operation_type === 'transfer' ? config.target_record_id! : undefined
        )

        totalTransferred += withdrawFromSource
        if (source.id === safe.id) {
          transferTransferred += withdrawFromSource
        } else {
          cashTransferred += withdrawFromSource
        }
      }

      // For transfer: deposit to target safe
      if (config.operation_type === 'transfer' && totalTransferred > 0 && config.target_record_id) {
        const targetDrawer = await getOrCreateDrawer(supabase, config.target_record_id)
        if (targetDrawer) {
          // Atomic balance update for target
          const { data: targetRpcResult } = await supabase.rpc(
            'atomic_adjust_drawer_balance',
            { p_drawer_id: targetDrawer.id, p_change: totalTransferred }
          )
          const targetNewBalance = targetRpcResult?.[0]?.new_balance ?? roundMoney((targetDrawer.current_balance || 0) + totalTransferred)

          if (cashTransferred > 0) {
            await supabase.from('cash_drawer_transactions').insert({
              drawer_id: targetDrawer.id,
              record_id: config.target_record_id,
              transaction_type: 'deposit',
              amount: cashTransferred,
              balance_after: roundMoney(targetNewBalance - transferTransferred),
              notes: `تحويل من خزنة ${safe.name} - نقدي (تحويل الكل)${resolvedNotes ? ` - ${resolvedNotes}` : ''}`,
              performed_by: 'نظام آلي',
              related_record_id: safe.id
            })
          }
          if (transferTransferred > 0) {
            await supabase.from('cash_drawer_transactions').insert({
              drawer_id: targetDrawer.id,
              record_id: config.target_record_id,
              transaction_type: 'transfer_in',
              amount: transferTransferred,
              balance_after: roundMoney(targetNewBalance),
              notes: `تحويل من خزنة ${safe.name} - تحويلات (تحويل الكل)${resolvedNotes ? ` - ${resolvedNotes}` : ''}`,
              performed_by: 'نظام آلي',
              related_record_id: safe.id
            })
          }
        }
      }

      // If full mode: delete all reserves
      if (allMode === 'full' && config.amount_type !== 'all_excluding_reserves') {
        const withdrawnSourceIds = allSources.filter(s => s.balance > 0).map(s => s.id)
        if (withdrawnSourceIds.length > 0) {
          await supabase.from('cash_drawer_reserves').delete().in('record_id', withdrawnSourceIds)
        }
      }

      const balanceAfter = roundMoney(totalBalance - totalTransferred)
      return {
        status: 'success',
        message: `تم ${config.operation_type === 'transfer' ? 'تحويل' : 'سحب'} ${roundMoney(totalTransferred)} بنجاح`,
        amountExecuted: roundMoney(totalTransferred),
        balanceBefore: totalBalance,
        balanceAfter,
        resolvedNotes
      }
    }

    // ========================================================
    // BRANCH 2: "الكل" (All) for NON-drawer safes - withdraw/transfer
    // ========================================================
    if (config.source_id === 'all' && (config.operation_type === 'withdraw' || config.operation_type === 'transfer') && !safe.supports_drawers) {
      const drawer = await getDrawer(supabase, safe.id)
      if (!drawer) return { status: 'skipped', message: 'لم يتم العثور على الخزنة', amountExecuted: null, balanceBefore: null, balanceAfter: null, resolvedNotes }

      const safeBalance = roundMoney(drawer.current_balance || 0)
      const nonDrawerTransferBalance = await getNonDrawerTransferBalance(supabase, safe.id)

      let cashPortion = Math.max(0, safeBalance - nonDrawerTransferBalance)
      let transferPortion = Math.min(nonDrawerTransferBalance, safeBalance)

      const allMode = config.all_mode || 'excluding_reserves'

      if (allMode === 'excluding_reserves' || config.amount_type === 'all_excluding_reserves') {
        const reserves = await getReserves(supabase, [safe.id])
        const totalReserves = roundMoney(reserves.reduce((sum: number, r: any) => sum + r.amount, 0))
        cashPortion = Math.max(0, cashPortion - totalReserves)
      }

      if (config.amount_type === 'fixed') {
        const totalAvailable = roundMoney(cashPortion + transferPortion)
        if (totalAvailable < config.fixed_amount) {
          return { status: 'skipped', message: `الرصيد غير كافي: ${totalAvailable} < ${config.fixed_amount}`, amountExecuted: null, balanceBefore: safeBalance, balanceAfter: null, resolvedNotes }
        }
      }

      const totalAmount = roundMoney(cashPortion + transferPortion)
      if (totalAmount <= 0) {
        return { status: 'skipped', message: 'لا يوجد رصيد للسحب', amountExecuted: null, balanceBefore: safeBalance, balanceAfter: null, resolvedNotes }
      }

      // Atomic balance update
      const { data: rpcResult, error: rpcErr } = await supabase.rpc(
        'atomic_adjust_drawer_balance',
        { p_drawer_id: drawer.id, p_change: -totalAmount }
      )
      if (rpcErr) throw new Error(`Balance update failed: ${rpcErr.message}`)
      let runningBalance = rpcResult?.[0]?.new_balance ?? roundMoney(safeBalance - totalAmount)

      // Create withdrawal transaction for cash portion
      let cashTxId: string | null = null
      if (cashPortion > 0) {
        const notePrefix = config.operation_type === 'transfer' ? 'تحويل إلى خزنة أخرى - نقدي (تحويل الكل)' : 'سحب من الخزنة - نقدي (سحب الكل)'
        const txNotes = resolvedNotes ? `${notePrefix} - ${resolvedNotes}` : notePrefix

        const { data: cashTxData, error: cashTxError } = await supabase
          .from('cash_drawer_transactions')
          .insert({
            drawer_id: drawer.id,
            record_id: safe.id,
            transaction_type: 'withdrawal',
            amount: cashPortion,
            balance_after: roundMoney(runningBalance + transferPortion),
            notes: txNotes,
            performed_by: 'نظام آلي',
            ...(config.operation_type === 'transfer' ? { related_record_id: config.target_record_id } : {})
          })
          .select('id')
          .single()

        if (cashTxError) {
          await supabase.rpc('atomic_adjust_drawer_balance', { p_drawer_id: drawer.id, p_change: totalAmount })
          throw new Error(`Transaction failed: ${cashTxError.message}`)
        }
        cashTxId = cashTxData?.id || null
      }

      // Create transfer_out transaction for transfer portion
      if (transferPortion > 0) {
        const notePrefix = config.operation_type === 'transfer' ? 'تحويل إلى خزنة أخرى - تحويلات (تحويل الكل)' : 'سحب من الخزنة - تحويلات (سحب الكل)'
        const txNotes = resolvedNotes ? `${notePrefix} - ${resolvedNotes}` : notePrefix

        const { error: transferTxError } = await supabase
          .from('cash_drawer_transactions')
          .insert({
            drawer_id: drawer.id,
            record_id: safe.id,
            transaction_type: 'transfer_out',
            amount: transferPortion,
            balance_after: roundMoney(runningBalance),
            notes: txNotes,
            performed_by: 'نظام آلي',
            ...(config.operation_type === 'transfer' ? { related_record_id: config.target_record_id } : {})
          })

        if (transferTxError) {
          if (cashTxId) await supabase.from('cash_drawer_transactions').delete().eq('id', cashTxId)
          await supabase.rpc('atomic_adjust_drawer_balance', { p_drawer_id: drawer.id, p_change: totalAmount })
          throw new Error(`Transaction failed: ${transferTxError.message}`)
        }
      }

      // For transfer: deposit to target
      if (config.operation_type === 'transfer' && totalAmount > 0 && config.target_record_id) {
        const targetDrawer = await getOrCreateDrawer(supabase, config.target_record_id)
        if (targetDrawer) {
          const { data: targetRpcResult } = await supabase.rpc(
            'atomic_adjust_drawer_balance',
            { p_drawer_id: targetDrawer.id, p_change: totalAmount }
          )
          const targetNewBalance = targetRpcResult?.[0]?.new_balance ?? roundMoney((targetDrawer.current_balance || 0) + totalAmount)

          if (cashPortion > 0) {
            await supabase.from('cash_drawer_transactions').insert({
              drawer_id: targetDrawer.id,
              record_id: config.target_record_id,
              transaction_type: 'deposit',
              amount: cashPortion,
              balance_after: roundMoney(targetNewBalance - transferPortion),
              notes: `تحويل من خزنة ${safe.name} - نقدي (تحويل الكل)${resolvedNotes ? ` - ${resolvedNotes}` : ''}`,
              performed_by: 'نظام آلي',
              related_record_id: safe.id
            })
          }
          if (transferPortion > 0) {
            await supabase.from('cash_drawer_transactions').insert({
              drawer_id: targetDrawer.id,
              record_id: config.target_record_id,
              transaction_type: 'transfer_in',
              amount: transferPortion,
              balance_after: roundMoney(targetNewBalance),
              notes: `تحويل من خزنة ${safe.name} - تحويلات (تحويل الكل)${resolvedNotes ? ` - ${resolvedNotes}` : ''}`,
              performed_by: 'نظام آلي',
              related_record_id: safe.id
            })
          }
        }
      }

      // If full mode: delete reserves
      if (allMode === 'full' && config.amount_type !== 'all_excluding_reserves') {
        await supabase.from('cash_drawer_reserves').delete().eq('record_id', safe.id)
      }

      return {
        status: 'success',
        message: `تم ${config.operation_type === 'transfer' ? 'تحويل' : 'سحب'} ${roundMoney(totalAmount)} بنجاح`,
        amountExecuted: roundMoney(totalAmount),
        balanceBefore: safeBalance,
        balanceAfter: roundMoney(runningBalance),
        resolvedNotes
      }
    }

    // ========================================================
    // BRANCH 3: Single source withdrawal/deposit/transfer
    // ========================================================
    {
      // Resolve source record_id
      const sourceRecordId = (safe.supports_drawers && config.source_id && config.source_id !== 'all' && config.source_id !== 'safe-only')
        ? (config.source_id === 'transfers' ? safe.id : config.source_id)
        : safe.id

      const drawer = await getDrawer(supabase, sourceRecordId)
      if (!drawer) {
        if (config.operation_type === 'deposit') {
          // Create drawer for deposits
          const newDrawer = await getOrCreateDrawer(supabase, sourceRecordId)
          if (!newDrawer) return { status: 'error', message: 'لم يتم العثور على الخزنة', amountExecuted: null, balanceBefore: null, balanceAfter: null, resolvedNotes }
          // Continue with newDrawer below
        } else {
          return { status: 'skipped', message: 'لم يتم العثور على الخزنة', amountExecuted: null, balanceBefore: null, balanceAfter: null, resolvedNotes }
        }
      }

      const currentDrawer = drawer || await getDrawer(supabase, sourceRecordId)
      if (!currentDrawer) return { status: 'error', message: 'لم يتم العثور على الخزنة', amountExecuted: null, balanceBefore: null, balanceAfter: null, resolvedNotes }

      const sourceBalance = roundMoney(currentDrawer.current_balance || 0)

      // Determine amount
      let amount: number
      if (config.amount_type === 'fixed') {
        amount = config.fixed_amount
      } else if (config.amount_type === 'all_excluding_reserves') {
        const reserves = await getReserves(supabase, [sourceRecordId])
        const totalReserves = roundMoney(reserves.reduce((sum: number, r: any) => sum + r.amount, 0))
        amount = Math.max(0, sourceBalance - totalReserves)
      } else {
        // all_available
        amount = sourceBalance
      }

      // Skip checks for withdraw/transfer
      if (config.operation_type !== 'deposit') {
        if (amount <= 0) {
          return { status: 'skipped', message: 'لا يوجد رصيد للسحب', amountExecuted: null, balanceBefore: sourceBalance, balanceAfter: null, resolvedNotes }
        }
        if (sourceBalance < amount) {
          return { status: 'skipped', message: `الرصيد غير كافي: ${sourceBalance} < ${amount}`, amountExecuted: null, balanceBefore: sourceBalance, balanceAfter: null, resolvedNotes }
        }
      }

      if (amount <= 0) {
        return { status: 'skipped', message: 'المبلغ صفر', amountExecuted: null, balanceBefore: sourceBalance, balanceAfter: null, resolvedNotes }
      }

      // Determine transaction type and notes
      const balanceDelta = config.operation_type === 'deposit' ? amount : -amount
      const isNonDrawerSafe = !safe.supports_drawers && safe.safe_type !== 'sub'

      let transactionType: string
      if (config.operation_type === 'deposit') {
        transactionType = (isNonDrawerSafe && config.source_id === 'transfers') ? 'transfer_in' : 'deposit'
      } else {
        if (isNonDrawerSafe && config.source_id === 'transfers') {
          transactionType = 'transfer_out'
        } else if (isNonDrawerSafe && config.source_id === 'safe-only') {
          transactionType = 'withdrawal'
        } else {
          transactionType = config.operation_type === 'transfer' ? 'transfer_out' : 'withdrawal'
        }
      }

      const opLabel = config.operation_type === 'deposit' ? 'إيداع في الخزنة' : config.operation_type === 'transfer' ? 'تحويل إلى خزنة أخرى' : 'سحب من الخزنة'
      const txNotes = resolvedNotes ? `${opLabel} - ${resolvedNotes}` : opLabel

      const { newBalance } = await adjustBalanceAndRecord(
        supabase, currentDrawer.id, sourceRecordId,
        balanceDelta, transactionType, amount, txNotes,
        config.operation_type === 'transfer' ? config.target_record_id! : undefined
      )

      // For transfer: deposit to target
      if (config.operation_type === 'transfer' && config.target_record_id) {
        const targetDrawer = await getOrCreateDrawer(supabase, config.target_record_id)
        if (targetDrawer) {
          const targetTxType = (isNonDrawerSafe && (config.source_id === 'safe-only' || !config.source_id)) ? 'deposit' : 'transfer_in'

          await adjustBalanceAndRecord(
            supabase, targetDrawer.id, config.target_record_id,
            amount, targetTxType, amount,
            `تحويل من خزنة ${safe.name}${resolvedNotes ? ` - ${resolvedNotes}` : ''}`,
            sourceRecordId
          )
        }
      }

      return {
        status: 'success',
        message: `تم ${opLabel} ${roundMoney(amount)} بنجاح`,
        amountExecuted: roundMoney(amount),
        balanceBefore: sourceBalance,
        balanceAfter: roundMoney(newBalance),
        resolvedNotes
      }
    }
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message || 'خطأ غير متوقع',
      amountExecuted: null,
      balanceBefore: null,
      balanceAfter: null,
      resolvedNotes
    }
  }
}
