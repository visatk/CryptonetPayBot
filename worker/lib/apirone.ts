/**
 * Apirone API client wrapper
 * Docs: https://apirone.com/docs/
 */

interface ApironeInvoiceParams {
  currency: string;
  amount: string | number;
  lifetime?: number;
  callbackUrl?: string;
  userData?: Record<string, unknown>;
  linkback?: string;
}

interface ApironeInvoice {
  invoice: string;
  created: string;
  account: string;
  currency: string;
  amount: number;
  expire: string;
  address: string;
  'callback-url'?: string;
  'user-data'?: Record<string, unknown>;
  linkback?: string;
  status: string;
  'invoice-url': string;
}

interface ApironeWallet {
  currency: string;
  balance: number;
  address: string;
}

interface ApironeRate {
  currency: string;
  quote: string;
  price: number;
  updated: string;
}

const APIRONE_BASE = 'https://apirone.com/api/v2';

export function createApirone(accountId: string, transferKey: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  async function request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${APIRONE_BASE}${path}`;
    const res = await fetch(url, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Apirone API error ${res.status}: ${err}`);
    }

    return res.json() as Promise<T>;
  }

  return {
    /**
     * Create an invoice for payment
     * POST /accounts/{account}/invoices
     */
    async createInvoice(params: ApironeInvoiceParams): Promise<ApironeInvoice> {
      return request<ApironeInvoice>('POST', `/accounts/${accountId}/invoices`, {
        currency: params.currency,
        amount: String(params.amount),
        lifetime: params.lifetime ?? 3600,
        'callback-url': params.callbackUrl,
        'user-data': params.userData,
        linkback: params.linkback,
      });
    },

    /**
     * Get invoice status
     * GET /accounts/{account}/invoices/{invoice}
     */
    async getInvoice(invoiceId: string): Promise<ApironeInvoice> {
      return request<ApironeInvoice>('GET', `/accounts/${accountId}/invoices/${invoiceId}`);
    },

    /**
     * List invoices
     * GET /accounts/{account}/invoices
     */
    async listInvoices(limit = 20, offset = 0): Promise<{ data: ApironeInvoice[] }> {
      return request<{ data: ApironeInvoice[] }>(
        'GET',
        `/accounts/${accountId}/invoices?limit=${limit}&offset=${offset}`
      );
    },

    /**
     * Get wallets/balances for the account
     * GET /accounts/{account}/wallets
     */
    async getWallets(): Promise<ApironeWallet[]> {
      return request<ApironeWallet[]>('GET', `/accounts/${accountId}/wallets`);
    },

    /**
     * Create a wallet for a specific currency
     * POST /accounts/{account}/wallets
     */
    async createWallet(currency: string, callbackUrl?: string): Promise<ApironeWallet & { 'callback-url'?: string }> {
      return request<ApironeWallet>('POST', `/accounts/${accountId}/wallets`, {
        currency,
        'callback-url': callbackUrl,
      });
    },

    /**
     * Get exchange rate
     * GET /v2/ticker?currency={currency}&quote={quote}
     */
    async getRate(currency: string, quote: string = 'usd'): Promise<ApironeRate> {
      const res = await fetch(`${APIRONE_BASE}/ticker?currency=${currency}&quote=${quote}`);
      const data = await res.json() as ApironeRate | ApironeRate[];
      return (Array.isArray(data) ? data[0] : data) as ApironeRate;
    },

    /**
     * Transfer funds
     * POST /accounts/{account}/transfer
     */
    async transfer(params: {
      currency: string;
      destinations: Array<{ address: string; amount: string | number }>;
      fee?: string;
      feeRate?: number;
    }): Promise<{ txid: string }> {
      return request<{ txid: string }>('POST', `/accounts/${accountId}/transfer`, {
        currency: params.currency,
        destinations: params.destinations,
        fee: params.fee ?? 'normal',
        'fee-rate': params.feeRate,
        'transfer-key': transferKey,
      });
    },

    /**
     * Get account info
     * GET /accounts/{account}
     */
    async getAccount(): Promise<{ account: string; created: string }> {
      return request<{ account: string; created: string }>('GET', `/accounts/${accountId}`);
    },

    /**
     * Generate receiving address for a wallet
     * POST /accounts/{account}/wallets/{walletId}/addresses
     */
    async generateAddress(walletId: string, callbackUrl?: string): Promise<{ address: string }> {
      return request<{ address: string }>(
        'POST',
        `/accounts/${accountId}/wallets/${walletId}/addresses`,
        { 'callback-url': callbackUrl }
      );
    },
  };
}

/**
 * Get exchange rates for all supported currencies
 */
export async function getAllRates(): Promise<Record<string, number>> {
  const res = await fetch(`${APIRONE_BASE}/ticker?currency=usd`);
  const data = await res.json() as ApironeRate[];
  const result: Record<string, number> = {};
  for (const r of data) {
    result[r.currency] = r.price;
  }
  return result;
}

/**
 * Convert USD amount to crypto minor units
 */
export function usdToCryptoMinorUnits(usd: number, rateUsd: number, currency: string): string {
  const amount = usd / rateUsd;

  // Minor unit factors (from Apirone docs)
  const factors: Record<string, number> = {
    btc: 1e8,    // satoshi
    ltc: 1e8,    // litoshi
    bch: 1e8,
    doge: 1e8,
    trx: 1e6,    // SUN
    eth: 1e18,   // wei
    bnb: 1e18,
    'usdt@trx': 1e6,
    'usdc@trx': 1e6,
    'usdt@eth': 1e6,
    'usdc@eth': 1e6,
    'usdt@bnb': 1e6,
    'usdc@bnb': 1e6,
    gram: 1e9,   // nanoGram TON
    'usdt@ton': 1e9,
  };

  const factor = factors[currency.toLowerCase()] || 1e8;
  return Math.round(amount * factor).toString();
}
