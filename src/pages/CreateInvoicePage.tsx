import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, ExternalLink, Check, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { useApi } from '../context/ApiContext';
import { useTelegramBackButton, useTelegramMainButton, haptic } from '../hooks/useTelegramTheme';

// ── Currency list ─────────────────────────────────────────────────────────────
const CURRENCIES = [
  { id: 'btc',       label: 'Bitcoin',       icon: '₿',  color: '#f7931a' },
  { id: 'usdt@trx',  label: 'USDT TRC-20',   icon: '💵', color: '#26a17b' },
  { id: 'usdt@ton',  label: 'USDT TON',      icon: '💵', color: '#26a17b' },
  { id: 'usdt@eth',  label: 'USDT ERC-20',   icon: '💵', color: '#26a17b' },
  { id: 'eth',       label: 'Ethereum',       icon: 'Ξ',  color: '#627eea' },
  { id: 'gram',      label: 'TON',            icon: '💎', color: '#0088cc' },
  { id: 'trx',       label: 'TRON',           icon: '⚡', color: '#ef0027' },
  { id: 'ltc',       label: 'Litecoin',       icon: 'Ł',  color: '#bfbbbb' },
  { id: 'bnb',       label: 'BNB',            icon: '🟡', color: '#f3ba2f' },
  { id: 'doge',      label: 'Dogecoin',       icon: '🐕', color: '#c2a633' },
];

interface InvoiceResult {
  ref:         string;
  address:     string;
  invoiceUrl:  string;
  amountCrypto: string;
  currency:    string;
  amountUsd:   number;
  expires:     string;
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

  async function copyAddress() {
    await navigator.clipboard.writeText(result.address);
    haptic.select();
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2500);
  }

  const currMeta = CURRENCIES.find(c => c.id === result.currency);

  return (
    <div style={{ padding: 16, minHeight: '100%', background: 'var(--tg-theme-secondary-bg-color)' }}>
      {/* Success header */}
      <div style={{ textAlign: 'center', padding: '24px 0 20px' }} className="animate-scale-in">
        <div style={{
          width: 68, height: 68, borderRadius: '50%',
          background: 'rgba(34,197,94,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px', fontSize: 32,
        }}>
          ✅
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Invoice Created!</h1>
        <p style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', margin: 0 }}>
          Share your address or send the invoice link
        </p>
      </div>

      {/* Invoice details */}
      <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 18, overflow: 'hidden', marginBottom: 12 }}>
        {/* Amount */}
        <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--tg-theme-section-separator-color)' }}>
          <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '0 0 4px' }}>Amount</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
              {currMeta?.icon} {result.amountCrypto}
            </p>
          </div>
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '3px 0 0' }}>
            {result.currency.toUpperCase()} ≈ \${result.amountUsd.toFixed(2)}
          </p>
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

  // Use Telegram MainButton for create action
  useTelegramMainButton('Create Invoice', handleCreate, { enabled: isValid, loading });

  if (result) return <ResultView result={result} onReset={() => setResult(null)} />;

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
            Free plan limit reached. Upgrade to Pro for unlimited invoices.
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
              min="0.01"
              step="0.01"
              style={{ flex: 1, fontSize: 22, fontWeight: 700 }}
            />
          </div>
          {cryptoPrev && (
            <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '6px 0 0' }}>
              ≈ {cryptoPrev} {currency.toUpperCase()}
            </p>
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
              return (
                <button
                  key={c.id}
                  onClick={() => { haptic.select(); setCurrency(c.id); }}
                  className="pressable"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 11px', borderRadius: 10,
                    fontSize: 12, fontWeight: 600,
                    border: active ? `1.5px solid ${c.color}` : '1.5px solid transparent',
                    background: active ? `${c.color}15` : 'var(--tg-theme-secondary-bg-color)',
                    color: active ? c.color : 'var(--tg-theme-text-color)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{c.icon}</span> {c.label}
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
            style={{
              width: '100%', marginTop: 6, fontSize: 14,
              resize: 'none', lineHeight: 1.5,
            }}
          />
        </div>

        {/* Submit — also powered by Telegram MainButton */}
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
            : '✓ Create Invoice'}
        </button>
      </div>
    </div>
  );
}
