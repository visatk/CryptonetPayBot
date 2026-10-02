import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: integer('id').primaryKey(), // Telegram user ID
  username: text('username'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  languageCode: text('language_code').default('en'),
  plan: text('plan', { enum: ['free', 'pro'] }).default('free').notNull(),
  apironeAccountId: text('apirone_account_id'),   // Their Apirone account
  apironeTransferKey: text('apirone_transfer_key'), // Apirone transfer key (secret)
  txCount: integer('tx_count').default(0).notNull(),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  planExpiresAt: integer('plan_expires_at', { mode: 'timestamp' }),
});

// ─── Merchants (Operators who sell channel/group subscriptions) ───────────────
export const merchants = sqliteTable('merchants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  apiKey: text('api_key').notNull().unique(), // API key issued to merchant
  apironeAccountId: text('apirone_account_id').notNull(),
  apironeTransferKey: text('apirone_transfer_key').notNull(),
  webhookSecret: text('webhook_secret').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ─── Channel/Group Products ───────────────────────────────────────────────────
export const channelProducts = sqliteTable('channel_products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  merchantId: integer('merchant_id').notNull().references(() => merchants.id),
  telegramChatId: text('telegram_chat_id').notNull(), // channel or group chat_id
  chatTitle: text('chat_title').notNull(),
  chatType: text('chat_type', { enum: ['channel', 'group', 'supergroup'] }).notNull(),
  chatUsername: text('chat_username'),
  description: text('description'),
  imageUrl: text('image_url'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ─── Subscription Plans for channels ─────────────────────────────────────────
export const subscriptionPlans = sqliteTable('subscription_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channelProductId: integer('channel_product_id').notNull().references(() => channelProducts.id),
  name: text('name').notNull(),           // e.g. "Monthly", "3 Months"
  priceUsd: real('price_usd').notNull(),  // Price in USD
  durationDays: integer('duration_days').notNull(),  // Duration
  maxUsers: integer('max_users'),         // null = unlimited
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceRef: text('invoice_ref').notNull().unique(), // Our internal ref
  apironeInvoiceId: text('apirone_invoice_id'),        // Apirone invoice ID
  userId: integer('user_id').notNull().references(() => users.id),
  merchantId: integer('merchant_id').references(() => merchants.id),
  channelProductId: integer('channel_product_id').references(() => channelProducts.id),
  subscriptionPlanId: integer('subscription_plan_id').references(() => subscriptionPlans.id),
  type: text('type', { enum: ['platform_sub', 'channel_sub', 'payment_link'] }).notNull(),
  currency: text('currency').notNull(),          // btc, usdt@trx, etc.
  amountCrypto: text('amount_crypto').notNull(), // in minor units as string
  amountUsd: real('amount_usd').notNull(),
  status: text('status', {
    enum: ['pending', 'created', 'paid', 'partpaid', 'overpaid', 'completed', 'expired', 'failed']
  }).default('pending').notNull(),
  callbackUrl: text('callback_url'),
  paymentAddress: text('payment_address'),
  apironeInvoiceUrl: text('apirone_invoice_url'),
  metadata: text('metadata'),  // JSON string for extra data
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ─── Channel Subscriptions (active access records) ───────────────────────────
export const channelSubscriptions = sqliteTable('channel_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  channelProductId: integer('channel_product_id').notNull().references(() => channelProducts.id),
  subscriptionPlanId: integer('subscription_plan_id').notNull().references(() => subscriptionPlans.id),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id),
  inviteLink: text('invite_link'),     // Telegram private invite link
  inviteLinkHash: text('invite_link_hash'), // Hash part of link for tracking
  status: text('status', { enum: ['active', 'expired', 'revoked'] }).default('active').notNull(),
  startsAt: integer('starts_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ─── Payment Links (generic) ─────────────────────────────────────────────────
export const paymentLinks = sqliteTable('payment_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  merchantId: integer('merchant_id').notNull().references(() => merchants.id),
  slug: text('slug').notNull().unique(),    // Short unique code
  title: text('title').notNull(),
  description: text('description'),
  amountUsd: real('amount_usd'),           // null = open amount
  currency: text('currency').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ─── Transactions log ─────────────────────────────────────────────────────────
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').references(() => invoices.id),
  userId: integer('user_id').references(() => users.id),
  txHash: text('tx_hash'),
  inputAddress: text('input_address'),
  currency: text('currency').notNull(),
  valueMinor: text('value_minor').notNull(),  // minor units as string
  confirmations: integer('confirmations').default(0),
  callbackPayload: text('callback_payload'), // raw callback JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ─── Audit / Bot Messages log ─────────────────────────────────────────────────
export const botLogs = sqliteTable('bot_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id'),
  action: text('action').notNull(),
  details: text('details'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many }) => ({
  merchants: many(merchants),
  invoices: many(invoices),
  channelSubscriptions: many(channelSubscriptions),
  transactions: many(transactions),
}));

export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  user: one(users, {
    fields: [merchants.userId],
    references: [users.id],
  }),
  channelProducts: many(channelProducts),
  invoices: many(invoices),
  paymentLinks: many(paymentLinks),
}));

export const channelProductsRelations = relations(channelProducts, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [channelProducts.merchantId],
    references: [merchants.id],
  }),
  subscriptionPlans: many(subscriptionPlans),
  invoices: many(invoices),
  channelSubscriptions: many(channelSubscriptions),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ one, many }) => ({
  channelProduct: one(channelProducts, {
    fields: [subscriptionPlans.channelProductId],
    references: [channelProducts.id],
  }),
  invoices: many(invoices),
  channelSubscriptions: many(channelSubscriptions),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  merchant: one(merchants, {
    fields: [invoices.merchantId],
    references: [merchants.id],
  }),
  channelProduct: one(channelProducts, {
    fields: [invoices.channelProductId],
    references: [channelProducts.id],
  }),
  subscriptionPlan: one(subscriptionPlans, {
    fields: [invoices.subscriptionPlanId],
    references: [subscriptionPlans.id],
  }),
  channelSubscriptions: many(channelSubscriptions),
  transactions: many(transactions),
}));

export const channelSubscriptionsRelations = relations(channelSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [channelSubscriptions.userId],
    references: [users.id],
  }),
  channelProduct: one(channelProducts, {
    fields: [channelSubscriptions.channelProductId],
    references: [channelProducts.id],
  }),
  subscriptionPlan: one(subscriptionPlans, {
    fields: [channelSubscriptions.subscriptionPlanId],
    references: [subscriptionPlans.id],
  }),
  invoice: one(invoices, {
    fields: [channelSubscriptions.invoiceId],
    references: [invoices.id],
  }),
}));

export const paymentLinksRelations = relations(paymentLinks, ({ one }) => ({
  merchant: one(merchants, {
    fields: [paymentLinks.merchantId],
    references: [merchants.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  invoice: one(invoices, {
    fields: [transactions.invoiceId],
    references: [invoices.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const botLogsRelations = relations(botLogs, ({ one }) => ({
  user: one(users, {
    fields: [botLogs.userId],
    references: [users.id],
  }),
}));
