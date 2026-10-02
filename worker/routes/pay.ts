// Public payment link routes (no auth required)
import { Hono } from 'hono';
import type { HonoEnv } from '../index';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema';
import { createApirone } from '../lib/apirone';
import { generateInvoiceRef } from '../lib/utils';

export const payRouter = new Hono<HonoEnv>();

// Get payment link info
payRouter.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = c.get('db');

  const link = await db.query.paymentLinks.findFirst({
    where: and(eq(schema.paymentLinks.slug, slug), eq(schema.paymentLinks.isActive, true)),
    with: { merchant: true },
  });

  if (!link) return c.json({ error: 'Not found' }, 404);

  return c.json({
    link: {
      id: link.id,
      slug: link.slug,
      title: link.title,
      description: link.description,
      amountUsd: link.amountUsd,
      currency: link.currency,
      merchant: { name: (link.merchant as typeof schema.merchants.$inferSelect).name },
    },
  });
});

// Create invoice for payment link
payRouter.post('/:slug/invoice', async (c) => {
  const slug = c.req.param('slug');
  const db = c.get('db');
  const body = await c.req.json() as { currency: string; amountUsd?: number };

  const link = await db.query.paymentLinks.findFirst({
    where: and(eq(schema.paymentLinks.slug, slug), eq(schema.paymentLinks.isActive, true)),
    with: { merchant: true },
  });

  if (!link) return c.json({ error: 'Not found' }, 404);

  const merchant = link.merchant as typeof schema.merchants.$inferSelect;
  const amountUsd = link.amountUsd || body.amountUsd;
  if (!amountUsd || amountUsd <= 0) return c.json({ error: 'Invalid amount' }, 400);

  const apirone = createApirone(merchant.apironeAccountId, merchant.apironeTransferKey);
  const rate = await apirone.getRate(body.currency || link.currency, 'usd');
  const amountCrypto = (amountUsd / rate.price).toFixed(8);
  const ref = generateInvoiceRef();

  const invoice = await apirone.createInvoice({
    currency: body.currency || link.currency,
    amount: amountCrypto,
    lifetime: 3600,
    callbackUrl: `${c.env.MINIAPP_URL}/callback/merchant?ref=${ref}&secret=${merchant.webhookSecret}`,
    userData: { title: link.title, merchant: merchant.name },
  });

  await db.insert(schema.invoices).values({
    invoiceRef: ref,
    apironeInvoiceId: invoice.invoice,
    userId: 0,
    merchantId: merchant.id,
    type: 'payment_link',
    currency: body.currency || link.currency,
    amountCrypto: String(invoice.amount),
    amountUsd,
    status: 'created',
    paymentAddress: invoice.address,
    apironeInvoiceUrl: invoice['invoice-url'],
    expiresAt: new Date(invoice.expire),
  });

  return c.json({
    invoiceUrl: invoice['invoice-url'],
    address: invoice.address,
    amountCrypto,
    amountUsd,
    currency: body.currency || link.currency,
    expires: invoice.expire,
  });
});
