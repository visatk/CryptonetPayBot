import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Send, Copy, CheckCircle, Wallet as WalletIcon, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '../context/ApiContext';
import { useTelegramBackButton, haptic } from '../hooks/useTelegramTheme';
import { useNavigate } from 'react-router-dom';

// ── Currency meta ─────────────────────────────────────────────────────────────
const CURRENCY_META: Record<string, { label: string; icon: string; color: string }> = {
  btc:         { label: 'Bitcoin',       icon: '₿',  color: '#f7931a' },
  eth:         { label: 'Ethereum',      icon: 'Ξ',  color: '#627eea' },
  ltc:         { label: 'Litecoin',      icon: 'Ł',  color: '#bfbbbb' },
  trx:         { label: 'TRON',          icon: '⚡', color: '#ef0027' },
  bnb:         { label: 'BNB',           icon: '🟡', color: '#f3ba2f' },
  doge:        { label: 'Dogecoin',      icon: '🐕', color: '#c2a633' },
  gram:        { label: 'TON',           icon: '💎', color: '#0088cc' },
  'usdt@trx':  { label: 'USDT (TRC-20)',icon: '💵', color: '#26a17b' },
  'usdc@trx':  { label: 'USDC (TRC-20)',icon: '💵', color: '#2775ca' },
  'usdt@eth':  { label: 'USDT (ERC-20)',icon: '💵', color: '#26a17b' },
  'usdc@eth':  { label: 'USDC (ERC-20)',icon: '💵', color: '#2775ca' },
  'usdt@bnb':  { label: 'USDT (BEP-20)',icon: '💵', color: '#26a17b' },
  'usdt@ton':  { label: 'USDT (TON)',    icon: '💵', color: '#26a17b' },
};

interface Balance { currency: string; balance: number; address: string; }

// ── BalanceCard ───────────────────────────────────────────────────────────────
function BalanceCard({
  bal, onCopy, copied,
}: { bal: Balance; onCopy: (a: string) => void; copied: boolean }) {
  const meta = CURRENCY_META[bal.currency] ?? { label: bal.currency.toUpperCase(), icon: '🪙', color: '#999' };
  const hasBal = bal.balance > 0;

  return (
    <div
      style={{
        background: 'var(--tg-theme-bg-color)',
        borderRadius: 16,
        padding: '14px 16px',
      }}
      className="animate-fade-up"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: `${meta.color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            {meta.icon}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{meta.label}</p>
            <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
              {bal.currency.toUpperCase()}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{
            fontSize: 15, fontWeight: 700, margin: 0,
            color: hasBal ? 'var(--tg-theme-text-color)' : 'var(--tg-theme-hint-color)',
          }}>
            {hasBal ? bal.balance.toFixed(6) : '0.000000'}
          </p>
        </div>
      </div>

      {bal.address && (
        <button
          onClick={() => onCopy(bal.address)}
          className="pressable"
          style={{
            marginTop: 10,
            display: 'flex', alignItems: 'center', gap: 6,
            width: '100%',
            background: 'var(--tg-theme-secondary-bg-color)',
            borderRadius: 10, padding: '8px 10px',
            border: 'none', cursor: 'pointer',
          }}
        >
          {copied
            ? <CheckCircle size={13} color="#22c55e" />
            : <Copy size={13} color="var(--tg-theme-hint-color)" />
          }
          <span style={{
            fontSize: 11, fontFamily: 'monospace',
            color: 'var(--tg-theme-hint-color)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            textAlign: 'left',
          }}>
            {copied ? 'Copied!' : bal.address}
          </span>
        </button>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WalletPage() {
  const { user, apiFetch, fetchUser } = useApi();
  const navigate = useNavigate();
  const [balances, setBalances]   = useState<Balance[]>([]);
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  useTelegramBackButton(() => navigate('/'));

  const loadBalances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/tma/wallet/balance');
      if (res.ok) {
        const data = await res.json() as { balances: Balance[] };
        setBalances(data.balances ?? []);
      }
    } catch {
      toast.error('Failed to load balances');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (user?.hasWallet) loadBalances();
  }, [user?.hasWallet, loadBalances]);

  async function createWallet() {
    setCreating(true);
    haptic.impact('medium');
    try {
      const res = await apiFetch('/tma/wallet/create', { method: 'POST' });
      const data = await res.json() as { message?: string; error?: string };
      if (res.ok) {
        haptic.success();
        toast.success(data.message ?? 'Wallet created!');
        await fetchUser();
        await loadBalances();
      } else {
        haptic.error();
        toast.error(data.error ?? 'Failed to create wallet');
      }
    } finally {
      setCreating(false);
    }
  }

  async function copyAddress(addr: string) {
    try {
      await navigator.clipboard.writeText(addr);
      haptic.select();
      setCopiedAddr(addr);
      toast.success('Address copied!');
      setTimeout(() => setCopiedAddr(null), 2000);
    } catch {
      toast.error('Copy failed');
    }
  }

  // ── No wallet yet ──────────────────────────────────────────────────────────
  if (!user?.hasWallet) {
    return (
      <div style={{ padding: 16, minHeight: '100%', background: 'var(--tg-theme-secondary-bg-color)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>My Wallet</h1>
        <p style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', margin: '0 0 20px' }}>
          Create your crypto wallet to receive payments
        </p>

        <div
          style={{
            background: 'var(--tg-theme-bg-color)',
            borderRadius: 20,
            padding: '40px 24px',
            textAlign: 'center',
          }}
          className="animate-scale-in"
        >
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'color-mix(in srgb, var(--tg-theme-button-color) 12%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <WalletIcon size={32} color="var(--tg-theme-button-color)" strokeWidth={1.5} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>No Wallet Yet</h2>
          <p style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', margin: '0 0 24px', lineHeight: 1.5 }}>
            Your Apirone crypto wallet will be created instantly. Start receiving BTC, ETH, USDT and more.
          </p>
          <button
            onClick={createWallet}
            disabled={creating}
            className="pressable"
            style={{
              width: '100%', padding: '15px', borderRadius: 14,
              background: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
              fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating
              ? <><RefreshCw size={18} className="animate-spin-slow" /> Creating…</>
              : <><Plus size={18} /> Create Wallet</>}
          </button>
        </div>
      </div>
    );
  }

  // ── Wallet view ────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--tg-theme-secondary-bg-color)', minHeight: '100%', padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>My Wallet</h1>
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>Crypto balances & addresses</p>
        </div>
        <button
          onClick={loadBalances}
          disabled={loading}
          className="pressable"
          style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'var(--tg-theme-bg-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer',
          }}
        >
          <RefreshCw
            size={17}
            strokeWidth={2}
            color="var(--tg-theme-hint-color)"
            style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}
          />
        </button>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => { haptic.impact('light'); navigate('/invoice'); }}
          className="pressable"
          style={{
            padding: '13px 16px', borderRadius: 14,
            background: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
            fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
            border: 'none', cursor: 'pointer',
          }}
        >
          <ArrowDownLeft size={17} /> Receive
        </button>
        <button
          className="pressable"
          style={{
            padding: '13px 16px', borderRadius: 14,
            background: 'var(--tg-theme-bg-color)',
            color: 'var(--tg-theme-text-color)',
            fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
            border: 'none', cursor: 'pointer',
          }}
        >
          <Send size={17} /> Send
        </button>
      </div>

      {/* Balances list */}
      <p className="section-title">Balances</p>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="shimmer" style={{ height: 80 }} />
          ))}
        </div>
      ) : balances.length === 0 ? (
        <div
          style={{
            background: 'var(--tg-theme-bg-color)', borderRadius: 16,
            padding: '32px 16px', textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
            No wallets yet. Create an invoice to generate addresses.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {balances.map(bal => (
            <BalanceCard
              key={bal.currency}
              bal={bal}
              onCopy={copyAddress}
              copied={copiedAddr === bal.address}
            />
          ))}
        </div>
      )}
    </div>
  );
}
