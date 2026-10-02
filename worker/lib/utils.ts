/**
 * Utility functions
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function nanoid(length = 21): string {
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (const byte of array) {
    result += CHARS[byte % CHARS.length];
  }
  return result;
}

export function generateApiKey(): string {
  return `cnp_${nanoid(32)}`;
}

export function generateInvoiceRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = nanoid(8).toUpperCase();
  return `INV-${ts}-${rand}`;
}

export function generateWebhookSecret(): string {
  return nanoid(32);
}

/**
 * Format crypto amount for display
 */
export function formatCrypto(amount: string | number, currency: string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  const decimals: Record<string, number> = {
    btc: 8, ltc: 8, bch: 8, doge: 4,
    eth: 6, bnb: 6, trx: 2,
    'usdt@trx': 2, 'usdc@trx': 2,
    'usdt@eth': 2, 'usdc@eth': 2,
    'usdt@bnb': 2, 'usdc@bnb': 2,
    gram: 4, 'usdt@ton': 2,
  };
  const d = decimals[currency.toLowerCase()] ?? 6;
  return `${n.toFixed(d)} ${currency.toUpperCase()}`;
}

/**
 * Sleep helper for retries
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate text for Telegram messages
 */
export function truncate(text: string, max = 4096): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

/**
 * Escape HTML for Telegram parse_mode='HTML'
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
