import { Hono } from 'hono';
import type { HonoEnv } from '../index';
import { sendTelegram } from '../index';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema';

export const callbackRouter = new Hono<HonoEnv>();

// ─── Apirone payment callback for platform subscriptions ─────────────────────
callbackRouter.post('/payment', async (c) => {
  const ref = c.req.query('ref');
  const secret = c.req.query('secret');

  if (!ref || secret !== c.env.WEBHOOK_SECRET) {
    return c.text('Unauthorized', 401);
  }

  const body = await c.req.json() as ApironeCallback;
  const db = c.get('db');

  const invoice = await db.query.invoices.findFirst({
    where: eq(schema.invoices.invoiceRef, ref),
  });

  if (!invoice) return c.text('ok'); // Return ok to stop retries

  // Log transaction
  await db.insert(schema.transactions).values({
    invoiceId: invoice.id,
    userId: invoice.userId,
    txHash: body.input_transaction_hash,
    inputAddress: body.input_address,
    currency: body.currency || invoice.currency,
    valueMinor: String(body.value || 0),
    confirmations: body.confirmations || 0,
    callbackPayload: JSON.stringify(body),
  }).onConflictDoNothing();

  // Handle invoice callbacks
  if (body.invoice) {
    await handleInvoiceCallback(body, invoice, db, c.env);
  }

  return c.text('ok');
});

// ─── Apirone payment callback for channel subscriptions ──────────────────────
callbackRouter.post('/channel', async (c) => {
  const ref = c.req.query('ref');
  const secret = c.req.query('secret');

  if (!ref || secret !== c.env.WEBHOOK_SECRET) {
    return c.text('Unauthorized', 401);
  }

  const body = await c.req.json() as ApironeInvoiceCallback;
  const db = c.get('db');

  const invoice = await db.query.invoices.findFirst({
    where: eq(schema.invoices.invoiceRef, ref),
    with: {
      channelProduct: true,
      subscriptionPlan: true,
    },
  });

  if (!invoice) return c.text('ok');

  if (body.status === 'completed' || body.status === 'paid' || body.status === 'overpaid') {
    await db.update(schema.invoices)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(schema.invoices.invoiceRef, ref));

    // Create channel subscription
    if (invoice.channelProductId && invoice.subscriptionPlanId) {
      await activateChannelSubscription(invoice, db, c.env);
    }
  } else {
    await db.update(schema.invoices)
      .set({ status: body.status as never, updatedAt: new Date() })
      .where(eq(schema.invoices.invoiceRef, ref));
  }

  return c.text('ok');
});

// ─── Merchant webhook callback ────────────────────────────────────────────────
callbackRouter.post('/merchant', async (c) => {
  const ref = c.req.query('ref');
  const secret = c.req.query('secret');
  const db = c.get('db');

  const invoice = await db.query.invoices.findFirst({
    where: eq(schema.invoices.invoiceRef, ref || ''),
    with: { merchant: true },
  });

  if (!invoice || !invoice.merchantId) return c.text('ok');

  const merchantSecret = (invoice.merchant as unknown as { webhookSecret: string })?.webhookSecret;
  if (secret !== merchantSecret) return c.text('Unauthorized', 401);

  const body = await c.req.json() as ApironeInvoiceCallback;

  await db.update(schema.invoices)
    .set({ status: body.status as never, updatedAt: new Date() })
    .where(eq(schema.invoices.invoiceRef, ref || ''));

  // Forward to merchant's configured webhook if any
  // (Could be extended with a merchant.webhookUrl field)

  return c.text('ok');
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function handleInvoiceCallback(
  body: ApironeCallback & { invoice?: ApironeInvoiceStatus },
  invoice: typeof schema.invoices.$inferSelect,
  db: ReturnType<typeof import('drizzle-orm/d1').drizzle<typeof schema>>,
  env: typeof import('../index').Env extends never ? never : typeof import('../index').Env
) {
  const newStatus = body.invoice?.status;
  if (!newStatus) return;

  await db.update(schema.invoices)
    .set({ status: newStatus as never, updatedAt: new Date() })
    .where(eq(schema.invoices.id, invoice.id));

  if (newStatus === 'completed' || newStatus === 'paid' || newStatus === 'overpaid') {
    if (invoice.type === 'platform_sub') {
      // Activate Pro plan for 30 days
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.update(schema.users)
        .set({ plan: 'pro', planExpiresAt: expiresAt })
        .where(eq(schema.users.id, invoice.userId));

      await sendTelegram(env.BOT_TOKEN, 'sendMessage', {
        chat_id: invoice.userId,
        text: `🎉 <b>Pro Plan Activated!</b>\n\nYou now have <b>unlimited transactions</b> for 30 days.\n\nEnjoy CryptonetPay Pro! 🚀`,
        parse_mode: 'HTML',
      });
    } else if (invoice.type === 'channel_sub') {
      await activateChannelSubscription(invoice, db, env);
    }
  } else if (newStatus === 'expired') {
    await sendTelegram(env.BOT_TOKEN, 'sendMessage', {
      chat_id: invoice.userId,
      text: `⏰ Your payment invoice expired.\n\nPlease create a new order if you wish to continue.`,
    });
  }
}

async function activateChannelSubscription(
  invoice: typeof schema.invoices.$inferSelect,
  db: ReturnType<typeof import('drizzle-orm/d1').drizzle<typeof schema>>,
  env: typeof import('../index').Env extends never ? never : typeof import('../index').Env
) {
  if (!invoice.channelProductId || !invoice.subscriptionPlanId) return;

  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(schema.subscriptionPlans.id, invoice.subscriptionPlanId),
    with: { channelProduct: true },
  });

  if (!plan) return;

  // Check if subscription already exists (avoid duplicates)
  const existing = await db.query.channelSubscriptions.findFirst({
    where: and(
      eq(schema.channelSubscriptions.invoiceId, invoice.id),
      eq(schema.channelSubscriptions.status, 'active')
    ),
  });
  if (existing) return;

  // Check max users limit
  if (plan.maxUsers) {
    const activeCount = await db.$count(
      schema.channelSubscriptions,
      and(
        eq(schema.channelSubscriptions.channelProductId, invoice.channelProductId),
        eq(schema.channelSubscriptions.status, 'active')
      )
    );
    if (activeCount >= plan.maxUsers) {
      await sendTelegram(env.BOT_TOKEN, 'sendMessage', {
        chat_id: invoice.userId,
        text: `❌ Sorry, this subscription is currently full. Please contact the owner or try again later.`,
      });
      return;
    }
  }

  // Create invite link
  const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
  const inviteLinkRes = await sendTelegram(env.BOT_TOKEN, 'createChatInviteLink', {
    chat_id: plan.channelProduct.telegramChatId,
    name: `Sub:${invoice.userId}:${Date.now()}`,
    expire_date: Math.floor(expiresAt.getTime() / 1000),
    member_limit: 1,
    creates_join_request: false,
  }) as { invite_link: string };

  const inviteLink = inviteLinkRes.invite_link;
  const linkHash = inviteLink.split('/').pop() || '';

  // Save subscription
  await db.insert(schema.channelSubscriptions).values({
    userId: invoice.userId,
    channelProductId: invoice.channelProductId,
    subscriptionPlanId: invoice.subscriptionPlanId,
    invoiceId: invoice.id,
    inviteLink,
    inviteLinkHash: linkHash,
    status: 'active',
    expiresAt,
  });

  // Send invite link to user
  await sendTelegram(env.BOT_TOKEN, 'sendMessage', {
    chat_id: invoice.userId,
    text: `✅ <b>Subscription Activated!</b>\n\n` +
      `📢 <b>${plan.channelProduct.chatTitle}</b>\n` +
      `⏱ Duration: ${plan.durationDays} days\n` +
      `📅 Expires: ${expiresAt.toLocaleDateString('en-US')}\n\n` +
      `🔗 Your private access link:\n${inviteLink}\n\n` +
      `<i>⚠️ This link is for you only. Do not share it.</i>`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: '📢 Join Channel', url: inviteLink }]],
    },
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApironeCallback {
  value?: number;
  input_address?: string;
  confirmations?: number;
  input_transaction_hash?: string;
  currency?: string;
  account?: string;
  invoice?: ApironeInvoiceStatus;
}

interface ApironeInvoiceStatus {
  account: string;
  invoice: string;
  status: string;
}

interface ApironeInvoiceCallback {
  account: string;
  invoice: string;
  status: string;
}
