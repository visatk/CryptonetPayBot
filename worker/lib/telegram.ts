import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify Telegram Bot webhook signature
 * Uses X-Telegram-Bot-Api-Secret-Token header
 */
export function verifyTelegramWebhook(secret: string, provided: string): boolean {
  if (!secret || !provided) return false;
  return secret === provided;
}

/**
 * Verify Telegram Mini App initData
 * Returns user ID if valid, null if invalid
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(initData: string, botToken: string): number | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    // Sort parameters alphabetically
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // HMAC-SHA-256 with key = HMAC-SHA-256("WebAppData", botToken)
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const expectedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Timing-safe compare
    const hashBuf = Buffer.from(hash, 'hex');
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (hashBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(hashBuf, expectedBuf)) return null;

    // Check expiry (1 hour)
    const authDate = parseInt(params.get('auth_date') || '0');
    if (Date.now() / 1000 - authDate > 3600) return null;

    // Extract user
    const userStr = params.get('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr) as { id: number };
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Verify Apirone callback signature (via query secret param)
 */
export function verifyApironeCallback(secret: string, provided: string): boolean {
  if (!secret || !provided) return false;
  try {
    const sBuf = Buffer.from(secret);
    const pBuf = Buffer.from(provided);
    if (sBuf.length !== pBuf.length) return false;
    return timingSafeEqual(sBuf, pBuf);
  } catch {
    return false;
  }
}
