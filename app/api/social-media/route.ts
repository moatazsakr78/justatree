import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'justatree'
  }
});

// GET - Fetch all social media links
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = supabase
      .from('social_media_links')
      .select('*')
      .order('display_order', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching social media links:', error);
      return NextResponse.json(
        { error: 'فشل في جلب روابط السوشيال ميديا' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Error in GET /api/social-media:', err);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

// POST - Create a new social media link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, platform_icon, custom_icon_url, link_url, whatsapp_number, is_active = true } = body;

    // Validation
    if (!platform || !platform_icon) {
      return NextResponse.json(
        { error: 'اسم المنصة ونوع الأيقونة مطلوبان' },
        { status: 400 }
      );
    }

    // For WhatsApp, require whatsapp_number; for others, require link_url
    if (platform_icon === 'whatsapp') {
      if (!whatsapp_number) {
        return NextResponse.json(
          { error: 'رقم الواتساب مطلوب' },
          { status: 400 }
        );
      }
    } else {
      if (!link_url) {
        return NextResponse.json(
          { error: 'رابط المنصة مطلوب' },
          { status: 400 }
        );
      }
    }

    // Get max display_order
    const { data: maxOrderData } = await supabase
      .from('social_media_links')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrderData?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('social_media_links')
      .insert({
        platform,
        platform_icon,
        custom_icon_url: custom_icon_url || null,
        link_url: link_url || '',
        whatsapp_number: whatsapp_number || null,
        is_active,
        display_order: newOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating social media link:', error);
      return NextResponse.json(
        { error: 'فشل في إضافة الرابط' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/social-media:', err);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

// PUT - Update a social media link
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الرابط مطلوب' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('social_media_links')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating social media link:', error);
      return NextResponse.json(
        { error: 'فشل في تحديث الرابط' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Error in PUT /api/social-media:', err);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a social media link
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الرابط مطلوب' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('social_media_links')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting social media link:', error);
      return NextResponse.json(
        { error: 'فشل في حذف الرابط' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/social-media:', err);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
