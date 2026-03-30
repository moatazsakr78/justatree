import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth.config';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: { schema: 'elfaroukgroup' },
    auth: { persistSession: false, autoRefreshToken: false }
  }
);

// POST - Activate a website theme
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Theme ID is required' }, { status: 400 });
    }

    // Deactivate all themes
    const { error: deactivateError } = await (supabaseAdmin as any)
      .from('website_themes')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deactivateError) {
      console.error('Error deactivating website themes:', deactivateError);
      return NextResponse.json({ error: deactivateError.message }, { status: 500 });
    }

    // Activate the selected theme
    const { error: activateError } = await (supabaseAdmin as any)
      .from('website_themes')
      .update({ is_active: true })
      .eq('id', id);

    if (activateError) {
      console.error('Error activating website theme:', activateError);
      return NextResponse.json({ error: activateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
