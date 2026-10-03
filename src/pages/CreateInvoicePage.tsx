import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, ExternalLink, Check, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { useApi } from '../context/ApiContext';
import { useTelegramBackButton, useTelegramMainButton, haptic } from '../hooks/useTelegramTheme';
import CryptoIcon, { getCryptoBg } from '../components/CryptoIcon';

// ── Currency list ─────────────────────────────────────────────────────────────
const CURRENCIES = [
  { id: 'usdt@trx', label: 'USDT TRC-20' },
  { id: 'usdt@ton', label: 'USDT TON'    },
  { id: 'usdt@eth', label: 'USDT ERC-20' },
  { id: 'gram',     label: 'TON'          },
  { id: 'btc',      label: 'Bitcoin'      },
  { id: 'eth',      label: 'Ethereum'     },
  { id: 'trx',      label: 'TRON'         },
  { id: 'ltc',      label: 'Litecoin'     },
  { id: 'bnb',      label: 'BNB'          },
  { id: 'doge',     label: 'Dogecoin'     },
];

interface InvoiceResult {
  ref:          string;
  address:      string;
  invoiceUrl:   string;
  amountCrypto: string;
  currency:     string;
  amountUsd:    number;
  expires:      string;
}

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(expiresIso: string | null) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!expiresIso) return;
    const calc = () => Math.max(0, Math.floor((new Date(expiresIso).getTime() - Date.now()) / 1000));
    setRemaining(calc());
    const id = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(id);
  }, [expiresIso]);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// ── Result screen ─────────────────────────────────────────────────────────────
function ResultView({ result, onReset }: { result: InvoiceResult; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  const countdown = useCountdown(result.expires);
  const color = getCryptoBg(result.currency);

  async function copyAddress() {
    await navigator.clipboard.writeText(result.address);
    haptic.select();
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div style={{ padding: 16, minHeight: '100%', background: 'var(--tg-theme-secondary-bg-color)' }}>
      {/* Success header */}
      <div style={{ textAlign: 'center', padding: '24px 0 20px' }} className="animate-scale-in">
        <div style={{
          width: 68, height: 68, borderRadius: '50%',
          background: 'rgba(34,197,94,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Invoice Created!</h1>
        <p style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', margin: 0 }}>
          Share your address or open the invoice page
        </p>
      </div>

      {/* Invoice details */}
      <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 18, overflow: 'hidden', marginBottom: 12 }}>
        {/* Amount */}
        <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--tg-theme-section-separator-color)' }}>
          <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '0 0 8px' }}>Amount</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CryptoIcon currency={result.currency} size={40} />
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, margin: 0, color }}>
                {result.amountCrypto}
              </p>
              <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
                {result.currency.toUpperCase()} ≈ ${result.amountUsd.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Address */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--tg-theme-section-separator-color)' }}>
          <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '0 0 6px' }}>Payment Address</p>
          <p style={{
            fontFamily: 'monospace', fontSize: 12,
            wordBreak: 'break-all', lineHeight: 1.6,
            margin: '0 0 10px',
          }}>
            {result.address}
          </p>
          <button
            onClick={copyAddress}
            className="pressable"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: copied ? '#22c55e' : 'var(--tg-theme-button-color)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, padding: 0,
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy Address'}
          </button>
        </div>

        {/* Timer */}
        <div style={{
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(239,68,68,0.04)',
        }}>
          <Clock size={15} color="#ef4444" />
          <p style={{ fontSize: 13, color: '#ef4444', margin: 0, fontWeight: 500 }}>
            Expires in {countdown}
          </p>
        </div>
      </div>

      {/* CTA */}
      <a
        href={result.invoiceUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => haptic.impact('light')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '15px', borderRadius: 14,
          background: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
          fontSize: 15, fontWeight: 700, textDecoration: 'none',
          marginBottom: 10,
        }}
        className="pressable"
      >
        <ExternalLink size={17} /> Open Invoice Page
      </a>
      <button
        onClick={onReset}
        className="pressable"
        style={{
          width: '100%', padding: 15, borderRadius: 14,
          background: 'var(--tg-theme-bg-color)',
          color: 'var(--tg-theme-text-color)',
          fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
        }}
      >
        Create Another
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CreateInvoicePage() {
  const { user, apiFetch } = useApi();
  const navigate = useNavigate();

  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [amountUsd, setAmount]  = useState('');
  const [currency, setCurrency] = useState('usdt@trx');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<InvoiceResult | null>(null);
  const [rates, setRates]       = useState<Record<string, number>>({});

  useTelegramBackButton(() => result ? setResult(null) : navigate('/'));

  // Load rates once
  useEffect(() => {
    fetch('/api/tma/rates')
      .then(r => r.json())
      .then((data: Array<{ currency: string; price: number }>) => {
        const m: Record<string, number> = {};
        for (const r of data) m[r.currency] = r.price;
        setRates(m);
      }).catch(() => {});
  }, []);

  const canCreate = !!user?.hasWallet;
  const atLimit   = user?.plan === 'free' && (user?.txCount ?? 0) >= 10;
  const isValid   = !!title.trim() && parseFloat(amountUsd) > 0 && canCreate && !atLimit;
  const cryptoPrev = rates[currency] && amountUsd
    ? (parseFloat(amountUsd) / rates[currency]).toFixed(6)
    : null;

  async function handleCreate() {
    if (!isValid) return;
    setLoading(true);
    haptic.impact('medium');
    try {
      const res  = await apiFetch('/tma/invoice/create', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), description, amountUsd: parseFloat(amountUsd), currency }),
      });
      const data = await res.json() as InvoiceResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create invoice');
      haptic.success();
      setResult(data);
    } catch (e: unknown) {
      haptic.error();
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useTelegramMainButton('Create Invoice', handleCreate, { enabled: isValid, loading });

  if (result) return <ResultView result={result} onReset={() => setResult(null)} />;

  const color = getCryptoBg(currency);

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 16, minHeight: '100%', background: 'var(--tg-theme-secondary-bg-color)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Create Invoice</h1>
      <p style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', margin: '0 0 20px' }}>
        Accept crypto payment from anyone
      </p>

      {/* Alerts */}
      {!canCreate && (
        <div style={{
          display: 'flex', gap: 10, padding: '12px 14px',
          borderRadius: 12, marginBottom: 12,
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
        }}>
          <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>
            Create a wallet first to issue invoices.
          </p>
        </div>
      )}
      {atLimit && (
        <div style={{
          display: 'flex', gap: 10, padding: '12px 14px',
          borderRadius: 12, marginBottom: 12,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
        }}>
          <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}>
            Free plan limit reached (10 tx). Upgrade to Pro for unlimited invoices.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Title */}
        <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 14, padding: '12px 16px' }}>
          <label style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', fontWeight: 500 }}>
            Invoice Title *
          </label>
          <input
            type="text"
            placeholder="e.g. Web Design Service"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: '100%', marginTop: 6, fontSize: 15, fontWeight: 500 }}
          />
        </div>

        {/* Amount */}
        <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 14, padding: '12px 16px' }}>
          <label style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', fontWeight: 500 }}>
            Amount (USD) *
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--tg-theme-hint-color)' }}>$</span>
            <input
              type="number"
              placeholder="0.00"
              value={amountUsd}
              onChange={e => setAmount(e.target.value)}
              min="0.01" step="0.01"
              style={{ flex: 1, fontSize: 22, fontWeight: 700 }}
            />
          </div>
          {cryptoPrev && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <CryptoIcon currency={currency} size={16} bg={false} />
              <p style={{ fontSize: 12, color, margin: 0, fontWeight: 600 }}>
                ≈ {cryptoPrev} {currency.toUpperCase()}
              </p>
            </div>
          )}
        </div>

        {/* Currency selector */}
        <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 14, padding: '12px 16px' }}>
          <label style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', fontWeight: 500, display: 'block', marginBottom: 10 }}>
            Payment Currency
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {CURRENCIES.map(c => {
              const active = currency === c.id;
              const cColor = getCryptoBg(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => { haptic.select(); setCurrency(c.id); }}
                  className="pressable"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 10px', borderRadius: 10,
                    fontSize: 12, fontWeight: 600,
                    border: active ? `1.5px solid ${cColor}` : '1.5px solid transparent',
                    background: active ? `${cColor}12` : 'var(--tg-theme-secondary-bg-color)',
                    color: active ? cColor : 'var(--tg-theme-text-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <CryptoIcon currency={c.id} size={18} bg={false} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 14, padding: '12px 16px' }}>
          <label style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', fontWeight: 500 }}>
            Description (optional)
          </label>
          <textarea
            placeholder="Add a note for the payer…"
            value={description}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            style={{ width: '100%', marginTop: 6, fontSize: 14, resize: 'none', lineHeight: 1.5 }}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={loading || !isValid}
          className="pressable"
          style={{
            width: '100%', padding: 16, borderRadius: 14,
            background: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: 'none', cursor: 'pointer',
            opacity: (!isValid || loading) ? 0.5 : 1,
          }}
        >
          {loading
            ? <><RefreshCw size={17} className="animate-spin-slow" /> Creating…</>
            : <><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Create Invoice</>
          }
        </button>
      </div>
    </div>
  );
}
