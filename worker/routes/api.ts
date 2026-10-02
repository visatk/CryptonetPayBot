import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod/v4';
import type { HonoEnv } from '../index';
import { sendTelegram } from '../index';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { createApirone } from '../lib/apirone';
import { verifyTelegramInitData } from '../lib/telegram';
import { generateApiKey, nanoid, generateInvoiceRef } from '../lib/utils';
import { SUPPORTED_CURRENCIES, PLAN_LIMITS } from '../lib/constants';

export const apiRouter = new Hono<HonoEnv>();

// ─── Auth Middleware ──────────────────────────────────────────────────────────
// Verifies Telegram WebApp initData for Mini App endpoints
apiRouter.use('/tma/*', async (c, next) => {
  const initData = c.req.header('X-Telegram-InitData') || c.req.query('initData');
  if (!initData) return c.json({ error: 'Missing initData' }, 401);

  const userId = verifyTelegramInitData(initData, c.env.BOT_TOKEN);
  if (!userId) return c.json({ error: 'Invalid initData' }, 401);

  c.set('userId' as never, userId);
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

  c.set('merchant' as never, merchant);
  await next();
});

// ─── TMA: User Profile ────────────────────────────────────────────────────────
apiRouter.get('/tma/me', async (c) => {
  const userId = c.get('userId' as never) as number;
  const db = c.get('db');

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

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
  const userId = c.get('userId' as never) as number;
  const db = c.get('db');

  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) return c.json({ error: 'User not found' }, 404);

  if (user.apironeAccountId) {
    return c.json({ accountId: user.apironeAccountId, message: 'Wallet already exists' });
  }

  // Create Apirone account for user
  const res = await fetch('https://apirone.com/api/v2/accounts', { method: 'POST' });
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
  const userId = c.get('userId' as never) as number;
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
  const userId = c.get('userId' as never) as number;
  const db = c.get('db');
  const { currency, amountUsd, title, description } = c.req.valid('json');

  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) return c.json({ error: 'User not found' }, 404);

  // Check plan limits
  const limit = PLAN_LIMITS[user.plan];
  if (limit.maxTx !== -1 && user.txCount >= limit.maxTx) {
    return c.json({ error: `Transaction limit reached. Upgrade to Pro for unlimited transactions.` }, 403);
  }

  if (!user.apironeAccountId) return c.json({ error: 'Create a wallet first' }, 400);

  const apirone = createApirone(user.apironeAccountId, user.apironeTransferKey!);
  const rate = await apirone.getRate(currency, 'usd');
  const amountCrypto = (amountUsd / rate.price).toFixed(8);
  const ref = generateInvoiceRef();

  const invoice = await apirone.createInvoice({
    currency,
    amount: amountCrypto,
    lifetime: 3600,
    callbackUrl: `${c.env.MINIAPP_URL}/callback/payment?ref=${ref}&secret=${c.env.WEBHOOK_SECRET}`,
    userData: { title, description: description || '' },
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
  const userId = c.get('userId' as never) as number;
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
  const userId = c.get('userId' as never) as number;
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

// ─── TMA: Create Merchant ─────────────────────────────────────────────────────
apiRouter.post('/tma/merchant/create', zValidator('json', z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
})), async (c) => {
  const userId = c.get('userId' as never) as number;
  const db = c.get('db');
  const { name, description } = c.req.valid('json');

  // Create Apirone account for merchant
  const res = await fetch('https://apirone.com/api/v2/accounts', { method: 'POST' });
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
  const userId = c.get('userId' as never) as number;
  const db = c.get('db');

  const merchants = await db.query.merchants.findMany({
    where: eq(schema.merchants.userId, userId),
    with: { channelProducts: true },
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
  const userId = c.get('userId' as never) as number;
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

// ─── TMA: Add subscription plan ───────────────────────────────────────────────
apiRouter.post('/tma/channel/:productId/plan', zValidator('json', z.object({
  name: z.string(),
  priceUsd: z.number().positive(),
  durationDays: z.number().int().positive(),
  maxUsers: z.number().int().optional(),
})), async (c) => {
  const userId = c.get('userId' as never) as number;
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

// ─── Merchant API: Create payment link ────────────────────────────────────────
apiRouter.post('/merchant/payment-link', zValidator('json', z.object({
  title: z.string(),
  description: z.string().optional(),
  amountUsd: z.number().optional(),
  currency: z.string(),
})), async (c) => {
  const merchant = c.get('merchant' as never) as typeof schema.merchants.$inferSelect;
  const db = c.get('db');
  const body = c.req.valid('json');

  const slug = nanoid(10);
  const [link] = await db.insert(schema.paymentLinks).values({
    merchantId: merchant.id,
    slug,
    ...body,
    isActive: true,
  }).returning();

  return c.json({
    link,
    url: `${c.env.MINIAPP_URL}/pay/${slug}`,
    botUrl: `https://t.me/${c.env.BOT_TOKEN.split(':')[0]}bot?start=pay_${slug}`,
  });
});

// ─── Merchant API: Create invoice ─────────────────────────────────────────────
apiRouter.post('/merchant/invoice', zValidator('json', z.object({
  currency: z.string(),
  amountUsd: z.number().positive(),
  userId: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})), async (c) => {
  const merchant = c.get('merchant' as never) as typeof schema.merchants.$inferSelect;
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
  const merchant = c.get('merchant' as never) as typeof schema.merchants.$inferSelect;
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
