import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import CryptoIcon, { getCryptoBg } from '../components/CryptoIcon';

interface PaymentLink {
  id: number;
  slug: string;
  title: string;
  description?: string;
  amountUsd?: number;
  currency: string;
  isActive: boolean;
  merchant: { name: string };
}

interface PayInvoice {
  invoiceUrl: string;
  address: string;
  amountCrypto: string;
  amountUsd: number;
  currency: string;
  expires: string;
}

const CURRENCIES = [
  { id: 'usdt@trx', label: 'USDT TRC-20' },
  { id: 'usdt@ton', label: 'USDT TON'    },
  { id: 'btc',      label: 'Bitcoin'      },
  { id: 'eth',      label: 'Ethereum'     },
  { id: 'gram',     label: 'TON'          },
  { id: 'trx',      label: 'TRON'         },
];

export default function PaymentLinkPage() {
  const { slug } = useParams<{ slug: string }>();
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currency, setCurrency] = useState('usdt@trx');
  const [customAmount, setCustomAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [invoice, setInvoice] = useState<PayInvoice | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/pay/${slug}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json() as Promise<{ link: PaymentLink }>;
      })
      .then(data => { if (data) setLink(data.link); })
      .finally(() => setLoading(false));
  }, [slug]);

  async function createPayment() {
    if (!link) return;
    const amount = link.amountUsd || parseFloat(customAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }

    setPaying(true);
    try {
      const res = await fetch(`/api/pay/${slug}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency, amountUsd: amount }),
      });
      const data = await res.json() as PayInvoice;
      if (!res.ok) { toast.error('Failed to create payment'); return; }
      setInvoice(data);
    } finally {
      setPaying(false);
    }
  }

  async function copyAddress() {
    if (!invoice) return;
    await navigator.clipboard.writeText(invoice.address);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--tg-theme-secondary-bg-color)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--tg-theme-button-color)' }} />
      </div>
    );
  }

  if (notFound || !link) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 32, textAlign: 'center', background: 'var(--tg-theme-secondary-bg-color)' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'rgba(107,114,128,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.7">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Link Not Found</h1>
        <p style={{ color: 'var(--tg-theme-hint-color)', fontSize: 14, margin: 0 }}>
          This payment link doesn't exist or has been deactivated.
        </p>
      </div>
    );
  }

  if (invoice) {
    const expiresIn = Math.max(0, Math.floor((new Date(invoice.expires).getTime() - Date.now()) / 60000));
    const color = getCryptoBg(invoice.currency);
    return (
      <div style={{ padding: 16, minHeight: '100%', background: 'var(--tg-theme-secondary-bg-color)' }}>
        {/* Success header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0 20px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(34,197,94,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Payment Ready</h1>
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', textAlign: 'center', margin: 0 }}>
            Send crypto to the address below
          </p>
        </div>

        <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
          {/* Merchant info */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--tg-theme-section-separator-color)' }}>
            <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', margin: '0 0 2px' }}>Pay To</p>
            <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{link.title}</p>
            <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
              by {link.merchant.name}
            </p>
          </div>

          {/* Amount */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--tg-theme-section-separator-color)' }}>
            <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', margin: '0 0 8px' }}>Amount</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CryptoIcon currency={invoice.currency} size={40} />
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, margin: 0, color }}>{invoice.amountCrypto}</p>
                <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
                  {invoice.currency.toUpperCase()} ≈ ${invoice.amountUsd}
                </p>
              </div>
            </div>
          </div>

          {/* Address */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--tg-theme-section-separator-color)' }}>
            <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', margin: '0 0 6px' }}>Address</p>
            <p style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', margin: '0 0 10px' }}>
              {invoice.address}
            </p>
            <button
              onClick={copyAddress}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600,
                color: copied ? '#22c55e' : 'var(--tg-theme-button-color)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Address'}
            </button>
          </div>

          {/* Timer */}
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--tg-theme-hint-color)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: 0 }}>
              Expires in ~{expiresIn} minutes
            </p>
          </div>
        </div>

        <a
          href={invoice.invoiceUrl}
          target="_blank" rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '15px', borderRadius: 14,
            background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)',
            fontSize: 15, fontWeight: 700, textDecoration: 'none',
          }}
          className="pressable"
        >
          <ExternalLink size={18} /> Open Invoice Page
        </a>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, minHeight: '100%', background: 'var(--tg-theme-secondary-bg-color)' }}>
      {/* Header */}
      <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 20, padding: '24px 20px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{
          width: 60, height: 60, borderRadius: 18,
          background: 'color-mix(in srgb, var(--tg-theme-button-color) 12%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--tg-theme-button-color)" strokeWidth="1.8">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{link.title}</h1>
        {link.description && (
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '4px 0 4px', lineHeight: 1.5 }}>
            {link.description}
          </p>
        )}
        <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '4px 0 0' }}>
          by {link.merchant.name}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Amount */}
        {link.amountUsd ? (
          <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 16, padding: '16px' }}>
            <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '0 0 4px' }}>Amount</p>
            <p style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>${link.amountUsd.toFixed(2)}</p>
            <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>USD</p>
          </div>
        ) : (
          <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 16, padding: '16px' }}>
            <label style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>Enter Amount (USD) *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 700 }}>$</span>
              <input
                type="number" placeholder="0.00" value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                style={{ flex: 1, fontSize: 24, fontWeight: 700, background: 'transparent', border: 'none', outline: 'none', color: 'var(--tg-theme-text-color)' }}
              />
            </div>
          </div>
        )}

        {/* Currency */}
        <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 16, padding: '16px' }}>
          <label style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 10 }}>
            Pay with
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CURRENCIES.map(c => {
              const active = currency === c.id;
              const color  = getCryptoBg(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => setCurrency(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 12px', borderRadius: 12,
                    background: active ? `${color}12` : 'var(--tg-theme-secondary-bg-color)',
                    border: active ? `1.5px solid ${color}` : '1.5px solid transparent',
                    color: active ? color : 'var(--tg-theme-text-color)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                  className="pressable"
                >
                  <CryptoIcon currency={c.id} size={20} bg={false} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={createPayment}
          disabled={paying || (!link.amountUsd && !customAmount)}
          style={{
            width: '100%', padding: '15px', borderRadius: 14,
            background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: 'none', cursor: 'pointer',
            opacity: (paying || (!link.amountUsd && !customAmount)) ? 0.5 : 1,
          }}
          className="pressable"
        >
          {paying ? (
            <><RefreshCw size={18} className="animate-spin" /> Creating Payment…</>
          ) : (
            <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg> Pay Now</>
          )}
        </button>
      </div>
    </div>
  );
}
