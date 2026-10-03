import { useState, useEffect, useCallback, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useApi } from '../context/ApiContext';
import { useTelegramBackButton, haptic } from '../hooks/useTelegramTheme';

interface SubscriptionPlan {
  id: number;
  name: string;
  priceUsd: number;
  durationDays: number;
  maxUsers?: number;
}

interface ChannelProduct {
  id: number;
  chatTitle: string;
  chatType: string;
  chatUsername?: string;
  description?: string;
  subscriptionPlans: SubscriptionPlan[];
  merchant: { name: string };
}

// ── Professional SVG crypto icons ─────────────────────────────────────────────
const CRYPTO_ICONS: Record<string, JSX.Element> = {
  btc: (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#F7931A"/>
      <path d="M22.5 14.2c.3-2-1.2-3-3.3-3.7l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.6-1.6-.4-.7 2.7c-.3-.1-.7-.2-1-.2v0l-2.2-.6-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8.9l-.8 3.3c0 0 .1 0 .1.1-.1 0-.1 0-.2-.1l-1.2 4.6c-.1.2-.3.5-.7.4 0 .1-1.2-.3-1.2-.3L10 21.5l2.1.5c.4.1.8.2 1.2.3l-.7 2.7 1.6.4.7-2.7c.4.1.9.2 1.3.3l-.7 2.7 1.6.4.7-2.7c2.8.5 4.9.3 5.8-2.2.7-2-.0-3.1-1.5-3.9 1-.3 1.8-1 2-2.6zm-3.6 5.1c-.5 2-3.9.9-5 .7l.9-3.5c1.1.3 4.6.8 4.1 2.8zm.5-5.1c-.5 1.8-3.4.9-4.3.7l.8-3.2c.9.2 3.9.7 3.5 2.5z" fill="white"/>
    </svg>
  ),
  eth: (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#627EEA"/>
      <path d="M16.498 4v8.87l7.497 3.35L16.498 4z" fill="white" fillOpacity=".6"/>
      <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="white"/>
      <path d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z" fill="white" fillOpacity=".6"/>
      <path d="M16.498 27.995v-6.028L9 17.616l7.498 10.379z" fill="white"/>
      <path d="M16.498 20.573l7.497-4.353-7.497-3.348v7.701z" fill="white" fillOpacity=".2"/>
      <path d="M9 16.22l7.498 4.353v-7.7L9 16.22z" fill="white" fillOpacity=".6"/>
    </svg>
  ),
  'usdt@trx': (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#26A17B"/>
      <path d="M17.8 16.1c-.1 0-.8 0-1.8 0s-1.7 0-1.8 0c-3.5-.2-6.1-.9-6.1-1.8 0-.9 2.6-1.6 6.1-1.8v1.1c.1 0 .8.1 1.8.1s1.6-.1 1.8-.1v-1.1c3.5.2 6.1.9 6.1 1.8 0 .9-2.6 1.6-6.1 1.8zM16 9C10.5 9 6 10.1 6 11.5v9C6 21.9 10.5 23 16 23s10-1.1 10-2.5v-9C26 10.1 21.5 9 16 9zm1.8 9.7c-.1 0-.8 0-1.8 0s-1.7 0-1.8 0c-4.1-.2-7.2-1.3-7.2-2.6v-2c0 1.3 3.1 2.4 7.2 2.6.1 0 .8 0 1.8 0s1.6 0 1.8 0c4.1-.2 7.2-1.3 7.2-2.6v2c0 1.3-3.1 2.4-7.2 2.6z" fill="white"/>
    </svg>
  ),
  'usdt@eth': (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#26A17B"/>
      <path d="M17.8 16.1c-.1 0-.8 0-1.8 0s-1.7 0-1.8 0c-3.5-.2-6.1-.9-6.1-1.8 0-.9 2.6-1.6 6.1-1.8v1.1c.1 0 .8.1 1.8.1s1.6-.1 1.8-.1v-1.1c3.5.2 6.1.9 6.1 1.8 0 .9-2.6 1.6-6.1 1.8zM16 9C10.5 9 6 10.1 6 11.5v9C6 21.9 10.5 23 16 23s10-1.1 10-2.5v-9C26 10.1 21.5 9 16 9zm1.8 9.7c-.1 0-.8 0-1.8 0s-1.7 0-1.8 0c-4.1-.2-7.2-1.3-7.2-2.6v-2c0 1.3 3.1 2.4 7.2 2.6.1 0 .8 0 1.8 0s1.6 0 1.8 0c4.1-.2 7.2-1.3 7.2-2.6v2c0 1.3-3.1 2.4-7.2 2.6z" fill="white"/>
    </svg>
  ),
  'usdt@ton': (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#26A17B"/>
      <path d="M17.8 16.1c-.1 0-.8 0-1.8 0s-1.7 0-1.8 0c-3.5-.2-6.1-.9-6.1-1.8 0-.9 2.6-1.6 6.1-1.8v1.1c.1 0 .8.1 1.8.1s1.6-.1 1.8-.1v-1.1c3.5.2 6.1.9 6.1 1.8 0 .9-2.6 1.6-6.1 1.8z" fill="white"/>
    </svg>
  ),
  'usdt@bnb': (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#26A17B"/>
      <path d="M17.8 16.1c-.1 0-.8 0-1.8 0s-1.7 0-1.8 0c-3.5-.2-6.1-.9-6.1-1.8 0-.9 2.6-1.6 6.1-1.8v1.1c.1 0 .8.1 1.8.1s1.6-.1 1.8-.1v-1.1c3.5.2 6.1.9 6.1 1.8 0 .9-2.6 1.6-6.1 1.8z" fill="white"/>
    </svg>
  ),
  gram: (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#0088CC"/>
      <path d="M8 11.5l8 3.5 8-3.5L16 8 8 11.5zm0 0v9l8 3.5v-9l-8-3.5zm16 0v9l-8 3.5v-9l8-3.5z" fill="white" fillOpacity=".9"/>
    </svg>
  ),
  trx: (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#EF0027"/>
      <path d="M23.8 12.3L21 9.8l-11.8 2.1 8.4 13.4 6.2-13zm-7.4 10.1L11.2 14l9-1.6-4.8 10zM13 13.5l7.4-1.3-4 8.8L13 13.5z" fill="white"/>
    </svg>
  ),
  ltc: (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#BFBBBB"/>
      <text x="10" y="22" fontSize="14" fontWeight="700" fill="white">Ł</text>
    </svg>
  ),
  bnb: (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#F3BA2F"/>
      <path d="M12.4 14.3L16 10.7l3.6 3.6 2.1-2.1L16 6.5 10.3 12.2l2.1 2.1zm-3.7 1.7L10.8 14l-2.1 2.1L10.8 18l-2.1 2.1L12 23.5 16 27.5l4-4 3.3-3.4-2.1-2.1L16 22.8l-5-5 3.4-3.4-2-2L8.7 16zm15.3 0L21.9 14l-2.1 2.1 2.1 2.1-2.1 2.1L23.3 24l2.1-2.1L21.5 18l4.4-2.1-.1.1zm-8 2.3L16 18.3l0 0-.2-.2-3.4-3.4 2.1-2.1L16 14.7l1.5-1.5 2.1 2.1L16 18.3z" fill="white"/>
    </svg>
  ),
  doge: (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#C2A633"/>
      <text x="10" y="21" fontSize="12" fontWeight="700" fill="white">D</text>
    </svg>
  ),
};

const CURRENCIES = [
  { id: 'usdt@trx', label: 'USDT TRC-20', color: '#26a17b', networkLabel: 'TRC-20' },
  { id: 'usdt@ton', label: 'USDT TON',    color: '#26a17b', networkLabel: 'TON' },
  { id: 'usdt@eth', label: 'USDT ERC-20', color: '#26a17b', networkLabel: 'ERC-20' },
  { id: 'gram',     label: 'TON',         color: '#0088cc', networkLabel: 'TON' },
  { id: 'btc',      label: 'Bitcoin',     color: '#f7931a', networkLabel: 'BTC' },
  { id: 'eth',      label: 'Ethereum',    color: '#627eea', networkLabel: 'ETH' },
  { id: 'trx',      label: 'TRON',        color: '#ef0027', networkLabel: 'TRX' },
];

function CryptoIcon({ currency, size = 18 }: { currency: string; size?: number }) {
  const icon = CRYPTO_ICONS[currency];
  if (!icon) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#6366f1', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: size * 0.5, color: '#fff',
        fontWeight: 700,
      }}>
        {currency.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  // Clone with correct size
  return (
    <span style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
      {icon}
    </span>
  );
}

// ── Buy plan inline widget ────────────────────────────────────────────────────
function BuyPlanWidget({
  productId, plan, apiFetch,
}: {
  productId: number;
  plan: SubscriptionPlan;
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>;
}) {
  const [step, setStep] = useState<'idle' | 'currency' | 'loading' | 'done'>('idle');
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [address, setAddress] = useState('');
  const [amountCrypto, setAmountCrypto] = useState('');
  const [selCurr, setSelCurr] = useState('');
  const [copied, setCopied] = useState(false);

  async function createInvoice(curr: string) {
    setStep('loading');
    setSelCurr(curr);
    haptic.impact('medium');
    try {
      const res  = await apiFetch(`/tma/channel/${productId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ planId: plan.id, currency: curr }),
      });
      const data = await res.json() as { invoiceUrl: string; address: string; amountCrypto: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setInvoiceUrl(data.invoiceUrl);
      setAddress(data.address);
      setAmountCrypto(data.amountCrypto);
      haptic.success();
      setStep('done');
    } catch (e: unknown) {
      haptic.error();
      toast.error((e as Error).message);
      setStep('idle');
    }
  }

  async function copyAddr() {
    await navigator.clipboard.writeText(address);
    haptic.select();
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => { haptic.select(); setStep('currency'); }}
        className="pressable"
        style={{
          width: '100%', padding: '13px', borderRadius: 12,
          background: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
          fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
        </svg>
        Subscribe — ${plan.priceUsd}
      </button>
    );
  }

  if (step === 'currency') {
    return (
      <div>
        <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginBottom: 10, fontWeight: 500 }}>
          Choose payment currency:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {CURRENCIES.map(c => (
            <button
              key={c.id}
              onClick={() => createInvoice(c.id)}
              className="pressable"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 10,
                background: `${c.color}12`, border: `1px solid ${c.color}40`,
                color: c.color, fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <CryptoIcon currency={c.id} size={16} />
              {c.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setStep('idle')}
          style={{ marginTop: 8, fontSize: 12, color: 'var(--tg-theme-hint-color)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          ← Cancel
        </button>
      </div>
    );
  }

  if (step === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tg-theme-button-color)" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>Creating invoice…</span>
      </div>
    );
  }

  // done
  const currMeta = CURRENCIES.find(c => c.id === selCurr);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        padding: '12px', borderRadius: 10,
        background: 'var(--tg-theme-secondary-bg-color)',
        border: '1px solid var(--tg-theme-section-separator-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <CryptoIcon currency={selCurr} size={20} />
          <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: currMeta?.color }}>
            {amountCrypto} {selCurr.toUpperCase()}
          </p>
        </div>
        <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', margin: '0 0 6px' }}>Send to address:</p>
        <p style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', margin: 0 }}>{address}</p>
        <button
          onClick={copyAddr}
          style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: copied ? '#22c55e' : 'var(--tg-theme-button-color)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {copied
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          }
          {copied ? 'Copied!' : 'Copy Address'}
        </button>
      </div>
      <a
        href={invoiceUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => haptic.impact('light')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '13px', borderRadius: 12,
          background: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
          fontSize: 14, fontWeight: 700, textDecoration: 'none',
        }}
        className="pressable"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Open Invoice Page
      </a>
      <button
        onClick={() => setStep('idle')}
        style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 0' }}
      >
        Create new
      </button>
    </div>
  );
}

// ── Channel detail ────────────────────────────────────────────────────────────
function ChannelDetail({ product, apiFetch }: { product: ChannelProduct; apiFetch: ReturnType<typeof useApi>['apiFetch'] }) {
  const [sharing, setSharing] = useState(false);

  async function shareChannel() {
    setSharing(true);
    haptic.impact('light');
    try {
      const res = await apiFetch(`/tma/channel/${product.id}/share`);
      const data = await res.json() as { deepLink: string };
      if (data.deepLink) {
        const tg = window.Telegram?.WebApp;
        if (tg?.openTelegramLink) {
          tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(data.deepLink)}&text=${encodeURIComponent(`Join ${product.chatTitle} — Premium channel on CryptonetPay`)}`);
        } else {
          await navigator.clipboard.writeText(data.deepLink);
          toast.success('Share link copied!');
        }
      }
    } catch {
      toast.error('Failed to get share link');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div style={{ padding: 16, minHeight: '100%', background: 'var(--tg-theme-secondary-bg-color)' }}>
      {/* Product header */}
      <div
        style={{
          background: 'var(--tg-theme-bg-color)', borderRadius: 20,
          padding: '24px 16px', textAlign: 'center', marginBottom: 16,
        }}
        className="animate-scale-in"
      >
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: product.chatType === 'channel'
            ? 'rgba(99,102,241,0.12)'
            : 'rgba(16,185,129,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          {product.chatType === 'channel'
            ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.13 12a19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 21 16.92z"/></svg>
            : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          }
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{product.chatTitle}</h2>
        {product.chatUsername && (
          <p style={{ fontSize: 13, color: 'var(--tg-theme-button-color)', margin: '0 0 4px' }}>
            @{product.chatUsername}
          </p>
        )}
        {product.description && (
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '6px 0 0', lineHeight: 1.5 }}>
            {product.description}
          </p>
        )}
        <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', margin: '8px 0 12px' }}>
          by {product.merchant.name}
        </p>

        {/* Share button */}
        <button
          onClick={shareChannel}
          disabled={sharing}
          className="pressable"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10,
            background: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-button-color)',
            fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            opacity: sharing ? 0.6 : 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share Channel
        </button>
      </div>

      <p className="section-title">Subscription Plans</p>

      {product.subscriptionPlans.length === 0 ? (
        <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>No plans available yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {product.subscriptionPlans.map(plan => (
            <div
              key={plan.id}
              style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 16, padding: '16px' }}
              className="animate-fade-up"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{plan.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {plan.durationDays} days
                    </span>
                    {plan.maxUsers && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        Max {plan.maxUsers}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--tg-theme-button-color)', margin: 0, lineHeight: 1 }}>
                    ${plan.priceUsd}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>USD</p>
                </div>
              </div>
              <BuyPlanWidget productId={product.id} plan={plan} apiFetch={apiFetch} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ChannelsPage() {
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [products, setProducts]  = useState<ChannelProduct[]>([]);
  const [loading, setLoading]    = useState(true);
  const [selected, setSelected]  = useState<ChannelProduct | null>(null);

  useTelegramBackButton(() => selected ? setSelected(null) : navigate('/'));

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch('/tma/channels');
      const data = await res.json() as { products: ChannelProduct[] };
      setProducts(data.products ?? []);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  if (selected) {
    return <ChannelDetail product={selected} apiFetch={apiFetch} />;
  }

  return (
    <div style={{ padding: 16, minHeight: '100%', background: 'var(--tg-theme-secondary-bg-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Channels & Groups</h1>
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
            Buy access to premium content
          </p>
        </div>
        <button
          onClick={loadProducts}
          disabled={loading}
          className="pressable"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--tg-theme-bg-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tg-theme-hint-color)" strokeWidth="2.2" style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}>
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 88 }} />)}
        </div>
      ) : products.length === 0 ? (
        <div style={{
          background: 'var(--tg-theme-bg-color)', borderRadius: 20,
          padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'rgba(99,102,241,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.7">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.13 12 19.8 19.8 0 0 1 1.06 3.33A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 21 16.92z"/>
            </svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>No Channels Yet</p>
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '0 0 20px', lineHeight: 1.5 }}>
            Become a merchant to list your premium channel or group
          </p>
          <button
            onClick={() => { haptic.impact('medium'); navigate('/merchant'); }}
            className="pressable"
            style={{
              padding: '12px 24px', borderRadius: 12,
              background: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
              fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}
          >
            Become Merchant
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {products.map(p => {
            const minPrice = p.subscriptionPlans.length
              ? Math.min(...p.subscriptionPlans.map(s => s.priceUsd))
              : null;
            return (
              <button
                key={p.id}
                onClick={() => { haptic.select(); setSelected(p); }}
                className="pressable"
                style={{
                  background: 'var(--tg-theme-bg-color)', borderRadius: 16,
                  padding: '14px 16px', width: '100%', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                  border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: p.chatType === 'channel' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {p.chatType === 'channel'
                    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.13 12 19.8 19.8 0 0 1 1.06 3.33A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 21 16.92z"/></svg>
                    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.chatTitle}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
                    {p.subscriptionPlans.length} plan{p.subscriptionPlans.length !== 1 ? 's' : ''} • {p.chatType}
                  </p>
                  {minPrice !== null && (
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--tg-theme-button-color)', margin: '2px 0 0' }}>
                      From ${minPrice.toFixed(2)}
                    </p>
                  )}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tg-theme-hint-color)" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
