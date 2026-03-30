import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/app/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// PATCH: Update an automation
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  try {
    const body = await request.json()

    // If schedule changed, recompute next_scheduled_at
    if (body.schedule_type || body.schedule_time || body.schedule_days_of_week !== undefined || body.schedule_day_of_month !== undefined) {
      // Get current automation to fill in missing fields
      const { data: current } = await (supabase as any)
        .from('safe_automations')
        .select('*')
        .eq('id', id)
        .single()

      if (current) {
        const { data: nextRun } = await supabase.rpc(
          'compute_next_automation_run' as any,
          {
            p_schedule_type: body.schedule_type || current.schedule_type,
            p_schedule_time: body.schedule_time || current.schedule_time,
            p_schedule_days_of_week: body.schedule_days_of_week !== undefined ? body.schedule_days_of_week : current.schedule_days_of_week,
            p_schedule_day_of_month: body.schedule_day_of_month !== undefined ? body.schedule_day_of_month : current.schedule_day_of_month
          }
        )
        body.next_scheduled_at = nextRun
      }
    }

    // If toggling is_active on, recompute next run
    if (body.is_active === true) {
      const { data: current } = await (supabase as any)
        .from('safe_automations')
        .select('*')
        .eq('id', id)
        .single()

      if (current) {
        const { data: nextRun } = await supabase.rpc(
          'compute_next_automation_run' as any,
          {
            p_schedule_type: current.schedule_type,
            p_schedule_time: current.schedule_time,
            p_schedule_days_of_week: current.schedule_days_of_week,
            p_schedule_day_of_month: current.schedule_day_of_month
          }
        )
        body.next_scheduled_at = nextRun
      }
    }

    body.updated_at = new Date().toISOString()

    const { data, error } = await (supabase as any)
      .from('safe_automations')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: Remove an automation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabaseAdmin()

  const { error } = await (supabase as any)
    .from('safe_automations')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
