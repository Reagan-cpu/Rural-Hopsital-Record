import cron from 'node-cron';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { sendSms } from '../lib/smsGateway.js';
import { logger } from '../lib/logger.js';

const BATCH = 50;
const MAX_RETRIES = 3;

export async function processNotifications() {
  const now = new Date().toISOString();

  // Fetch pending notifications due now (up to BATCH)
  const { data: rows, error } = await supabaseAdmin
    .from('notifications')
    .select('id, recipient_user_id, channel, message, phone_number, delivery_status')
    .lte('scheduled_for', now)
    .eq('delivery_status', 'pending')
    .limit(BATCH);

  if (error) {
    logger.error(`Notification worker fetch error: ${error.message}`);
    return;
  }
  if (!rows || rows.length === 0) return;

  logger.info(`Processing ${rows.length} notification(s)`);

  for (const n of rows) {
    try {
      if (n.channel === 'sms' && n.phone_number) {
        const { success, externalId, error: smsErr } = await sendSms(n.phone_number, n.message);
        if (success) {
          await supabaseAdmin.from('notifications').update({
            delivery_status: 'sent',
            sent_at: new Date().toISOString(),
            external_id: externalId,
          }).eq('id', n.id);
        } else {
          await incrementRetry(n.id, smsErr);
        }
      } else {
        // in_app: mark as sent immediately
        await supabaseAdmin.from('notifications').update({
          delivery_status: 'sent',
          sent_at: new Date().toISOString(),
        }).eq('id', n.id);
      }
    } catch (err) {
      logger.error(`Notification ${n.id} failed: ${err.message}`);
      await incrementRetry(n.id, err.message);
    }
  }
}

async function incrementRetry(id, reason) {
  // Fetch current retry count from external_id field (repurposed as retry counter when null)
  // Use a separate meta approach: store retry count in external_id as "retry:N"
  const { data } = await supabaseAdmin
    .from('notifications')
    .select('external_id')
    .eq('id', id)
    .single();

  const currentRetries = parseInt((data?.external_id || '').replace('retry:', '')) || 0;

  if (currentRetries >= MAX_RETRIES - 1) {
    await supabaseAdmin.from('notifications').update({
      delivery_status: 'failed',
      external_id: `failed:${reason?.slice(0, 100)}`,
    }).eq('id', id);
  } else {
    const delay = Math.pow(2, currentRetries + 1) * 60 * 1000; // 2m, 4m, 8m backoff
    await supabaseAdmin.from('notifications').update({
      scheduled_for: new Date(Date.now() + delay).toISOString(),
      external_id: `retry:${currentRetries + 1}`,
    }).eq('id', id);
  }
}

export function startNotificationWorker() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      await processNotifications();
    } catch (err) {
      logger.error(`Notification worker crash: ${err.message}`);
    }
  });

  logger.info('Notification worker started (every 15 min)');
}
