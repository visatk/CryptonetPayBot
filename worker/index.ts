import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import { botRouter } from './routes/bot';
import { apiRouter } from './routes/api';
import { callbackRouter } from './routes/callback';
import { webhookRouter } from './routes/webhook';
import { payRouter } from './routes/pay';

export type Env = {
  DB: D1Database;
  KV: KVNamespace;
  QUEUE: Queue;
  ASSETS: Fetcher;
  BOT_TOKEN: string;
  OWNER_ID: string;
  APIRONE_PLATFORM_ACCOUNT: string;
  APIRONE_PLATFORM_KEY: string;
  FORCE_JOIN_CHANNEL: string;
  WEBHOOK_SECRET: string;
  MINIAPP_URL: string;
};

export type HonoEnv = {
  Bindings: Env;
  Variables: {
    db: ReturnType<typeof drizzle<typeof schema>>;
  };
};

const app = new Hono<HonoEnv>();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use('*', logger());
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Inject Drizzle DB into context
app.use('*', async (c, next) => {
  const db = drizzle(c.env.DB, { schema });
  c.set('db', db);
  await next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.route('/bot', botRouter);        // Telegram bot webhook
app.route('/api', apiRouter);        // REST API for Mini App
app.route('/callback', callbackRouter); // Apirone payment callbacks
app.route('/webhook', webhookRouter); // Telegram webhook management
app.route('/api/pay', payRouter);    // Public payment link API

// Health check
app.get('/health', (c) => c.json({ status: 'ok', ts: Date.now() }));

// ─── Queue Consumer ───────────────────────────────────────────────────────────
export default {
  fetch: app.fetch,

  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    const db = drizzle(env.DB, { schema });
    for (const msg of batch.messages) {
      try {
        const job = msg.body as { type: string; payload: unknown };
        if (job.type === 'expire_subscriptions') {
          await handleExpireSubscriptions(db, env);
        } else if (job.type === 'send_telegram_message') {
          const p = job.payload as { chat_id: number; text: string; parse_mode?: string };
          await sendTelegram(env.BOT_TOKEN, 'sendMessage', p);
        } else if (job.type === 'revoke_invite_link') {
          const p = job.payload as { chat_id: string; invite_link: string };
          await sendTelegram(env.BOT_TOKEN, 'revokeChatInviteLink', {
            chat_id: p.chat_id,
            invite_link: p.invite_link,
          });
        }
        msg.ack();
      } catch (e) {
        console.error('Queue job failed', e);
        msg.retry();
      }
    }
  },

  // Cron: every hour check and expire subscriptions
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const db = drizzle(env.DB, { schema });
        await handleExpireSubscriptions(db, env);
      })()
    );
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function handleExpireSubscriptions(
  db: ReturnType<typeof drizzle<typeof schema>>,
  env: Env
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const expired = await db.query.channelSubscriptions.findMany({
    where: (t, { eq, and, lt }) =>
      and(eq(t.status, 'active'), lt(t.expiresAt, new Date(now * 1000))),
    with: { channelProduct: true },
  });

  for (const sub of expired) {
    // Mark expired
    await db.update(schema.channelSubscriptions)
      .set({ status: 'expired' })
      .where(eq(schema.channelSubscriptions.id, sub.id));

    // Kick user from channel/group
    try {
      await sendTelegram(env.BOT_TOKEN, 'banChatMember', {
        chat_id: sub.channelProduct.telegramChatId,
        user_id: sub.userId,
        until_date: now + 35, // unban after 35s (effectively kick+unban)
      });
    } catch (_) {/* ignore if already left */}

    // Notify user
    await sendTelegram(env.BOT_TOKEN, 'sendMessage', {
      chat_id: sub.userId,
      text: `❌ <b>Subscription Expired</b>\n\nYour access to <b>${sub.channelProduct.chatTitle}</b> has ended.\n\nTo renew, use /start`,
      parse_mode: 'HTML',
    });
  }
}

export async function sendTelegram(
  token: string,
  method: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json() as { ok: boolean; result?: unknown; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description}`);
  return json.result;
}
