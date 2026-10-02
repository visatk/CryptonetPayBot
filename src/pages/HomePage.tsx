import { useNavigate } from 'react-router-dom';
import { useApi } from '../context/ApiContext';
import { haptic } from '../hooks/useTelegramTheme';
import {
  Wallet, FileText, Tv2, Store, Zap, Crown, ArrowRight,
  TrendingUp, Shield, Clock, ChevronRight, Bell, RefreshCw,
} from 'lucide-react';

// ── Stat card data ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.18)',
        borderRadius: 14,
        padding: '12px 14px',
        flex: 1,
        backdropFilter: 'blur(8px)',
      }}
    >
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

// ── Quick action button ───────────────────────────────────────────────────────
function QuickAction({
  label, emoji, color, to, onClick,
}: { label: string; emoji: string; color: string; to?: string; onClick?: () => void }) {
  const navigate = useNavigate();
  const handleClick = () => {
    haptic.impact('light');
    if (to) navigate(to);
    else onClick?.();
  };
  return (
    <button
      onClick={handleClick}
      className="pressable"
      style={{
        background: 'var(--tg-theme-bg-color)',
        borderRadius: 16,
        padding: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        border: 'none',
        width: '100%',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 40, height: 40,
          borderRadius: 12,
          background: `${color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}
      >
        {emoji}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>
        {label}
      </span>
    </button>
  );
}

// ── Feature row ───────────────────────────────────────────────────────────────
function FeatureRow({ icon: Icon, color, title, desc, last }: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  color: string; title: string; desc: string; last?: boolean;
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <span
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <Icon size={18} strokeWidth={1.8} color={color} />
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>{desc}</p>
        </div>
        <ChevronRight size={16} color="var(--tg-theme-hint-color)" />
      </div>
      {!last && <div className="divider" style={{ marginLeft: 64 }} />}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, loading, fetchUser } = useApi();
  const navigate = useNavigate();
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

  const isPro   = user?.plan === 'pro';
  const txUsed  = user?.txCount ?? 0;
  const txPct   = Math.min((txUsed / 10) * 100, 100);
  const name    = loading ? '' : (tgUser?.first_name || user?.firstName || 'User');

  return (
    <div style={{ background: 'var(--tg-theme-secondary-bg-color)', minHeight: '100%' }}>
      {/* ── Hero Header ── */}
      <div
        style={{
          background: `linear-gradient(145deg, var(--tg-theme-button-color), color-mix(in srgb, var(--tg-theme-button-color) 60%, #7c3aed))`,
          padding: '20px 16px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 140, height: 140, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, left: -20,
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, position: 'relative' }}>
          <div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>
              Welcome back 👋
            </p>
            {loading ? (
              <div style={{ width: 120, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.2)' }} className="shimmer" />
            ) : (
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>{name}</h1>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { haptic.impact('light'); fetchUser(); }}
              className="pressable"
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
              }}
            >
              <RefreshCw size={16} color="#fff" strokeWidth={2} />
            </button>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: isPro ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.18)',
                borderRadius: 10, padding: '6px 10px',
              }}
            >
              {isPro ? <Crown size={14} color="#fbbf24" strokeWidth={2} /> : <Shield size={14} color="rgba(255,255,255,0.8)" />}
              <span style={{ fontSize: 12, fontWeight: 700, color: isPro ? '#fbbf24' : 'rgba(255,255,255,0.9)' }}>
                {isPro ? 'PRO' : 'FREE'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
          <StatCard label="Transactions" value={`${txUsed}`} sub={isPro ? 'Unlimited' : `of 10`} />
          <StatCard label="Plan" value={isPro ? 'Pro 🚀' : 'Free 📦'} />
          <StatCard label="Wallet" value={user?.hasWallet ? '✅' : '➕'} sub={user?.hasWallet ? 'Active' : 'Create'} />
        </div>

        {/* Usage bar */}
        {!isPro && (
          <div style={{ marginTop: 14, position: 'relative' }}>
            <div style={{
              height: 4, borderRadius: 4,
              background: 'rgba(255,255,255,0.2)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 4,
                width: `${txPct}%`,
                background: txPct >= 80 ? '#fbbf24' : '#fff',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
              {txUsed}/10 free transactions used
            </p>
          </div>
        )}
      </div>

      {/* ── Upgrade Banner ── */}
      {!isPro && (
        <div style={{ padding: '0 16px', marginTop: -14 }}>
          <button
            onClick={() => { haptic.impact('medium'); navigate('/merchant'); }}
            className="pressable"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              borderRadius: 16,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Crown size={20} color="#fff" />
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Upgrade to Pro</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: '2px 0 0' }}>
                  Unlimited transactions — \$9.99/mo
                </p>
              </div>
            </div>
            <ArrowRight size={18} color="#fff" />
          </button>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <p className="section-title">Quick Actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <QuickAction label="Create Invoice" emoji="🧾" color="#6366f1" to="/invoice" />
          <QuickAction label="My Wallet"      emoji="💼" color="#10b981" to="/wallet" />
          <QuickAction label="Channel Subs"   emoji="📢" color="#f59e0b" to="/channels" />
          <QuickAction label="Merchant API"   emoji="🏪" color="#8b5cf6" to="/merchant" />
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ padding: '20px 16px 24px' }}>
        <p className="section-title">Platform Features</p>
        <div className="card">
          <FeatureRow
            icon={Zap}
            color="#f59e0b"
            title="Instant Crypto Payments"
            desc="BTC, ETH, USDT, TRX + 9 more"
          />
          <FeatureRow
            icon={TrendingUp}
            color="#10b981"
            title="Live Exchange Rates"
            desc="Real-time crypto/USD conversion"
          />
          <FeatureRow
            icon={Tv2}
            color="#6366f1"
            title="Channel Subscriptions"
            desc="Sell paid access to your channels"
          />
          <FeatureRow
            icon={Bell}
            color="#8b5cf6"
            title="Payment Notifications"
            desc="Instant Telegram alerts on payment"
          />
          <FeatureRow
            icon={Clock}
            color="#ef4444"
            title="1-hour Secure Invoices"
            desc="Time-limited payment addresses"
            last
          />
        </div>
      </div>
    </div>
  );
}
