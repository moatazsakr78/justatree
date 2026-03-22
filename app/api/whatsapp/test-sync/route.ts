import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchMessageLogs } from '@/app/lib/whatsapp';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Test the sync endpoint and return detailed debug info
export async function GET() {
  try {
    console.log('🧪 Testing WhatsApp sync endpoint...');

    // Check environment variables
    const envCheck = {
      WASENDER_API_TOKEN: !!process.env.WASENDER_API_TOKEN,
      WASENDER_SESSION_ID: process.env.WASENDER_SESSION_ID || 'NOT SET',
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    };

    console.log('🔧 Environment check:', envCheck);

    // Try to fetch message logs with detailed debug (50 messages for better coverage)
    const { logs, debug } = await fetchMessageLogs(50);

    // Separate outgoing messages for analysis
    const outgoingMessages = logs.filter(log => log.fromMe).map(log => ({
      id: log.id,
      from: log.from,
      to: log.to,
      fromMe: log.fromMe,
      messageBody: log.messageBody?.substring(0, 80) || '[empty]',
      messageType: log.messageType,
      timestamp: new Date(log.timestamp > 9999999999 ? log.timestamp : log.timestamp * 1000).toISOString(),
    }));

    const incomingMessages = logs.filter(log => !log.fromMe);

    // Sample of first 5 messages (all types)
    const sampleMessages = logs.slice(0, 5).map(log => ({
      id: log.id,
      from: log.from,
      to: log.to,
      fromMe: log.fromMe,
      messageBody: log.messageBody?.substring(0, 50) + (log.messageBody && log.messageBody.length > 50 ? '...' : ''),
      messageType: log.messageType,
      timestamp: new Date(log.timestamp > 9999999999 ? log.timestamp : log.timestamp * 1000).toISOString(),
    }));

    // Show raw API response format (first item only, for debugging field names)
    const rawFirstItem = debug.responseData?.data?.[0] || debug.responseData?.logs?.[0] || debug.responseData?.messages?.[0] || null;

    // Check recent webhook logs for messages.upsert events
    let webhookLogs: any[] = [];
    try {
      const { data: logs } = await supabase
        .schema('elfaroukgroup')
        .from('whatsapp_webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      webhookLogs = (logs || []).map((log: any) => ({
        event_type: log.event_type,
        is_outgoing: log.is_outgoing,
        created_at: log.created_at,
        raw_data_preview: log.raw_data?.substring(0, 200) || '[empty]',
      }));
    } catch (e) {
      // Table might not exist yet
    }

    const upsertEvents = webhookLogs.filter(l => l.event_type === 'messages.upsert');
    const outgoingWebhookEvents = webhookLogs.filter(l => l.is_outgoing);

    return NextResponse.json({
      success: true,
      environment: envCheck,
      summary: {
        totalMessages: logs.length,
        outgoingCount: outgoingMessages.length,
        incomingCount: incomingMessages.length,
        webhookLogsCount: webhookLogs.length,
        upsertEventsCount: upsertEvents.length,
        outgoingWebhookEventsCount: outgoingWebhookEvents.length,
      },
      outgoingMessages,
      sampleMessages,
      rawFirstItemFromAPI: rawFirstItem ? JSON.stringify(rawFirstItem).substring(0, 1000) : 'No data',
      webhookLogs,
      debug: debug,
      message: logs.length > 0
        ? `Found ${logs.length} messages (${outgoingMessages.length} outgoing, ${incomingMessages.length} incoming)`
        : debug.error || 'No messages found - check debug info for details'
    });

  } catch (error) {
    console.error('🧪 Test sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
