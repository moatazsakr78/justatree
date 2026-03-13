import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase/admin'

export async function DELETE() {
  try {
    const { data, error } = await supabaseAdmin.rpc('delete_all_test_data' as any)

    if (error) {
      console.error('Error deleting test data:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
