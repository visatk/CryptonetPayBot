import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ExternalLink } from 'lucide-react';
import { useApi } from '../context/ApiContext';
import { useTelegramBackButton, haptic } from '../hooks/useTelegramTheme';

interface Subscription {
  id: number;
  status: 'active' | 'expired' | 'revoked';
  inviteLink?: string;
  startsAt: string;
  expiresAt: string;
  channelProduct: { chatTitle: string; chatType: string };
  subscriptionPlan: { name: string; durationDays: number; priceUsd: number };
}

const STATUS_CONFIG = {
  active:  { label: 'Active',  color: '#059669', bg: 'rgba(5,150,105,0.1)',  dot: '#10b981' },
  expired: { label: 'Expired', color: '#dc2626', bg: 'rgba(220,38,38,0.1)',  dot: '#ef4444' },
  revoked: { label: 'Revoked', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', dot: '#9ca3af' },
};

function daysLeft(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function SubscriptionsPage() {
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [subs, setSubs]       = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useTelegramBackButton(() => navigate('/'));

  const loadSubs = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch('/tma/subscriptions');
      const data = await res.json() as { subscriptions: Subscription[] };
      setSubs(data.subscriptions ?? []);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadSubs(); }, [loadSubs]);

  return (
    <div style={{ padding: 16, minHeight: '100%', background: 'var(--tg-theme-secondary-bg-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>My Subscriptions</h1>
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
            Your channel access
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 108 }} />)}
        </div>
      ) : subs.length === 0 ? (
        <div style={{
          background: 'var(--tg-theme-bg-color)', borderRadius: 18,
          padding: '48px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>📋</p>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>No Subscriptions Yet</p>
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '0 0 20px', lineHeight: 1.5 }}>
            Subscribe to premium channels and they'll appear here
          </p>
          <button
            onClick={() => { haptic.impact('medium'); navigate('/channels'); }}
            className="pressable"
            style={{
              padding: '12px 24px', borderRadius: 12,
              background: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
              fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}
          >
            Browse Channels
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subs.map(sub => {
            const sc   = STATUS_CONFIG[sub.status];
            const days = daysLeft(sub.expiresAt);
            const isActive = sub.status === 'active';
            const icon = sub.channelProduct.chatType === 'channel' ? '📢' : '👥';

            return (
              <div
                key={sub.id}
                style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 16, padding: '14px 16px' }}
                className="animate-fade-up"
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: 'var(--tg-theme-secondary-bg-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20,
                    }}>
                      {icon}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                        {sub.channelProduct.chatTitle}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
                        {sub.subscriptionPlan.name} — \${sub.subscriptionPlan.priceUsd}
                      </p>
                    </div>
                  </div>
                  <span className="badge" style={{ background: sc.bg, color: sc.color, flexShrink: 0 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: sc.dot, display: 'inline-block',
                    }} />
                    {sc.label}
                  </span>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  fontSize: 12, color: 'var(--tg-theme-hint-color)',
                  marginBottom: isActive && sub.inviteLink ? 10 : 0,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    {isActive ? `${days} day${days !== 1 ? 's' : ''} left` : `Expired ${formatDate(sub.expiresAt)}`}
                  </span>
                  <span>•</span>
                  <span>Until {formatDate(sub.expiresAt)}</span>
                </div>

                {isActive && sub.inviteLink && (
                  <a
                    href={sub.inviteLink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => haptic.impact('light')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px', borderRadius: 12,
                      background: 'var(--tg-theme-button-color)',
                      color: 'var(--tg-theme-button-text-color)',
                      fontSize: 14, fontWeight: 600, textDecoration: 'none',
                    }}
                    className="pressable"
                  >
                    <ExternalLink size={15} /> Join Channel
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
