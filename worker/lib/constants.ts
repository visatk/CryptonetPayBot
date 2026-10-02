/**
 * App-wide constants — premium edition
 */

// ─── Plan Limits ──────────────────────────────────────────────────────────────
export const PLAN_LIMITS = {
  free: {
    maxTx: 10,
    label: 'Free',
    price: 0,
    features: [
      '10 transactions/month',
      'Basic bot commands',
      'Mini App access',
    ],
  },
  pro: {
    maxTx: -1, // unlimited
    label: 'Pro',
    price: 9.99,
    features: [
      'Unlimited transactions',
      'Priority support',
      'Merchant API access',
      'Channel subscription management',
      'Analytics dashboard',
      'Payment links',
      'Instant notifications',
    ],
  },
} as const;

// ─── Supported Currencies ─────────────────────────────────────────────────────
export const SUPPORTED_CURRENCIES = [
  { id: 'btc',       label: 'Bitcoin',       emoji: '₿',  confirmations: 2  },
  { id: 'eth',       label: 'Ethereum',      emoji: 'Ξ',  confirmations: 12 },
  { id: 'ltc',       label: 'Litecoin',      emoji: 'Ł',  confirmations: 6  },
  { id: 'trx',       label: 'TRON',          emoji: '⚡', confirmations: 10 },
  { id: 'bnb',       label: 'BNB',           emoji: '🟡', confirmations: 12 },
  { id: 'doge',      label: 'Dogecoin',      emoji: '🐕', confirmations: 6  },
  { id: 'gram',      label: 'TON',           emoji: '💎', confirmations: 10 },
  { id: 'usdt@trx',  label: 'USDT (TRC-20)', emoji: '💵', confirmations: 10 },
  { id: 'usdc@trx',  label: 'USDC (TRC-20)', emoji: '💵', confirmations: 10 },
  { id: 'usdt@eth',  label: 'USDT (ERC-20)', emoji: '💵', confirmations: 12 },
  { id: 'usdt@bnb',  label: 'USDT (BEP-20)', emoji: '💵', confirmations: 12 },
  { id: 'usdt@ton',  label: 'USDT (TON)',    emoji: '💵', confirmations: 10 },
];

// ─── Bot Text Templates ───────────────────────────────────────────────────────
export const TEXTS = {

  WELCOME: (name: string, isPro: boolean, txCount: number) => `\
💎 <b>CryptonetPay</b>

👋 Hello, <b>${name}</b>!

${isPro
  ? `🚀 <b>Pro Plan</b> — Unlimited Transactions Active`
  : `📦 <b>Free Plan</b> — <code>${txCount}/10</code> transactions used`}

<b>Your crypto payment gateway on Telegram:</b>
• 🧾 Create & share crypto invoices
• 📢 Sell channel/group subscriptions
• 🔗 Generate payment links
• 📊 Track all transactions in Mini App

Press <b>Open App</b> to access your dashboard:`,

  FORCE_JOIN: (channel: string) => `\
⚠️ <b>Join Required</b>

To use CryptonetPay, please join our channel first:
👉 @${channel.replace('@', '')}

After joining, tap <b>✅ I Joined</b> to continue.`,

  PLANS: (isPro: boolean) => `\
💳 <b>Subscription Plans</b>

━━━━━━━━━━━━━━━
📦 <b>Free Plan</b>  —  <b>FREE</b>
• 10 transactions/month
• Basic bot commands
• Mini App access

━━━━━━━━━━━━━━━
🚀 <b>Pro Plan</b>  —  <b>$9.99/month</b>
✅ Unlimited transactions
✅ Priority support
✅ Merchant API access
✅ Channel subscriptions
✅ Analytics dashboard
✅ Payment links

━━━━━━━━━━━━━━━
${isPro ? '✅ <b>You are on Pro Plan!</b>' : ''}`,

  HELP: `\
❓ <b>CryptonetPay Help</b>

<b>Commands:</b>
/start — Main menu
/plans — View subscription plans
/mysubs — My active subscriptions
/balance — My wallet & balances
/help — This help message

<b>Supported Currencies:</b>
BTC • ETH • USDT • TRX • TON • LTC • BNB • DOGE + more

<b>How it works:</b>
1. Create a wallet in the Mini App
2. Share your invoice or payment link
3. Receive crypto directly to your account
4. Manage everything from the dashboard

📞 Support: @CryptonetPay_Support`,

  PAYMENT_RECEIVED: (
    currency: string,
    amount: string,
    usd: number,
    ref: string
  ) => `\
✅ <b>Payment Received!</b>

💰 <code>${amount}</code> <b>${currency.toUpperCase()}</b>
≈ <b>$${usd.toFixed(2)}</b>

Invoice: <code>${ref}</code>

Open your Mini App to view the full transaction history.`,

  CHANNEL_ACCESS: (chatTitle: string, inviteLink: string, expiresAt: Date) => `\
🎉 <b>Access Granted!</b>

Welcome to <b>${chatTitle}</b>!

📅 Your subscription is active until:
<b>${expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</b>

👇 Join via your private invite link:`,

  SUB_EXPIRING_SOON: (chatTitle: string, daysLeft: number) => `\
⏰ <b>Subscription Expiring Soon</b>

Your access to <b>${chatTitle}</b> expires in <b>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</b>.

Renew now to keep your access active!`,

  SUB_EXPIRED: (chatTitle: string) => `\
❌ <b>Subscription Expired</b>

Your access to <b>${chatTitle}</b> has ended.

To regain access, purchase a new subscription via /start`,
};

// ─── Invoice statuses ─────────────────────────────────────────────────────────
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending:   '⏳ Pending',
  created:   '🔄 Awaiting Payment',
  paid:      '💚 Paid',
  partpaid:  '🟡 Partially Paid',
  overpaid:  '💙 Overpaid',
  completed: '✅ Completed',
  expired:   '❌ Expired',
  failed:    '🔴 Failed',
};
