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

// GET - Fetch all website themes
export async function GET() {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from('website_themes')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching website themes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add new website theme
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { themeId, name, description, thumbnailUrl } = body;

    if (!themeId || !name) {
      return NextResponse.json({ error: 'themeId and name are required' }, { status: 400 });
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('website_themes')
      .insert({
        theme_id: themeId,
        name,
        description: description || '',
        thumbnail_url: thumbnailUrl || '',
        is_active: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding website theme:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete website theme
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Theme ID is required' }, { status: 400 });
    }

    // Prevent deleting active theme
    const { data: theme } = await (supabaseAdmin as any)
      .from('website_themes')
      .select('is_active')
      .eq('id', id)
      .single();

    if (theme?.is_active) {
      return NextResponse.json({ error: 'لا يمكن حذف القالب النشط' }, { status: 400 });
    }

    const { error } = await (supabaseAdmin as any)
      .from('website_themes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting website theme:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
