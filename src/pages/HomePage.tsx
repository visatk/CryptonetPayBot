import { useNavigate } from 'react-router-dom';
import { useApi } from '../context/ApiContext';
import { haptic } from '../hooks/useTelegramTheme';
import CryptoIcon from '../components/CryptoIcon';

// ── Feature icons (inline SVG, no emoji) ──────────────────────────────────────
function IconZap({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
function IconShield({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function IconGlobe({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
}
function IconUsers({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function IconFileText({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
function IconWallet({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>;
}
function IconStar({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function IconStore({ color }: { color: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}

const QUICK_ACTIONS = [
  { label: 'Wallet',     icon: IconWallet,   color: '#6366f1', to: '/wallet'   },
  { label: 'Invoice',    icon: IconFileText,  color: '#10b981', to: '/invoice'  },
  { label: 'Channels',   icon: IconUsers,     color: '#f59e0b', to: '/channels' },
  { label: 'Merchant',   icon: IconStore,     color: '#8b5cf6', to: '/merchant' },
];

const FEATURES = [
  {
    icon: IconZap,
    color: '#f59e0b',
    bg:    'rgba(245,158,11,0.1)',
    title: 'Instant Settlements',
    desc:  'Receive crypto payments directly to your Apirone wallet with no delays.',
  },
  {
    icon: IconShield,
    color: '#10b981',
    bg:    'rgba(16,185,129,0.1)',
    title: 'Non-Custodial Security',
    desc:  'Your keys, your coins. We never hold your funds.',
  },
  {
    icon: IconGlobe,
    color: '#6366f1',
    bg:    'rgba(99,102,241,0.1)',
    title: 'Multi-Chain Support',
    desc:  'BTC, ETH, TRX, TON, USDT, USDC and more across multiple networks.',
  },
  {
    icon: IconUsers,
    color: '#0088cc',
    bg:    'rgba(0,136,204,0.1)',
    title: 'Channel Subscriptions',
    desc:  'Monetize Telegram channels & groups with crypto-gated access.',
  },
];

const SUPPORTED = ['btc', 'eth', 'usdt@trx', 'gram', 'trx', 'ltc', 'bnb', 'doge'];

function PlanBadge({ plan }: { plan: string }) {
  const isPro = plan === 'pro';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: isPro ? 'rgba(245,158,11,0.15)' : 'rgba(107,114,128,0.12)',
      border: `1px solid ${isPro ? 'rgba(245,158,11,0.4)' : 'rgba(107,114,128,0.25)'}`,
    }}>
      {isPro ? (
        <IconStar color="#f59e0b" />
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      )}
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: isPro ? '#d97706' : '#6b7280',
        letterSpacing: 0.5,
      }}>
        {isPro ? 'PRO' : 'FREE'}
      </span>
    </div>
  );
}

export default function HomePage() {
  const { user, loading, isOwner } = useApi();
  const navigate = useNavigate();

  return (
    <div style={{ padding: 16, background: 'var(--tg-theme-secondary-bg-color)', minHeight: '100%' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: 22,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          padding: '24px 20px',
          marginBottom: 16,
          overflow: 'hidden',
          position: 'relative',
        }}
        className="animate-scale-in"
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: -20, right: -20,
          width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: -10,
          width: 120, height: 120, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {loading ? (
            <div style={{ height: 28, width: 160, borderRadius: 8 }} className="shimmer" />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>
                Welcome back
              </p>
              {user && <PlanBadge plan={user.plan} />}
            </div>
          )}

          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '4px 0 4px', lineHeight: 1.2 }}>
            {loading ? '...' : user ? `${user.firstName}` : 'CryptonetPay'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: '0 0 18px' }}>
            Accept crypto payments via Telegram
          </p>

          {/* Crypto icons row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {SUPPORTED.map(c => (
              <div
                key={c}
                style={{
                  width: 36, height: 36, borderRadius: 10, overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}
              >
                <CryptoIcon currency={c} size={36} bg={false} />
              </div>
            ))}
          </div>

          {/* Stats row */}
          {user && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 10, marginBottom: 18,
            }}>
              {[
                {
                  label: 'Transactions',
                  value: user.txCount,
                  sub: user.plan === 'free' ? `/ ${user.limits.maxTx} free limit` : 'unlimited',
                  warn: user.plan === 'free' && user.txCount >= 8,
                },
                {
                  label: 'Plan',
                  value: user.plan === 'pro' ? 'Pro' : 'Free',
                  sub: user.plan === 'pro' ? 'unlimited tx' : 'Upgrade for more',
                  warn: false,
                },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '12px 14px',
                  backdropFilter: 'blur(10px)',
                }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '0 0 3px', fontWeight: 500 }}>
                    {s.label}
                  </p>
                  <p style={{
                    color: s.warn ? '#fbbf24' : '#fff',
                    fontSize: 18, fontWeight: 800, margin: '0 0 1px', lineHeight: 1,
                  }}>
                    {s.value}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0 }}>{s.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* CTA button */}
          <button
            onClick={() => { haptic.impact('medium'); navigate('/invoice'); }}
            className="pressable"
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Invoice
          </button>
        </div>
      </div>

      {/* ── Upgrade banner (free users near limit) ────────────────────────── */}
      {user && user.plan === 'free' && user.txCount >= 8 && (
        <div
          style={{
            borderRadius: 16, padding: '14px 16px', marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.08))',
            border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
          className="animate-fade-up"
        >
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'rgba(245,158,11,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconStar color="#f59e0b" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>
              {10 - user.txCount} transaction{10 - user.txCount !== 1 ? 's' : ''} remaining
            </p>
            <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: 0 }}>
              Upgrade to Pro for unlimited invoices
            </p>
          </div>
          <button
            onClick={() => haptic.impact('light')}
            style={{
              padding: '7px 13px', borderRadius: 10,
              background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)',
              color: '#d97706', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Upgrade
          </button>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <p className="section-title">Quick Actions</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {QUICK_ACTIONS.map(({ label, icon: Icon, color, to }) => (
          <button
            key={to}
            onClick={() => { haptic.select(); navigate(to); }}
            className="pressable"
            style={{
              padding: '16px', borderRadius: 16,
              background: 'var(--tg-theme-bg-color)',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
              border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `${color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon color={color} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{label}</p>
          </button>
        ))}
      </div>

      {/* ── Subscriptions shortcut ────────────────────────────────────────── */}
      <button
        onClick={() => { haptic.select(); navigate('/subscriptions'); }}
        className="pressable"
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 16, marginBottom: 20,
          background: 'var(--tg-theme-bg-color)',
          display: 'flex', alignItems: 'center', gap: 12,
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'rgba(16,185,129,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>My Subscriptions</p>
          <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
            View your active channel access
          </p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tg-theme-hint-color)" strokeWidth="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <p className="section-title">Why CryptonetPay?</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {FEATURES.map(f => (
          <div
            key={f.title}
            style={{
              background: 'var(--tg-theme-bg-color)', borderRadius: 16,
              padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
            }}
            className="animate-fade-up"
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: f.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <f.icon color={f.color} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 3px' }}>{f.title}</p>
              <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: 0, lineHeight: 1.5 }}>
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Admin shortcut ────────────────────────────────────────────────── */}
      {isOwner && (
        <button
          onClick={() => { haptic.select(); navigate('/admin'); }}
          className="pressable"
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 16,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'rgba(239,68,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#ef4444' }}>Admin Panel</p>
            <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>Platform management</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tg-theme-hint-color)" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}
    </div>
  );
}
