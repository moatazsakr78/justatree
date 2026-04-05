import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth.config';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: { schema: 'justatree' },
    auth: { persistSession: false, autoRefreshToken: false }
  }
);

async function isAdminCheck(): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user) return false;
    const role = (session.user as any).role;
    return role === 'أدمن رئيسي' || role === 'موظف';
  } catch {
    return false;
  }
}

// GET - fetch banners (public)
export async function GET(req: NextRequest) {
  try {
    const themeId = req.nextUrl.searchParams.get('themeId') || 'just-a-tree';
    const all = req.nextUrl.searchParams.get('all') === 'true';

    let query = (supabaseAdmin as any)
      .from('hero_banners')
      .select('*')
      .eq('theme_id', themeId)
      .order('display_order', { ascending: true });

    if (!all) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - create or update banner (admin only)
export async function POST(req: NextRequest) {
  if (!(await isAdminCheck())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { banner } = body;

    if (banner.id) {
      // Update existing
      const { error } = await (supabaseAdmin as any)
        .from('hero_banners')
        .update({
          name: banner.name,
          background_type: banner.background_type,
          background_value: banner.background_value,
          elements: banner.elements,
          tablet_elements: banner.tablet_elements || [],
          mobile_elements: banner.mobile_elements || [],
          cta_link: banner.cta_link,
          is_active: banner.is_active,
          display_order: banner.display_order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', banner.id);

      if (error) throw error;
    } else {
      // Create new
      const { error } = await (supabaseAdmin as any)
        .from('hero_banners')
        .insert({
          name: banner.name,
          display_order: banner.display_order ?? 0,
          is_active: banner.is_active ?? true,
          theme_id: banner.theme_id || 'just-a-tree',
          slot: banner.slot || 'hero',
          background_type: banner.background_type || 'gradient',
          background_value: banner.background_value,
          canvas_width: banner.canvas_width || 1280,
          canvas_height: banner.canvas_height || 480,
          elements: banner.elements || [],
          tablet_elements: banner.tablet_elements || [],
          mobile_elements: banner.mobile_elements || [],
          cta_link: banner.cta_link,
        });

      if (error) throw error;
    }

    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - delete banner (admin only)
export async function DELETE(req: NextRequest) {
  if (!(await isAdminCheck())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { bannerId } = await req.json();

    const { error } = await (supabaseAdmin as any)
      .from('hero_banners')
      .delete()
      .eq('id', bannerId);

    if (error) throw error;

    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
