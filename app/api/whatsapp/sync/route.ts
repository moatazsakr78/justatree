import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchMessageLogs, cleanPhoneNumber } from '@/app/lib/whatsapp';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Sync messages from WasenderAPI message logs
// ?phone=XXX - Sync only for specific phone number
// No params - Sync all recent messages
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phoneNumber = searchParams.get('phone');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    console.log(`🔄 Starting message sync (phone: ${phoneNumber || 'all'}, limit: ${limit})...`);

    // 1. Fetch message logs from WasenderAPI
    const { logs: messageLogs, debug } = await fetchMessageLogs(limit);

    // Log debug info for troubleshooting
    console.log('📋 Sync debug info:', JSON.stringify(debug, null, 2));

    if (messageLogs.length === 0) {
      // Return error info if there's a configuration issue
      const hasConfigError = debug.error && (
        debug.error.includes('session ID') ||
        debug.error.includes('token') ||
        debug.error.includes('API Error')
      );

      return NextResponse.json({
        success: !hasConfigError,
        synced: 0,
        message: debug.error || 'لا توجد رسائل للمزامنة',
        // Always include debug info if there's an error
        debug: hasConfigError || process.env.NODE_ENV === 'development' ? debug : undefined
      }, { status: hasConfigError ? 400 : 200 });
    }

    console.log(`📋 Got ${messageLogs.length} messages from WasenderAPI`);

    // 2. Filter by phone number if specified
    let logsToSync = messageLogs;
    if (phoneNumber) {
      const cleanedPhone = cleanPhoneNumber(phoneNumber);
      logsToSync = messageLogs.filter(log => {
        // For outgoing messages (fromMe): match the recipient (to)
        // For incoming messages: match the sender (from)
        const logPhone = log.fromMe
          ? cleanPhoneNumber(log.to || log.from)
          : cleanPhoneNumber(log.from || log.to);
        return logPhone === cleanedPhone;
      });
      console.log(`📱 Filtered to ${logsToSync.length} messages for ${cleanedPhone}`);
    }

    // 3. Get existing message IDs from database to avoid duplicates
    const messageIds = logsToSync.map(log => log.id).filter(Boolean);

    if (messageIds.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'لا توجد رسائل جديدة'
      });
    }

    // Fetch existing messages in batches (Supabase limit)
    const BATCH_SIZE = 200;
    const existingMessageIds = new Set<string>();

    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
      const batch = messageIds.slice(i, i + BATCH_SIZE);
      const { data: existingMessages } = await supabase
        .schema('elfaroukgroup')
        .from('whatsapp_messages')
        .select('message_id')
        .in('message_id', batch);

      if (existingMessages) {
        existingMessages.forEach(m => existingMessageIds.add(m.message_id));
      }
    }

    console.log(`📊 Found ${existingMessageIds.size} existing messages in database`);

    // 4. Filter out messages that already exist
    const newMessages = logsToSync.filter(log => !existingMessageIds.has(log.id));

    if (newMessages.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'جميع الرسائل موجودة بالفعل'
      });
    }

    console.log(`✨ Found ${newMessages.length} new messages to sync`);

    // 5. Insert new messages
    let syncedCount = 0;
    const errors: string[] = [];

    for (const log of newMessages) {
      try {
        // Determine phone number (for both incoming and outgoing)
        const fromNumber = log.fromMe
          ? cleanPhoneNumber(log.to || log.from) // Outgoing: use recipient
          : cleanPhoneNumber(log.from); // Incoming: use sender

        if (!fromNumber) {
          console.warn(`⚠️ Skipping message with no phone number: ${log.id}`);
          continue;
        }

        // Determine media type
        let mediaType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' = 'text';
        const msgType = (log.messageType || '').toLowerCase();
        if (msgType.includes('image') || msgType.includes('sticker')) {
          mediaType = 'image';
        } else if (msgType.includes('video')) {
          mediaType = 'video';
        } else if (msgType.includes('audio') || msgType.includes('voice') || msgType.includes('ptt')) {
          mediaType = 'audio';
        } else if (msgType.includes('document')) {
          mediaType = 'document';
        } else if (msgType.includes('location')) {
          mediaType = 'location';
        } else if (msgType.includes('contact')) {
          mediaType = 'contact';
        }

        // Determine message text
        let messageText = log.messageBody || '';
        if (!messageText && mediaType !== 'text') {
          const mediaLabels: Record<string, string> = {
            'image': '[صورة]',
            'video': '[فيديو]',
            'audio': '[رسالة صوتية]',
            'document': '[مستند]',
            'location': '[موقع]',
            'contact': '[جهة اتصال]',
          };
          messageText = mediaLabels[mediaType] || '[رسالة]';
        }

        // Calculate timestamp
        const timestamp = log.timestamp
          ? new Date(log.timestamp > 9999999999 ? log.timestamp : log.timestamp * 1000)
          : new Date();

        const { error: insertError } = await supabase
          .schema('elfaroukgroup')
          .from('whatsapp_messages')
          .upsert({
            message_id: log.id,
            msg_id: log.msgId || null,
            from_number: fromNumber,
            customer_name: log.fromMe ? 'الفاروق جروب' : (log.pushName || fromNumber),
            message_text: messageText,
            message_type: log.fromMe ? 'outgoing' : 'incoming',
            media_type: mediaType,
            media_url: log.mediaUrl || null,
            is_read: log.fromMe ? true : false,
            created_at: timestamp.toISOString(),
          }, {
            onConflict: 'message_id',
            ignoreDuplicates: true
          });

        if (insertError) {
          console.error(`❌ Error inserting message ${log.id}:`, insertError.message);
          errors.push(`${log.id}: ${insertError.message}`);
        } else {
          syncedCount++;
          console.log(`✅ Synced ${log.fromMe ? 'outgoing' : 'incoming'} message: ${log.id}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Error processing message ${log.id}:`, errorMessage);
        errors.push(`${log.id}: ${errorMessage}`);
      }
    }

    console.log(`🎉 Sync complete: ${syncedCount} new messages added`);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      total: logsToSync.length,
      existing: existingMessageIds.size,
      errors: errors.length > 0 ? errors : undefined,
      message: syncedCount > 0
        ? `تمت مزامنة ${syncedCount} رسالة جديدة`
        : 'لا توجد رسائل جديدة للمزامنة'
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ أثناء المزامنة',
      synced: 0
    }, { status: 500 });
  }
}
