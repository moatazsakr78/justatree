import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { executeAutomation, type AutomationConfig } from '@/app/lib/services/safeAutomationExecutor'

export const dynamic = 'force-dynamic'

// POST: Manually execute an automation now
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  try {
    // Get the automation
    const { data: auto, error: fetchError } = await (supabase as any)
      .from('safe_automations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !auto) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    // Execute it
    const config: AutomationConfig = {
      id: auto.id,
      record_id: auto.record_id,
      operation_type: auto.operation_type,
      source_id: auto.source_id,
      all_mode: auto.all_mode,
      amount_type: auto.amount_type,
      fixed_amount: auto.fixed_amount || 0,
      target_record_id: auto.target_record_id,
      notes_template: auto.notes_template || ''
    }

    const result = await executeAutomation(config)

    // Log the execution
    await (supabase as any)
      .from('safe_automation_logs')
      .insert({
        automation_id: auto.id,
        status: result.status,
        message: result.message,
        amount_executed: result.amountExecuted,
        balance_before: result.balanceBefore,
        balance_after: result.balanceAfter,
        resolved_notes: result.resolvedNotes,
        scheduled_for: new Date().toISOString()
      })

    // Update last execution info (but don't change next_scheduled_at for manual runs)
    await (supabase as any)
      .from('safe_automations')
      .update({
        last_executed_at: new Date().toISOString(),
        last_execution_status: result.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', auto.id)

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
