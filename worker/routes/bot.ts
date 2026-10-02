import { Hono } from 'hono';
import type { HonoEnv, Env } from '../index';
import { sendTelegram } from '../index';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema';
import { createApirone } from '../lib/apirone';
import { generateInvoiceRef, nanoid } from '../lib/utils';
import { PLAN_LIMITS, SUPPORTED_CURRENCIES, TEXTS } from '../lib/constants';

export const botRouter = new Hono<HonoEnv>();

// ── Types ─────────────────────────────────────────────────────────────────────
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number; type?: string };
  text?: string;
  successful_payment?: {
    currency: string;
    total_amount: number;
    invoice_payload: string;
  };
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
}

interface TelegramInlineQuery {
  id: string;
  from: TelegramUser;
  query: string;
}

interface TelegramUpdate {
  message?:             TelegramMessage;
  edited_message?:      TelegramMessage;
  callback_query?:      TelegramCallbackQuery;
  inline_query?:        TelegramInlineQuery;
  my_chat_member?:      { chat: { id: number | string; title?: string }; new_chat_member: { status: string } };
  chat_member?:         { chat: { id: number | string }; new_chat_member: { status: string; user: TelegramUser } };
}

// ── DB type alias ─────────────────────────────────────────────────────────────
type DB = ReturnType<typeof import('drizzle-orm/d1').drizzle<typeof schema>>;


// ─── Webhook entry ────────────────────────────────────────────────────────────
botRouter.post('/webhook', async (c) => {
  const secret = c.env.WEBHOOK_SECRET;
  const headerSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token');
  if (headerSecret !== secret) return c.text('Unauthorized', 401);

  const update = await c.req.json<TelegramUpdate>();
  const db     = c.get('db');

  // Process in background so we always return 200 fast
  c.executionCtx.waitUntil(handleUpdate(update, db, c.env));

  return c.text('ok');
});

// ─── Update router ────────────────────────────────────────────────────────────
async function handleUpdate(update: TelegramUpdate, db: DB, env: Env) {
  try {
    if (update.message)        await handleMessage(update.message, db, env);
    if (update.callback_query) await handleCallbackQuery(update.callback_query, db, env);
    if (update.inline_query)   await handleInlineQuery(update.inline_query, env);
    if (update.my_chat_member) await handleMyChatMember(update.my_chat_member, env);
    if (update.chat_member)    await handleChatMember(update.chat_member, db, env);
  } catch (e) {
    console.error('[Bot] Update error:', e);
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────
async function handleMessage(msg: TelegramMessage, db: DB, env: Env) {
  const userId = msg.from?.id;
  if (!userId) return;

  // Ignore group/supergroup messages (bot only handles private chats)
  if (msg.chat.type && msg.chat.type !== 'private') return;

  // Successful payment handling
  if (msg.successful_payment) {
    await handleSuccessfulPayment(userId, msg.successful_payment, db, env);
    return;
  }

  if (!msg.text) return;

  // Ensure user exists in DB
  const user = await ensureUser(msg.from!, db);

  // Force join gate
  if (env.FORCE_JOIN_CHANNEL) {
    const ok = await checkChannelMembership(userId, env.FORCE_JOIN_CHANNEL, env);
    if (!ok) {
      await sendForceJoin(userId, env.FORCE_JOIN_CHANNEL, env);
      return;
    }
  }

  const text = msg.text.trim();

  // Route commands
  if (text.startsWith('/start')) {
    const param = text.split(' ')[1];
    await handleStart(userId, user, param, db, env);
  } else if (text === '/menu' || text === '/app') {
    await sendMainMenu(userId, env);
  } else if (text === '/plans') {
    await handlePlans(userId, db, env);
  } else if (text === '/balance' || text === '/wallet') {
    await handleBalance(userId, user, env);
  } else if (text === '/mysubs') {
    await handleMySubs(userId, db, env);
  } else if (text === '/admin' && userId === parseInt(env.OWNER_ID)) {
    await handleAdmin(userId, db, env);
  } else if (text === '/help') {
    await sendHelp(userId, env);
  } else if (text === '/invoice') {
    await sendTelegramMenuMessage(userId, '🧾 Create a crypto invoice:', [[
      { text: '🚀 Open Invoice Creator', web_app: { url: `${env.MINIAPP_URL}/invoice` } },
    ]], env);
  } else {
    // Unknown command → show main menu
    await sendMainMenu(userId, env);
  }
}

// ─── Callback query handler ───────────────────────────────────────────────────
async function handleCallbackQuery(cq: TelegramCallbackQuery, db: DB, env: Env) {
  const userId = cq.from.id;
  const data   = cq.data ?? '';

  // Always answer quickly
  await answerCallback(cq.id, env);

  if (data === 'check_join') {
    const ok = env.FORCE_JOIN_CHANNEL
      ? await checkChannelMembership(userId, env.FORCE_JOIN_CHANNEL, env)
      : true;
    if (ok) {
      await handleStart(userId, await ensureUser(cq.from, db), undefined, db, env);
    } else {
      await answerCallback(cq.id, env, 'Still not joined! Please join and try again.', true);
    }
  } else if (data === 'buy_pro') {
    await handleBuyPro(userId, db, env);
  } else if (data === 'my_subs') {
    await handleMySubs(userId, db, env);
  } else if (data === 'wallet') {
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (user) await handleBalance(userId, user, env);
  } else if (data === 'help') {
    await sendHelp(userId, env);
  } else if (data.startsWith('pay_pro_')) {
    const currency = data.slice('pay_pro_'.length);
    await handlePayPro(userId, currency, db, env);
  } else if (data.startsWith('channel_')) {
    const productId = parseInt(data.slice('channel_'.length));
    if (!isNaN(productId)) await handleChannelProduct(userId, productId, db, env);
  } else if (data.startsWith('plan_')) {
    const [, productIdStr, planIdStr] = data.split('_');
    await handleBuyChannelPlan(userId, parseInt(productIdStr || '0'), parseInt(planIdStr || '0'), db, env);
  } else if (data.startsWith('paychan_')) {
    const [, currency, planIdStr] = data.split('_');
    await handlePayChannel(userId, currency || '', parseInt(planIdStr || '0'), db, env);
  } else if (data === 'noop') {
    // intentionally do nothing
  }
}

// ─── Inline query handler ─────────────────────────────────────────────────────
async function handleInlineQuery(iq: TelegramInlineQuery, env: Env) {
  // Return quick-start button for sharing the bot
  await sendTelegram(env.BOT_TOKEN, 'answerInlineQuery', {
    inline_query_id: iq.id,
    results: [
      {
        type: 'article',
        id: 'open_bot',
        title: '💎 CryptonetPay',
        description: 'Open CryptonetPay crypto payment bot',
        input_message_content: {
          message_text: '💎 <b>CryptonetPay</b> — Accept crypto on Telegram!\n\nTap below to open:',
          parse_mode: 'HTML',
        },
        reply_markup: {
          inline_keyboard: [[
            { text: '🚀 Open CryptonetPay', url: `https://t.me/${await getBotUsername(env)}` },
          ]],
        },
      },
    ],
    cache_time: 300,
  });
}

// ─── my_chat_member (bot added/removed from channels) ─────────────────────────
async function handleMyChatMember(
  event: { chat: { id: number | string; title?: string }; new_chat_member: { status: string } },
  env: Env
) {
  const { status } = event.new_chat_member;
  console.log(`[Bot] Bot ${status} in chat ${event.chat.id} (${event.chat.title ?? ''})`);

  if (status === 'administrator') {
    // Bot was made admin — send confirmation to owner
    await sendTelegram(env.BOT_TOKEN, 'sendMessage', {
      chat_id: parseInt(env.OWNER_ID),
      text: `✅ Bot is now <b>administrator</b> in:\n<b>${event.chat.title ?? event.chat.id}</b>\n\nChat ID: <code>${event.chat.id}</code>`,
      parse_mode: 'HTML',
    }).catch(() => {});
  }
}

// ─── chat_member (user joins/leaves) ─────────────────────────────────────────
async function handleChatMember(
  event: { chat: { id: number | string }; new_chat_member: { status: string; user: TelegramUser } },
  _db: DB,
  _env: Env
) {
  // Log when a user joins a subscribed channel
  console.log(`[Bot] User ${event.new_chat_member.user.id} is now ${event.new_chat_member.status} in ${event.chat.id}`);
}

// ─── Successful payment (Telegram Stars or invoice) ───────────────────────────
async function handleSuccessfulPayment(
  userId: number,
  payment: { currency: string; total_amount: number; invoice_payload: string },
  _db: DB,
  env: Env
) {
  await sendTelegram(env.BOT_TOKEN, 'sendMessage', {
    chat_id: userId,
    text: `✅ <b>Payment of ${payment.total_amount / 100} ${payment.currency} received!</b>\n\nThank you for your payment.`,
    parse_mode: 'HTML',
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function ensureUser(from: TelegramUser, db: DB) {
  const existing = await db.query.users.findFirst({ where: eq(schema.users.id, from.id) });
  if (existing) return existing;

  await db.insert(schema.users).values({
    id:           from.id,
    username:     from.username,
    firstName:    from.first_name,
    lastName:     from.last_name,
    languageCode: from.language_code ?? 'en',
    plan:         'free',
    txCount:      0,
  }).onConflictDoNothing();

  return (await db.query.users.findFirst({ where: eq(schema.users.id, from.id) }))!;
}

async function checkChannelMembership(userId: number, channel: string, env: Env): Promise<boolean> {
  try {
    const member = await sendTelegram(env.BOT_TOKEN, 'getChatMember', {
      chat_id: `@${channel.replace('@', '')}`,
      user_id: userId,
    }) as { status: string };
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch {
    return false;
  }
}

async function answerCallback(id: string, env: Env, text?: string, showAlert?: boolean) {
  await sendTelegram(env.BOT_TOKEN, 'answerCallbackQuery', {
    callback_query_id: id,
    ...(text ? { text, show_alert: showAlert ?? false } : {}),
  }).catch(() => {});
}

async function getBotUsername(env: Env): Promise<string> {
  try {
    const me = await sendTelegram(env.BOT_TOKEN, 'getMe', {}) as { username?: string };
    return me.username ?? '';
  } catch {
    return '';
  }
}

// ─── /start ───────────────────────────────────────────────────────────────────
async function handleStart(userId: number, user: typeof schema.users.$inferSelect, param: string | undefined, db: DB, env: Env) {
  // Deep link: channel_<id>
  if (param?.startsWith('channel_')) {
    const productId = parseInt(param.slice('channel_'.length));
    if (!isNaN(productId)) {
      await handleChannelProduct(userId, productId, db, env);
      return;
    }
  }

  const isPro = user.plan === 'pro';

  await sendTelegram(env.BOT_TOKEN, 'sendMessage', {
    chat_id: userId,
    text: TEXTS.WELCOME(user.firstName, isPro, user.txCount ?? 0),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 Open Dashboard', web_app: { url: env.MINIAPP_URL } }],
        [
          { text: '💳 Upgrade to Pro', callback_data: 'buy_pro' },
          { text: '📋 My Subs',       callback_data: 'my_subs' },
        ],
        [
          { text: '💼 Wallet',  callback_data: 'wallet' },
          { text: '❓ Help',    callback_data: 'help'   },
        ],
      ],
    },
  });
}

// ─── Main menu ────────────────────────────────────────────────────────────────
async function sendMainMenu(userId: number, env: Env) {
  await sendTelegramMenuMessage(userId, `🎛 <b>CryptonetPay</b> — Your crypto gateway on Telegram.\n\nWhat would you like to do?`, [
    [{ text: '🚀 Open Mini App', web_app: { url: env.MINIAPP_URL } }],
    [
      { text: '💳 Plans',    callback_data: 'buy_pro'  },
      { text: '📢 Channels', callback_data: 'channel_list' },
    ],
    [
      { text: '📋 My Subs', callback_data: 'my_subs' },
      { text: '💼 Wallet',  callback_data: 'wallet'  },
    ],
    [{ text: '❓ Help', callback_data: 'help' }],
  ], env);
}

async function sendForceJoin(userId: number, channel: string, env: Env) {
  await sendTelegramMenuMessage(userId, TEXTS.FORCE_JOIN(channel), [[
    { text: `📢 Join @${channel.replace('@', '')}`, url: `https://t.me/${channel.replace('@', '')}` },
    { text: '✅ I Joined', callback_data: 'check_join' },
  ]], env);
}

async function sendHelp(userId: number, env: Env) {
  await sendTelegramMenuMessage(userId, TEXTS.HELP, [[
    { text: '🚀 Open App', web_app: { url: env.MINIAPP_URL } },
  ]], env);
}

async function sendTelegramMenuMessage(
  chatId: number,
  text: string,
  keyboard: Array<Array<{ text: string; [k: string]: unknown }>>,
  env: Env
) {
  await sendTelegram(env.BOT_TOKEN, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard },
  });
}

// ─── Plans ────────────────────────────────────────────────────────────────────
async function handlePlans(userId: number, db: DB, env: Env) {
  const user  = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  const isPro = user?.plan === 'pro';

  await sendTelegramMenuMessage(userId, TEXTS.PLANS(isPro), isPro ? [] : [[
    { text: '🔥 Upgrade to Pro — $9.99/mo', callback_data: 'buy_pro' },
  ]], env);
}

// ─── Buy Pro ──────────────────────────────────────────────────────────────────
async function handleBuyPro(userId: number, db: DB, env: Env) {
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (user?.plan === 'pro') {
    await sendTelegram(env.BOT_TOKEN, 'sendMessage', {
      chat_id: userId,
      text: '✅ You already have the <b>Pro Plan</b>!',
      parse_mode: 'HTML',
    });
    return;
  }

  // Group currency buttons 3 per row
  const buttons = SUPPORTED_CURRENCIES.map(c => ({
    text: `${c.emoji} ${c.label}`,
    callback_data: `pay_pro_${c.id}`,
  }));
  const rows: typeof buttons[] = [];
  for (let i = 0; i < buttons.length; i += 3) rows.push(buttons.slice(i, i + 3));

  await sendTelegramMenuMessage(userId,
    `💳 <b>Upgrade to Pro</b>\n\n` +
    `<b>$9.99/month</b> — Unlimited transactions\n\n` +
    `✅ Priority support\n` +
    `✅ Merchant API & channel subscriptions\n` +
    `✅ Analytics dashboard\n\n` +
    `Choose your payment currency:`,
    rows,
    env
  );
}

async function handlePayPro(userId: number, currency: string, db: DB, env: Env) {
  const apirone = createApirone(env.APIRONE_PLATFORM_ACCOUNT, env.APIRONE_PLATFORM_KEY);
  const priceUsd = PLAN_LIMITS.pro.price;

  const rate        = await apirone.getRate(currency, 'usd');
  const amountCrypto = (priceUsd / rate.price).toFixed(8);
  const ref          = generateInvoiceRef();
  const callbackUrl  = `${env.MINIAPP_URL}/callback/payment?ref=${ref}&secret=${env.WEBHOOK_SECRET}`;

  const invoice = await apirone.createInvoice({
    currency,
    amount: amountCrypto,
    lifetime: 3600,
    callbackUrl,
    userData: { title: 'CryptonetPay Pro Plan', merchant: 'CryptonetPay', price: `$${priceUsd}` },
    linkback: env.MINIAPP_URL,
  });

  await db.insert(schema.invoices).values({
    invoiceRef:       ref,
    apironeInvoiceId: invoice.invoice,
    userId,
    type:             'platform_sub',
    currency,
    amountCrypto:     String(invoice.amount),
    amountUsd:        priceUsd,
    status:           'created',
    callbackUrl,
    paymentAddress:   invoice.address,
    apironeInvoiceUrl: invoice['invoice-url'],
    metadata:         JSON.stringify({ planMonths: 1 }),
    expiresAt:        new Date(invoice.expire),
  });

  const currMeta = SUPPORTED_CURRENCIES.find(c => c.id === currency);

  await sendTelegramMenuMessage(userId,
    `💳 <b>Pro Plan Invoice</b>\n\n` +
    `Amount: <code>${amountCrypto}</code> ${currMeta?.label ?? currency.toUpperCase()}\n` +
    `≈ <b>$${priceUsd}</b>\n\n` +
    `Send exactly to:\n<code>${invoice.address}</code>\n\n` +
    `⏱ Expires in <b>1 hour</b>\n\n` +
    `Or use the invoice page for QR code & tracking:`,
    [[{ text: '💰 Pay Now', url: invoice['invoice-url'] }]],
    env
  );
}

// ─── Channel product ──────────────────────────────────────────────────────────
async function handleChannelProduct(userId: number, productId: number, db: DB, env: Env) {
  const product = await db.query.channelProducts.findFirst({
    where: and(
      eq(schema.channelProducts.id, productId),
      eq(schema.channelProducts.isActive, true)
    ),
    with: { subscriptionPlans: { where: eq(schema.subscriptionPlans.isActive, true) } },
  });

  if (!product) {
    await sendTelegram(env.BOT_TOKEN, 'sendMessage', {
      chat_id: userId,
      text: '❌ Product not found or no longer available.',
    });
    return;
  }

  if (!product.subscriptionPlans.length) {
    await sendTelegram(env.BOT_TOKEN, 'sendMessage', {
      chat_id: userId,
      text: `📢 <b>${product.chatTitle}</b>\n\nNo subscription plans available yet.`,
      parse_mode: 'HTML',
    });
    return;
  }

  const planButtons = product.subscriptionPlans.map(p => [{
    text: `📅 ${p.name} — $${p.priceUsd} (${p.durationDays}d)`,
    callback_data: `plan_${productId}_${p.id}`,
  }]);

  await sendTelegramMenuMessage(userId,
    `📢 <b>${product.chatTitle}</b>\n\n` +
    (product.description ? `${product.description}\n\n` : '') +
    `Choose a subscription plan:`,
    planButtons,
    env
  );
}

async function handleBuyChannelPlan(userId: number, _productId: number, planId: number, db: DB, env: Env) {
  const plan = await db.query.subscriptionPlans.findFirst({
    where: and(eq(schema.subscriptionPlans.id, planId), eq(schema.subscriptionPlans.isActive, true)),
  });
  if (!plan) return;

  const buttons = SUPPORTED_CURRENCIES.map(c => ({
    text: `${c.emoji} ${c.label}`,
    callback_data: `paychan_${c.id}_${planId}`,
  }));
  const rows: typeof buttons[] = [];
  for (let i = 0; i < buttons.length; i += 3) rows.push(buttons.slice(i, i + 3));

  await sendTelegramMenuMessage(userId,
    `🛒 <b>${plan.name}</b> — <b>$${plan.priceUsd}</b>\n` +
    `Duration: ${plan.durationDays} days\n\n` +
    `Choose payment currency:`,
    rows,
    env
  );
}

async function handlePayChannel(userId: number, currency: string, planId: number, db: DB, env: Env) {
  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(schema.subscriptionPlans.id, planId),
    with: { channelProduct: { with: { merchant: true } } },
  });
  if (!plan) return;

  const merchant = (plan.channelProduct as unknown as { merchant: typeof schema.merchants.$inferSelect }).merchant;
  const apirone  = createApirone(merchant.apironeAccountId, merchant.apironeTransferKey);

  const rate         = await apirone.getRate(currency, 'usd');
  const amountCrypto = (plan.priceUsd / rate.price).toFixed(8);
  const ref          = generateInvoiceRef();
  const callbackUrl  = `${env.MINIAPP_URL}/callback/channel?ref=${ref}&secret=${env.WEBHOOK_SECRET}`;

  const invoice = await apirone.createInvoice({
    currency,
    amount: amountCrypto,
    lifetime: 3600,
    callbackUrl,
    userData: {
      title:    `Subscription: ${plan.channelProduct.chatTitle}`,
      merchant: merchant.name,
      price:    `$${plan.priceUsd}`,
    },
  });

  await db.insert(schema.invoices).values({
    invoiceRef:         ref,
    apironeInvoiceId:   invoice.invoice,
    userId,
    merchantId:         plan.channelProduct.merchantId,
    channelProductId:   plan.channelProductId,
    subscriptionPlanId: planId,
    type:               'channel_sub',
    currency,
    amountCrypto:       String(invoice.amount),
    amountUsd:          plan.priceUsd,
    status:             'created',
    callbackUrl,
    paymentAddress:     invoice.address,
    apironeInvoiceUrl:  invoice['invoice-url'],
    expiresAt:          new Date(invoice.expire),
  });

  const currMeta = SUPPORTED_CURRENCIES.find(c => c.id === currency);

  await sendTelegramMenuMessage(userId,
    `💳 <b>Subscription Invoice</b>\n\n` +
    `Channel: <b>${plan.channelProduct.chatTitle}</b>\n` +
    `Plan: <b>${plan.name}</b> (${plan.durationDays} days)\n` +
    `Amount: <code>${amountCrypto}</code> ${currMeta?.label ?? currency.toUpperCase()}\n` +
    `≈ <b>$${plan.priceUsd}</b>\n\n` +
    `Send to:\n<code>${invoice.address}</code>\n\n` +
    `⏱ Expires in <b>1 hour</b>`,
    [[{ text: '💰 Pay Now', url: invoice['invoice-url'] }]],
    env
  );
}

// ─── Balance / Wallet ─────────────────────────────────────────────────────────
async function handleBalance(userId: number, user: typeof schema.users.$inferSelect, env: Env) {
  if (!user.apironeAccountId) {
    await sendTelegramMenuMessage(userId,
      `💼 <b>Wallet</b>\n\nYou don't have a crypto wallet yet.\n\nCreate one in the Mini App to start receiving payments:`,
      [[{ text: '💼 Create Wallet', web_app: { url: `${env.MINIAPP_URL}/wallet` } }]],
      env
    );
    return;
  }
  await sendTelegramMenuMessage(userId,
    `💼 <b>Wallet</b>\n\nView your balances, addresses and transaction history in the Mini App:`,
    [[{ text: '💼 Open Wallet', web_app: { url: `${env.MINIAPP_URL}/wallet` } }]],
    env
  );
}

// ─── My Subscriptions ─────────────────────────────────────────────────────────
async function handleMySubs(userId: number, db: DB, env: Env) {
  const subs = await db.query.channelSubscriptions.findMany({
    where: and(
      eq(schema.channelSubscriptions.userId, userId),
      eq(schema.channelSubscriptions.status, 'active')
    ),
    with: { channelProduct: true, subscriptionPlan: true },
  });

  if (!subs.length) {
    await sendTelegramMenuMessage(userId,
      `📋 <b>My Subscriptions</b>\n\nYou have no active subscriptions.\n\nBrowse available channels in the Mini App:`,
      [[{ text: '📢 Browse Channels', web_app: { url: `${env.MINIAPP_URL}/channels` } }]],
      env
    );
    return;
  }

  let text = `📋 <b>Active Subscriptions</b> (${subs.length})\n\n`;
  for (const sub of subs) {
    const exp = new Date(sub.expiresAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    const daysLeft = Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86400000));
    text += `📢 <b>${sub.channelProduct.chatTitle}</b>\n`;
    text += `   Plan: ${sub.subscriptionPlan.name}\n`;
    text += `   Expires: ${exp} (${daysLeft}d left)\n\n`;
  }

  await sendTelegramMenuMessage(userId, text, [[
    { text: '🚀 Manage in App', web_app: { url: `${env.MINIAPP_URL}/subscriptions` } },
  ]], env);
}

// ─── Admin panel ──────────────────────────────────────────────────────────────
async function handleAdmin(userId: number, db: DB, env: Env) {
  const [userCount, merchantCount, invoiceCount, subsCount] = await Promise.all([
    db.$count(schema.users),
    db.$count(schema.merchants),
    db.$count(schema.invoices),
    db.$count(schema.channelSubscriptions),
  ]);

  await sendTelegramMenuMessage(userId,
    `🔧 <b>Admin Dashboard</b>\n\n` +
    `👥 Users:          <b>${userCount}</b>\n` +
    `🏪 Merchants:      <b>${merchantCount}</b>\n` +
    `🧾 Invoices:       <b>${invoiceCount}</b>\n` +
    `📋 Subscriptions:  <b>${subsCount}</b>`,
    [[{ text: '🔧 Admin Panel', web_app: { url: `${env.MINIAPP_URL}/admin` } }]],
    env
  );
}
