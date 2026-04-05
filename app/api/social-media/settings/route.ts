import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'justatree'
  }
});

// GET - Fetch social media settings
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('social_media_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching social media settings:', error);
      return NextResponse.json(
        { error: 'فشل في جلب الإعدادات' },
        { status: 500 }
      );
    }

    // Return default settings if none exist
    if (!data) {
      return NextResponse.json({
        id: null,
        icon_shape: 'square',
        updated_at: new Date().toISOString()
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Error in GET /api/social-media/settings:', err);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}

// PUT - Update social media settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { icon_shape } = body;

    // Validation
    if (icon_shape && !['square', 'rounded'].includes(icon_shape)) {
      return NextResponse.json(
        { error: 'شكل الأيقونة يجب أن يكون square أو rounded' },
        { status: 400 }
      );
    }

    // Check if settings exist
    const { data: existingSettings } = await supabase
      .from('social_media_settings')
      .select('id')
      .single();

    let result;

    if (existingSettings) {
      // Update existing settings
      const { data, error } = await supabase
        .from('social_media_settings')
        .update({ icon_shape })
        .eq('id', existingSettings.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from('social_media_settings')
        .insert({ icon_shape: icon_shape || 'square' })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error in PUT /api/social-media/settings:', err);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}
