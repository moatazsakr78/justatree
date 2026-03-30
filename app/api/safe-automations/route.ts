import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET: List automations (optionally filtered by record_id)
export async function GET(request: Request) {
  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(request.url)
  const recordId = searchParams.get('record_id')

  let query = (supabase as any)
    .from('safe_automations')
    .select('*, safe_automation_logs(id, status, message, amount_executed, executed_at)')
    .order('created_at', { ascending: false })

  if (recordId) {
    query = query.eq('record_id', recordId)
  }

  // Limit logs to last 5 per automation
  query = query.order('executed_at', { referencedTable: 'safe_automation_logs', ascending: false })
    .limit(5, { referencedTable: 'safe_automation_logs' })

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

// POST: Create a new automation
export async function POST(request: Request) {
  const supabase = getSupabaseAdmin()

  try {
    const body = await request.json()

    const {
      record_id,
      name,
      operation_type,
      source_id,
      all_mode,
      amount_type,
      fixed_amount,
      target_record_id,
      notes_template,
      schedule_type,
      schedule_time,
      schedule_days_of_week,
      schedule_day_of_month,
      created_by
    } = body

    // Validate required fields
    if (!record_id || !name || !operation_type || !amount_type || !schedule_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (operation_type === 'transfer' && !target_record_id) {
      return NextResponse.json({ error: 'target_record_id required for transfers' }, { status: 400 })
    }

    // Compute next_scheduled_at
    const { data: nextRun, error: rpcError } = await supabase.rpc(
      'compute_next_automation_run' as any,
      {
        p_schedule_type: schedule_type,
        p_schedule_time: schedule_time || '06:00',
        p_schedule_days_of_week: schedule_days_of_week || null,
        p_schedule_day_of_month: schedule_day_of_month || null
      }
    )

    if (rpcError) {
      return NextResponse.json({ error: `Schedule computation failed: ${rpcError.message}` }, { status: 500 })
    }

    const { data, error } = await (supabase as any)
      .from('safe_automations')
      .insert({
        record_id,
        name,
        operation_type,
        source_id: source_id || '',
        all_mode: all_mode || null,
        amount_type,
        fixed_amount: fixed_amount || 0,
        target_record_id: target_record_id || null,
        notes_template: notes_template || '',
        schedule_type,
        schedule_time: schedule_time || '06:00',
        schedule_days_of_week: schedule_days_of_week || null,
        schedule_day_of_month: schedule_day_of_month || null,
        next_scheduled_at: nextRun,
        created_by: created_by || 'system'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
