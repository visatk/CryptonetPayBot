import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, ChevronRight, RefreshCw, ExternalLink } from 'lucide-react';
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

const CURRENCIES = [
  { id: 'usdt@trx', label: 'USDT TRC-20', emoji: '💵', color: '#26a17b' },
  { id: 'usdt@ton', label: 'USDT TON',    emoji: '💵', color: '#26a17b' },
  { id: 'gram',     label: 'TON',          emoji: '💎', color: '#0088cc' },
  { id: 'btc',      label: 'Bitcoin',      emoji: '₿',  color: '#f7931a' },
  { id: 'eth',      label: 'Ethereum',     emoji: 'Ξ',  color: '#627eea' },
  { id: 'trx',      label: 'TRON',         emoji: '⚡', color: '#ef0027' },
];

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

  if (step === 'idle') {
    return (
      <button
        onClick={() => { haptic.select(); setStep('currency'); }}
        className="pressable"
        style={{
          width: '100%', padding: '12px', borderRadius: 12,
          background: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
          fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
        }}
      >
        Subscribe — \${plan.priceUsd}
      </button>
    );
  }

  if (step === 'currency') {
    return (
      <div>
        <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginBottom: 8, fontWeight: 500 }}>
          Choose payment currency:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CURRENCIES.map(c => (
            <button
              key={c.id}
              onClick={() => createInvoice(c.id)}
              className="pressable"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 10px', borderRadius: 10,
                background: `${c.color}12`, border: `1px solid ${c.color}40`,
                color: c.color, fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
        <RefreshCw size={16} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--tg-theme-button-color)' }} />
        <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>Creating invoice…</span>
      </div>
    );
  }

  // done
  const currMeta = CURRENCIES.find(c => c.id === selCurr);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        padding: '10px 12px', borderRadius: 10,
        background: 'var(--tg-theme-secondary-bg-color)',
      }}>
        <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', margin: '0 0 2px' }}>Send to address:</p>
        <p style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all', margin: 0 }}>{address}</p>
        {amountCrypto && (
          <p style={{ fontSize: 12, fontWeight: 700, margin: '4px 0 0', color: currMeta?.color }}>
            {currMeta?.emoji} {amountCrypto} {selCurr.toUpperCase()}
          </p>
        )}
      </div>
      <a
        href={invoiceUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => haptic.impact('light')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '12px', borderRadius: 12,
          background: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
          fontSize: 14, fontWeight: 700, textDecoration: 'none',
        }}
        className="pressable"
      >
        <ExternalLink size={15} /> Pay Now
      </a>
    </div>
  );
}

// ── Channel detail ────────────────────────────────────────────────────────────
function ChannelDetail({ product, apiFetch }: { product: ChannelProduct; apiFetch: ReturnType<typeof useApi>['apiFetch'] }) {
  const icon = product.chatType === 'channel' ? '📢' : '👥';

  return (
    <div style={{ padding: 16, minHeight: '100%', background: 'var(--tg-theme-secondary-bg-color)' }}>
      {/* Product header */}
      <div
        style={{
          background: 'var(--tg-theme-bg-color)', borderRadius: 18,
          padding: '24px 16px', textAlign: 'center', marginBottom: 16,
        }}
        className="animate-scale-in"
      >
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'var(--tg-theme-secondary-bg-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, margin: '0 auto 12px',
        }}>
          {icon}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{product.chatTitle}</h2>
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
        <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', margin: '8px 0 0' }}>
          by {product.merchant.name}
        </p>
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
              style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 16, padding: '14px 16px' }}
              className="animate-fade-up"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{plan.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                      <Clock size={12} /> {plan.durationDays} days
                    </span>
                    {plan.maxUsers && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--tg-theme-hint-color)' }}>
                        <Users size={12} /> Max {plan.maxUsers}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--tg-theme-button-color)', margin: 0 }}>
                  \${plan.priceUsd}
                </p>
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
          <RefreshCw
            size={16}
            color="var(--tg-theme-hint-color)"
            style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}
          />
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 88 }} />)}
        </div>
      ) : products.length === 0 ? (
        <div style={{
          background: 'var(--tg-theme-bg-color)', borderRadius: 18,
          padding: '48px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>📢</p>
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
                  background: 'var(--tg-theme-secondary-bg-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>
                  {p.chatType === 'channel' ? '📢' : '👥'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.chatTitle}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
                    {p.subscriptionPlans.length} plan{p.subscriptionPlans.length !== 1 ? 's' : ''} available
                  </p>
                  {minPrice !== null && (
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--tg-theme-button-color)', margin: '2px 0 0' }}>
                      From \${minPrice.toFixed(2)}
                    </p>
                  )}
                </div>
                <ChevronRight size={18} color="var(--tg-theme-hint-color)" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
