import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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
  { id: 'usdt@trx', label: 'USDT TRC-20', emoji: '💵' },
  { id: 'btc', label: 'Bitcoin', emoji: '₿' },
  { id: 'eth', label: 'Ethereum', emoji: 'Ξ' },
  { id: 'trx', label: 'TRON', emoji: '⚡' },
  { id: 'usdt@ton', label: 'USDT TON', emoji: '💵' },
  { id: 'gram', label: 'TON', emoji: '💎' },
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
      <div className="flex items-center justify-center h-screen">
        <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--tg-theme-button-color)' }} />
      </div>
    );
  }

  if (notFound || !link) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-xl font-bold mb-2">Link Not Found</h1>
        <p style={{ color: 'var(--tg-theme-hint-color)' }}>This payment link doesn't exist or has been deactivated.</p>
      </div>
    );
  }

  if (invoice) {
    const expiresIn = Math.max(0, Math.floor((new Date(invoice.expires).getTime() - Date.now()) / 60000));
    return (
      <div className="p-4 min-h-full" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
        <div className="flex flex-col items-center py-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="text-xl font-bold mb-1">Payment Ready</h1>
          <p className="text-sm text-center" style={{ color: 'var(--tg-theme-hint-color)' }}>
            Send crypto to the address below
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
          <div className="p-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
            <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Pay To</p>
            <p className="font-bold">{link.title}</p>
            <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>by {link.merchant.name}</p>
          </div>
          <div className="p-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
            <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Amount</p>
            <p className="text-2xl font-bold">{invoice.amountCrypto}</p>
            <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>{invoice.currency.toUpperCase()} ≈ ${invoice.amountUsd}</p>
          </div>
          <div className="p-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--tg-theme-hint-color)' }}>Address</p>
            <p className="font-mono text-xs break-all mb-2">{invoice.address}</p>
            <button onClick={copyAddress} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--tg-theme-button-color)' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Address'}
            </button>
          </div>
          <div className="p-3">
            <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>⏱ Expires in ~{expiresIn} minutes</p>
          </div>
        </div>

        <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-semibold text-white"
          style={{ background: 'var(--tg-theme-button-color)' }}
        >
          <ExternalLink size={18} /> Open Invoice Page
        </a>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-full" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
      {/* Header */}
      <div className="rounded-2xl p-5 mb-5 text-center" style={{ background: 'var(--tg-theme-bg-color)' }}>
        <p className="text-4xl mb-2">💳</p>
        <h1 className="text-xl font-bold">{link.title}</h1>
        {link.description && <p className="text-sm mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>{link.description}</p>}
        <p className="text-xs mt-2" style={{ color: 'var(--tg-theme-hint-color)' }}>by {link.merchant.name}</p>
      </div>

      <div className="space-y-3">
        {/* Amount */}
        {link.amountUsd ? (
          <div className="rounded-2xl p-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
            <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Amount</p>
            <p className="text-3xl font-bold">${link.amountUsd.toFixed(2)}</p>
          </div>
        ) : (
          <div className="rounded-2xl p-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
            <label className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Enter Amount (USD) *</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold">$</span>
              <input type="number" placeholder="0.00" value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="flex-1 bg-transparent outline-none text-xl font-bold"
                style={{ color: 'var(--tg-theme-text-color)' }}
              />
            </div>
          </div>
        )}

        {/* Currency */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
          <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--tg-theme-hint-color)' }}>Currency</label>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map(c => (
              <button key={c.id} onClick={() => setCurrency(c.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium"
                style={currency === c.id
                  ? { background: 'var(--tg-theme-button-color)', color: 'white' }
                  : { background: 'var(--tg-theme-secondary-bg-color)' }
                }
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={createPayment} disabled={paying || (!link.amountUsd && !customAmount)}
          className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--tg-theme-button-color)' }}
        >
          {paying ? <RefreshCw size={18} className="animate-spin" /> : null}
          {paying ? 'Creating Payment…' : '💰 Pay Now'}
        </button>
      </div>
    </div>
  );
}
