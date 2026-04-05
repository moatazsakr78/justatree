import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WASENDER_API_URL = 'https://www.wasenderapi.com/api';

// Get API token from database
async function getApiToken(): Promise<string | null> {
  try {
    const { data } = await supabase
      .schema('justatree')
      .from('api_keys')
      .select('key_value')
      .eq('key_name', 'wasender_api_token')
      .single();
    return data?.key_value || process.env.WASENDER_API_TOKEN || null;
  } catch {
    return process.env.WASENDER_API_TOKEN || null;
  }
}

// Fetch and store profile picture
async function fetchProfilePicture(phoneNumber: string, token: string): Promise<string | null> {
  try {
    console.log('📷 Fetching profile picture for:', phoneNumber);

    const response = await fetch(`${WASENDER_API_URL}/contacts/${phoneNumber}/picture`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      console.log('⚠️ Profile picture not available for:', phoneNumber);
      return null;
    }

    const data = await response.json();
    if (!data.success || !data.data?.imgUrl) {
      console.log('⚠️ No profile picture URL in response for:', phoneNumber);
      return null;
    }

    console.log('📥 Downloading profile picture from:', data.data.imgUrl);

    // Download the image
    const imageResponse = await fetch(data.data.imgUrl);
    if (!imageResponse.ok) {
      console.error('❌ Failed to download profile picture');
      return null;
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Upload to Supabase Storage
    const filePath = `profiles/${phoneNumber}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('whatsapp')
      .upload(filePath, imageBuffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Failed to upload:', uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('whatsapp')
      .getPublicUrl(filePath);

    console.log('✅ Profile picture stored:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error) {
    console.error('❌ Error fetching profile picture:', error);
    return null;
  }
}

// POST - Sync all contacts and fetch their profile pictures
export async function POST() {
  try {
    const token = await getApiToken();
    if (!token) {
      return NextResponse.json({ error: 'No API token configured' }, { status: 400 });
    }

    // Get all unique contacts from messages
    const { data: messagesContacts, error: msgError } = await supabase
      .schema('justatree')
      .from('whatsapp_messages')
      .select('from_number, customer_name')
      .order('created_at', { ascending: false });

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    // Get unique contacts
    const uniqueContacts = new Map<string, string>();
    for (const msg of messagesContacts || []) {
      if (msg.from_number && !uniqueContacts.has(msg.from_number)) {
        uniqueContacts.set(msg.from_number, msg.customer_name || msg.from_number);
      }
    }

    console.log(`🔄 Syncing ${uniqueContacts.size} contacts...`);

    const results = {
      total: uniqueContacts.size,
      synced: 0,
      withPicture: 0,
      errors: 0
    };

    // Process each contact
    for (const [phoneNumber, customerName] of Array.from(uniqueContacts.entries())) {
      try {
        // Check if contact exists
        const { data: existing } = await supabase
          .schema('justatree')
          .from('whatsapp_contacts')
          .select('id, profile_picture_url, last_picture_fetch')
          .eq('phone_number', phoneNumber)
          .single();

        // Skip if already has recent profile picture
        // - 24 hours cooldown if profile picture exists
        // - 1 hour cooldown if profile picture is null (to retry more frequently)
        if (existing?.last_picture_fetch) {
          const lastFetch = new Date(existing.last_picture_fetch);
          const hoursDiff = (Date.now() - lastFetch.getTime()) / (1000 * 60 * 60);
          const cooldownHours = existing.profile_picture_url ? 24 : 1;
          if (hoursDiff < cooldownHours) {
            console.log(`⏭️ Skipping (cooldown ${cooldownHours}h):`, phoneNumber);
            results.synced++;
            if (existing.profile_picture_url) results.withPicture++;
            continue;
          }
        }

        // Fetch profile picture
        const pictureUrl = await fetchProfilePicture(phoneNumber, token);

        // Upsert contact
        const { error: upsertError } = await supabase
          .schema('justatree')
          .from('whatsapp_contacts')
          .upsert({
            phone_number: phoneNumber,
            customer_name: customerName,
            profile_picture_url: pictureUrl,
            last_picture_fetch: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'phone_number'
          });

        if (upsertError) {
          console.error('❌ Error upserting contact:', upsertError.message);
          results.errors++;
        } else {
          results.synced++;
          if (pictureUrl) results.withPicture++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error('❌ Error processing contact:', phoneNumber, error);
        results.errors++;
      }
    }

    console.log('✅ Sync complete:', results);
    return NextResponse.json({
      success: true,
      message: `تم مزامنة ${results.synced} جهة اتصال، ${results.withPicture} منهم لديهم صور`,
      results
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get sync status
export async function GET() {
  try {
    // Count total unique contacts from messages
    const { data: messages } = await supabase
      .schema('justatree')
      .from('whatsapp_messages')
      .select('from_number');

    const uniqueFromMessages = new Set((messages || []).map(m => m.from_number)).size;

    // Count contacts with profile pictures
    const { data: contacts } = await supabase
      .schema('justatree')
      .from('whatsapp_contacts')
      .select('id, profile_picture_url');

    const totalContacts = contacts?.length || 0;
    const withPictures = contacts?.filter(c => c.profile_picture_url).length || 0;

    return NextResponse.json({
      totalFromMessages: uniqueFromMessages,
      totalContacts,
      withPictures,
      needsSync: uniqueFromMessages - totalContacts
    });
  } catch (error) {
    console.error('❌ Error getting sync status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
