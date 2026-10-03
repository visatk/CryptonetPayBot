import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod/v4';
import type { HonoEnv } from '../index';

import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { createApirone } from '../lib/apirone';
import { verifyTelegramInitData } from '../lib/telegram';
import { generateApiKey, nanoid, generateInvoiceRef } from '../lib/utils';
import { SUPPORTED_CURRENCIES, PLAN_LIMITS } from '../lib/constants';
import { sendTelegram } from '../index';

export const apiRouter = new Hono<HonoEnv>();

// ─── Auth Middleware ──────────────────────────────────────────────────────────
// Verifies Telegram WebApp initData for Mini App endpoints
apiRouter.use('/tma/*', async (c, next) => {
  const initData = c.req.header('X-Telegram-InitData') || c.req.query('initData');
  if (!initData) return c.json({ error: 'Missing initData' }, 401);

  const userId = verifyTelegramInitData(initData, c.env.BOT_TOKEN);
  if (!userId) return c.json({ error: 'Invalid initData' }, 401);

  c.set('userId', userId);
  await next();
});

// ─── Merchant API Key Middleware ──────────────────────────────────────────────
apiRouter.use('/merchant/*', async (c, next) => {
  const apiKey = c.req.header('X-API-Key');
  if (!apiKey) return c.json({ error: 'Missing API key' }, 401);

  const db = c.get('db');
  const merchant = await db.query.merchants.findFirst({
    where: and(eq(schema.merchants.apiKey, apiKey), eq(schema.merchants.isActive, true)),
  });
  if (!merchant) return c.json({ error: 'Invalid API key' }, 401);

  c.set('merchant', merchant);
  await next();
});

// ─── TMA: User Profile ────────────────────────────────────────────────────────
apiRouter.get('/tma/me', async (c) => {
  const userId = c.get('userId') as number;
  const db = c.get('db');

  let user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  // Auto-create user from initData if not exists
  if (!user) {
    const initData = c.req.header('X-Telegram-InitData') || '';
    try {
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      if (userStr) {
        const tgUser = JSON.parse(userStr) as {
          id: number; first_name: string; last_name?: string;
          username?: string; language_code?: string;
        };
        await db.insert(schema.users).values({
          id: tgUser.id,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name,
          username: tgUser.username,
          languageCode: tgUser.language_code ?? 'en',
          plan: 'free',
          txCount: 0,
        }).onConflictDoNothing();
        user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
      }
    } catch { /* ignore */ }
  }

  if (!user) return c.json({ error: 'User not found' }, 404);

  return c.json({
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    plan: user.plan,
    txCount: user.txCount,
    planExpiresAt: user.planExpiresAt,
    hasWallet: !!user.apironeAccountId,
    limits: PLAN_LIMITS[user.plan],
  });
});

// ─── TMA: Create/Get Apirone Wallet ──────────────────────────────────────────
apiRouter.post('/tma/wallet/create', async (c) => {
  const userId = c.get('userId') as number;
  const db = c.get('db');

  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) return c.json({ error: 'User not found' }, 404);

  if (user.apironeAccountId) {
    return c.json({ accountId: user.apironeAccountId, message: 'Wallet already exists' });
  }

  // Create Apirone account for user
  const res = await fetch('https://apirone.com/api/v2/accounts', { method: 'POST' });
  if (!res.ok) return c.json({ error: 'Failed to create wallet' }, 500);
  const account = await res.json() as { account: string; 'transfer-key': string };
  if (!account.account) return c.json({ error: 'Failed to create wallet' }, 500);

  await db.update(schema.users)
    .set({
      apironeAccountId: account.account,
      apironeTransferKey: account['transfer-key'],
    })
    .where(eq(schema.users.id, userId));

  return c.json({ accountId: account.account, message: 'Wallet created successfully' });
});

// ─── TMA: Get wallet balances ─────────────────────────────────────────────────
apiRouter.get('/tma/wallet/balance', async (c) => {
  const userId = c.get('userId') as number;
  const db = c.get('db');

  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user?.apironeAccountId) return c.json({ error: 'No wallet' }, 404);

  const apirone = createApirone(user.apironeAccountId, user.apironeTransferKey!);
  const balances = await apirone.getWallets();

  return c.json({ balances });
});

// ─── TMA: Get exchange rates ──────────────────────────────────────────────────
apiRouter.get('/tma/rates', async (c) => {
  const res = await fetch('https://apirone.com/api/v2/ticker?currency=usd');
  const data = await res.json();
  return c.json(data);
});

// ─── TMA: Get supported currencies ───────────────────────────────────────────
apiRouter.get('/tma/currencies', async (c) => {
  return c.json({ currencies: SUPPORTED_CURRENCIES });
});

// ─── TMA: Create invoice ──────────────────────────────────────────────────────
apiRouter.post('/tma/invoice/create', zValidator('json', z.object({
  currency: z.string(),
  amountUsd: z.number().positive(),
  title: z.string().max(100),
  description: z.string().max(500).optional(),
})), async (c) => {
  const userId = c.get('userId') as number;
  const db = c.get('db');
  const { currency, amountUsd, title, description } = c.req.valid('json');

  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) return c.json({ error: 'User not found' }, 404);

  // Check plan limits
  const limit = PLAN_LIMITS[user.plan];
  if (limit.maxTx !== -1 && user.txCount >= limit.maxTx) {
    return c.json({ error: 'Transaction limit reached. Upgrade to Pro for unlimited transactions.' }, 403);
  }

  if (!user.apironeAccountId) return c.json({ error: 'Create a wallet first' }, 400);

  const apirone = createApirone(user.apironeAccountId, user.apironeTransferKey!);
  const rate = await apirone.getRate(currency, 'usd');
  const amountCrypto = (amountUsd / rate.price).toFixed(8);
  const ref = generateInvoiceRef();
  const callbackUrl = `${c.env.MINIAPP_URL}/callback/payment?ref=${ref}&secret=${c.env.WEBHOOK_SECRET}`;

  const invoice = await apirone.createInvoice({
    currency,
    amount: amountCrypto,
    lifetime: 3600,
    callbackUrl,
    userData: { title, description: description || '' },
    linkback: `${c.env.MINIAPP_URL}/invoices`,
  });

  await db.insert(schema.invoices).values({
    invoiceRef: ref,
    apironeInvoiceId: invoice.invoice,
    userId,
    type: 'payment_link',
    currency,
    amountCrypto: String(invoice.amount),
    amountUsd,
    status: 'created',
    callbackUrl,
    paymentAddress: invoice.address,
    apironeInvoiceUrl: invoice['invoice-url'],
    expiresAt: new Date(invoice.expire),
  });

  // Increment tx count
  await db.update(schema.users).set({ txCount: user.txCount + 1 }).where(eq(schema.users.id, userId));

  return c.json({
    ref,
    invoiceId: invoice.invoice,
    address: invoice.address,
    invoiceUrl: invoice['invoice-url'],
    amountCrypto,
    currency,
    amountUsd,
    expires: invoice.expire,
  });
});

// ─── TMA: My invoices ─────────────────────────────────────────────────────────
apiRouter.get('/tma/invoices', async (c) => {
  const userId = c.get('userId') as number;
  const db = c.get('db');

  const page = parseInt(c.req.query('page') || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  const items = await db.query.invoices.findMany({
    where: eq(schema.invoices.userId, userId),
    orderBy: [desc(schema.invoices.createdAt)],
    limit,
    offset,
  });

  return c.json({ items, page, hasMore: items.length === limit });
});

// ─── TMA: My channel subscriptions ───────────────────────────────────────────
apiRouter.get('/tma/subscriptions', async (c) => {
  const userId = c.get('userId') as number;
  const db = c.get('db');

  const subs = await db.query.channelSubscriptions.findMany({
    where: eq(schema.channelSubscriptions.userId, userId),
    with: { channelProduct: true, subscriptionPlan: true },
    orderBy: [desc(schema.channelSubscriptions.createdAt)],
  });

  return c.json({ subscriptions: subs });
});

// ─── TMA: Browse channel products ────────────────────────────────────────────
apiRouter.get('/tma/channels', async (c) => {
  const db = c.get('db');
  const products = await db.query.channelProducts.findMany({
    where: eq(schema.channelProducts.isActive, true),
    with: {
      subscriptionPlans: { where: eq(schema.subscriptionPlans.isActive, true) },
      merchant: true,
    },
  });
  return c.json({ products });
});

// ─── TMA: Get single channel product ─────────────────────────────────────────
apiRouter.get('/tma/channels/:productId', async (c) => {
  const db = c.get('db');
  const productId = parseInt(c.req.param('productId'));
  if (isNaN(productId)) return c.json({ error: 'Invalid product ID' }, 400);

  const product = await db.query.channelProducts.findFirst({
    where: and(eq(schema.channelProducts.id, productId), eq(schema.channelProducts.isActive, true)),
    with: {
      subscriptionPlans: { where: eq(schema.subscriptionPlans.isActive, true) },
      merchant: true,
    },
  });
  if (!product) return c.json({ error: 'Not found' }, 404);
  return c.json({ product });
});

// ─── TMA: Pay for channel subscription ───────────────────────────────────────
apiRouter.post('/tma/channel/:productId/pay', zValidator('json', z.object({
  planId: z.number().int().positive(),
  currency: z.string(),
})), async (c) => {
  const userId = c.get('userId') as number;
  const productId = parseInt(c.req.param('productId'));
  const db = c.get('db');
  const { planId, currency } = c.req.valid('json');

  if (isNaN(productId)) return c.json({ error: 'Invalid product ID' }, 400);

  // Validate plan belongs to product
  const plan = await db.query.subscriptionPlans.findFirst({
    where: and(
      eq(schema.subscriptionPlans.id, planId),
      eq(schema.subscriptionPlans.channelProductId, productId),
      eq(schema.subscriptionPlans.isActive, true),
    ),
    with: { channelProduct: { with: { merchant: true } } },
  });
  if (!plan) return c.json({ error: 'Plan not found' }, 404);

  // Drizzle returns typed nested relations directly
  const channelProduct = plan.channelProduct as typeof schema.channelProducts.$inferSelect & {
    merchant: typeof schema.merchants.$inferSelect;
  };
  const merchant = channelProduct.merchant;
  const apirone = createApirone(merchant.apironeAccountId, merchant.apironeTransferKey);

  const rate = await apirone.getRate(currency, 'usd');
  const amountCrypto = (plan.priceUsd / rate.price).toFixed(8);
  const ref = generateInvoiceRef();
  const callbackUrl = `${c.env.MINIAPP_URL}/callback/channel?ref=${ref}&secret=${c.env.WEBHOOK_SECRET}`;

  const invoice = await apirone.createInvoice({
    currency,
    amount: amountCrypto,
    lifetime: 3600,
    callbackUrl,
    userData: {
      title: `Subscription: ${plan.channelProduct.chatTitle}`,
      plan: plan.name,
      merchant: merchant.name,
    },
    linkback: `${c.env.MINIAPP_URL}/channels`,
  });

  await db.insert(schema.invoices).values({
    invoiceRef: ref,
    apironeInvoiceId: invoice.invoice,
    userId,
    merchantId: plan.channelProduct.merchantId,
    channelProductId: productId,
    subscriptionPlanId: planId,
    type: 'channel_sub',
    currency,
    amountCrypto: String(invoice.amount),
    amountUsd: plan.priceUsd,
    status: 'created',
    callbackUrl,
    paymentAddress: invoice.address,
    apironeInvoiceUrl: invoice['invoice-url'],
    expiresAt: new Date(invoice.expire),
  });

  return c.json({
    ref,
    invoiceUrl: invoice['invoice-url'],
    address: invoice.address,
    amountCrypto,
    currency,
    amountUsd: plan.priceUsd,
    expires: invoice.expire,
  });
});

// ─── TMA: Create Merchant ─────────────────────────────────────────────────────
apiRouter.post('/tma/merchant/create', zValidator('json', z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
})), async (c) => {
  const userId = c.get('userId') as number;
  const db = c.get('db');
  const { name, description } = c.req.valid('json');

  // Create Apirone account for merchant
  const res = await fetch('https://apirone.com/api/v2/accounts', { method: 'POST' });
  if (!res.ok) return c.json({ error: 'Failed to create merchant wallet' }, 500);
  const account = await res.json() as { account: string; 'transfer-key': string };

  const apiKey = generateApiKey();
  const webhookSecret = nanoid(32);

  const [merchant] = await db.insert(schema.merchants).values({
    userId,
    name,
    description,
    apiKey,
    apironeAccountId: account.account,
    apironeTransferKey: account['transfer-key'],
    webhookSecret,
    isActive: true,
  }).returning();

  return c.json({ merchant, apiKey });
});

// ─── TMA: Get my merchants ────────────────────────────────────────────────────
apiRouter.get('/tma/merchants', async (c) => {
  const userId = c.get('userId') as number;
  const db = c.get('db');

  const merchants = await db.query.merchants.findMany({
    where: eq(schema.merchants.userId, userId),
    with: { channelProducts: { with: { subscriptionPlans: true } } },
  });

  return c.json({ merchants });
});

// ─── TMA: Add channel product ─────────────────────────────────────────────────
apiRouter.post('/tma/merchant/:merchantId/channel', zValidator('json', z.object({
  telegramChatId: z.string(),
  chatTitle: z.string(),
  chatType: z.enum(['channel', 'group', 'supergroup']),
  chatUsername: z.string().optional(),
  description: z.string().optional(),
})), async (c) => {
  const userId = c.get('userId') as number;
  const merchantId = parseInt(c.req.param('merchantId'));
  const db = c.get('db');
  const body = c.req.valid('json');

  const merchant = await db.query.merchants.findFirst({
    where: and(eq(schema.merchants.id, merchantId), eq(schema.merchants.userId, userId)),
  });
  if (!merchant) return c.json({ error: 'Merchant not found' }, 404);

  const [product] = await db.insert(schema.channelProducts).values({
    merchantId,
    ...body,
    isActive: true,
  }).returning();

  return c.json({ product });
});

// ─── TMA: Update channel product ─────────────────────────────────────────────
apiRouter.put('/tma/channel/:productId', zValidator('json', z.object({
  chatTitle: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})), async (c) => {
  const userId = c.get('userId') as number;
  const productId = parseInt(c.req.param('productId'));
  const db = c.get('db');
  const body = c.req.valid('json');

  const product = await db.query.channelProducts.findFirst({
    where: eq(schema.channelProducts.id, productId),
    with: { merchant: true },
  });
  if (!product || (product.merchant as unknown as { userId: number }).userId !== userId) {
    return c.json({ error: 'Not authorized' }, 403);
  }

  await db.update(schema.channelProducts)
    .set(body)
    .where(eq(schema.channelProducts.id, productId));

  return c.json({ success: true });
});

// ─── TMA: Add subscription plan ───────────────────────────────────────────────
apiRouter.post('/tma/channel/:productId/plan', zValidator('json', z.object({
  name: z.string(),
  priceUsd: z.number().positive(),
  durationDays: z.number().int().positive(),
  maxUsers: z.number().int().optional(),
})), async (c) => {
  const userId = c.get('userId') as number;
  const productId = parseInt(c.req.param('productId'));
  const db = c.get('db');
  const body = c.req.valid('json');

  // Verify ownership
  const product = await db.query.channelProducts.findFirst({
    where: eq(schema.channelProducts.id, productId),
    with: { merchant: true },
  });
  if (!product || (product.merchant as unknown as { userId: number }).userId !== userId) {
    return c.json({ error: 'Not authorized' }, 403);
  }

  const [plan] = await db.insert(schema.subscriptionPlans).values({
    channelProductId: productId,
    ...body,
    isActive: true,
  }).returning();

  return c.json({ plan });
});

// ─── TMA: Delete subscription plan ──────────────────────────────────────────
apiRouter.delete('/tma/plan/:planId', async (c) => {
  const userId = c.get('userId') as number;
  const planId = parseInt(c.req.param('planId'));
  const db = c.get('db');

  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(schema.subscriptionPlans.id, planId),
    with: { channelProduct: { with: { merchant: true } } },
  });
  if (!plan || (plan.channelProduct.merchant as unknown as { userId: number }).userId !== userId) {
    return c.json({ error: 'Not authorized' }, 403);
  }

  await db.update(schema.subscriptionPlans)
    .set({ isActive: false })
    .where(eq(schema.subscriptionPlans.id, planId));

  return c.json({ success: true });
});

// ─── TMA: Get channel subscribers (merchant view) ────────────────────────────
apiRouter.get('/tma/channel/:productId/subscribers', async (c) => {
  const userId = c.get('userId') as number;
  const productId = parseInt(c.req.param('productId'));
  const db = c.get('db');

  const product = await db.query.channelProducts.findFirst({
    where: eq(schema.channelProducts.id, productId),
    with: { merchant: true },
  });
  if (!product || (product.merchant as unknown as { userId: number }).userId !== userId) {
    return c.json({ error: 'Not authorized' }, 403);
  }

  const subs = await db.query.channelSubscriptions.findMany({
    where: eq(schema.channelSubscriptions.channelProductId, productId),
    with: { user: true, subscriptionPlan: true },
    orderBy: [desc(schema.channelSubscriptions.createdAt)],
  });

  return c.json({ subscribers: subs });
});

// ─── TMA: Revoke subscription (merchant) ────────────────────────────────────
apiRouter.post('/tma/subscription/:subId/revoke', async (c) => {
  const userId = c.get('userId') as number;
  const subId = parseInt(c.req.param('subId'));
  const db = c.get('db');

  const sub = await db.query.channelSubscriptions.findFirst({
    where: eq(schema.channelSubscriptions.id, subId),
    with: { channelProduct: { with: { merchant: true } } },
  });

  if (!sub || (sub.channelProduct.merchant as unknown as { userId: number }).userId !== userId) {
    return c.json({ error: 'Not authorized' }, 403);
  }

  await db.update(schema.channelSubscriptions)
    .set({ status: 'revoked' })
    .where(eq(schema.channelSubscriptions.id, subId));

  // Kick from channel
  try {
    const now = Math.floor(Date.now() / 1000);
    await sendTelegram(c.env.BOT_TOKEN, 'banChatMember', {
      chat_id: sub.channelProduct.telegramChatId,
      user_id: sub.userId,
      until_date: now + 35,
    });
  } catch { /* ignore if already left */ }

  return c.json({ success: true });
});

// ─── TMA: Share channel deep link ─────────────────────────────────────────────
apiRouter.get('/tma/channel/:productId/share', async (c) => {
  const productId = parseInt(c.req.param('productId'));
  const db = c.get('db');

  const product = await db.query.channelProducts.findFirst({
    where: and(eq(schema.channelProducts.id, productId), eq(schema.channelProducts.isActive, true)),
  });
  if (!product) return c.json({ error: 'Not found' }, 404);

  // Get bot username from Telegram
  try {
    const me = await sendTelegram(c.env.BOT_TOKEN, 'getMe', {}) as { username?: string };
    const botUsername = me.username ?? '';
    const deepLink = `https://t.me/${botUsername}?start=channel_${productId}`;
    return c.json({ deepLink, productId });
  } catch {
    return c.json({ error: 'Failed to get bot info' }, 500);
  }
});

// ─── Merchant API: Create payment link ────────────────────────────────────────
apiRouter.post('/merchant/payment-link', zValidator('json', z.object({
  title: z.string(),
  description: z.string().optional(),
  amountUsd: z.number().optional(),
  currency: z.string(),
})), async (c) => {
  const merchant = c.get('merchant') as typeof schema.merchants.$inferSelect;
  const db = c.get('db');
  const body = c.req.valid('json');

  const slug = nanoid(10);
  const [link] = await db.insert(schema.paymentLinks).values({
    merchantId: merchant.id,
    slug,
    ...body,
    isActive: true,
  }).returning();

  // Get bot username dynamically
  let botUsername = '';
  try {
    const me = await sendTelegram(c.env.BOT_TOKEN, 'getMe', {}) as { username?: string };
    botUsername = me.username ?? '';
  } catch { /* ignore */ }

  return c.json({
    link,
    url: `${c.env.MINIAPP_URL}/pay/${slug}`,
    botUrl: botUsername ? `https://t.me/${botUsername}?start=pay_${slug}` : null,
  });
});

// ─── Merchant API: Create invoice ─────────────────────────────────────────────
apiRouter.post('/merchant/invoice', zValidator('json', z.object({
  currency: z.string(),
  amountUsd: z.number().positive(),
  userId: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})), async (c) => {
  const merchant = c.get('merchant') as typeof schema.merchants.$inferSelect;
  const db = c.get('db');
  const body = c.req.valid('json');

  const apirone = createApirone(merchant.apironeAccountId, merchant.apironeTransferKey);
  const rate = await apirone.getRate(body.currency, 'usd');
  const amountCrypto = (body.amountUsd / rate.price).toFixed(8);
  const ref = generateInvoiceRef();

  const invoice = await apirone.createInvoice({
    currency: body.currency,
    amount: amountCrypto,
    lifetime: 3600,
    callbackUrl: `${c.env.MINIAPP_URL}/callback/merchant?ref=${ref}&secret=${merchant.webhookSecret}`,
    userData: { merchant: merchant.name },
  });

  await db.insert(schema.invoices).values({
    invoiceRef: ref,
    apironeInvoiceId: invoice.invoice,
    userId: body.userId || 0,
    merchantId: merchant.id,
    type: 'payment_link',
    currency: body.currency,
    amountCrypto: String(invoice.amount),
    amountUsd: body.amountUsd,
    status: 'created',
    paymentAddress: invoice.address,
    apironeInvoiceUrl: invoice['invoice-url'],
    metadata: JSON.stringify(body.metadata || {}),
    expiresAt: new Date(invoice.expire),
  });

  return c.json({
    ref,
    invoiceId: invoice.invoice,
    address: invoice.address,
    invoiceUrl: invoice['invoice-url'],
    amountCrypto,
    expires: invoice.expire,
  });
});

// ─── Merchant API: Get invoice status ─────────────────────────────────────────
apiRouter.get('/merchant/invoice/:ref', async (c) => {
  const merchant = c.get('merchant') as typeof schema.merchants.$inferSelect;
  const db = c.get('db');
  const ref = c.req.param('ref');

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(schema.invoices.invoiceRef, ref), eq(schema.invoices.merchantId, merchant.id)),
  });

  if (!invoice) return c.json({ error: 'Invoice not found' }, 404);
  return c.json({ invoice });
});

// ─── Admin: Stats ─────────────────────────────────────────────────────────────
apiRouter.get('/admin/stats', async (c) => {
  const initData = c.req.header('X-Telegram-InitData');
  if (!initData) return c.json({ error: 'Unauthorized' }, 401);
  const userId = verifyTelegramInitData(initData, c.env.BOT_TOKEN);
  if (!userId || String(userId) !== c.env.OWNER_ID) return c.json({ error: 'Forbidden' }, 403);

  const db = c.get('db');
  const [users, merchants, invoices, subscriptions] = await Promise.all([
    db.$count(schema.users),
    db.$count(schema.merchants),
    db.$count(schema.invoices),
    db.$count(schema.channelSubscriptions),
  ]);

  return c.json({ users, merchants, invoices, subscriptions });
});
