import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'
import { executeAutomation, type AutomationConfig } from '@/app/lib/services/safeAutomationExecutor'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const results: any[] = []

  try {
    // Get due automations
    const { data: automations, error } = await (supabase as any)
      .from('safe_automations')
      .select('*')
      .eq('is_active', true)
      .lte('next_scheduled_at', new Date().toISOString())
      .order('next_scheduled_at', { ascending: true })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!automations || automations.length === 0) {
      return NextResponse.json({ message: 'No automations due', count: 0 })
    }

    for (const auto of automations) {
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
          scheduled_for: auto.next_scheduled_at
        })

      // Compute next scheduled time
      const { data: nextRun } = await supabase.rpc(
        'compute_next_automation_run' as any,
        {
          p_schedule_type: auto.schedule_type,
          p_schedule_time: auto.schedule_time,
          p_schedule_days_of_week: auto.schedule_days_of_week,
          p_schedule_day_of_month: auto.schedule_day_of_month
        }
      )

      // Update automation
      await (supabase as any)
        .from('safe_automations')
        .update({
          last_executed_at: new Date().toISOString(),
          last_execution_status: result.status,
          next_scheduled_at: nextRun,
          updated_at: new Date().toISOString()
        })
        .eq('id', auto.id)

      results.push({ id: auto.id, name: auto.name, ...result })
    }

    return NextResponse.json({ message: 'Automations processed', count: results.length, results })
  } catch (err: any) {
    console.error('Cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
