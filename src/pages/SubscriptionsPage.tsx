import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../context/ApiContext';
import { useTelegramBackButton, haptic } from '../hooks/useTelegramTheme';

interface Subscription {
  id: number;
  status: 'active' | 'expired' | 'revoked';
  inviteLink?: string;
  startsAt: string;
  expiresAt: string;
  channelProduct: { id: number; chatTitle: string; chatType: string };
  subscriptionPlan: { name: string; durationDays: number; priceUsd: number };
}

const STATUS_CONFIG = {
  active:  { label: 'Active',  color: '#059669', bg: 'rgba(5,150,105,0.1)',   dot: '#10b981' },
  expired: { label: 'Expired', color: '#dc2626', bg: 'rgba(220,38,38,0.1)',   dot: '#ef4444' },
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

function ChannelIcon({ type }: { type: string }) {
  if (type === 'channel') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.13 12a19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 21 16.92z"/>
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
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
        <button
          onClick={loadSubs}
          disabled={loading}
          className="pressable"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--tg-theme-bg-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tg-theme-hint-color)" strokeWidth="2.2"
            style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}>
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
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
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'rgba(99,102,241,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.7">
              <path d="M9 12l2 2 4-4"/><path d="M21 12c.552 0 1-.448 1-1V6a1 1 0 0 0-1-1h-7L11 3H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7"/>
              <circle cx="18" cy="18" r="3"/>
              <path d="M18 15v3l2 1"/>
            </svg>
          </div>
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

            return (
              <div
                key={sub.id}
                style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 16, padding: '14px 16px' }}
                className="animate-fade-up"
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                      background: sub.channelProduct.chatType === 'channel'
                        ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ChannelIcon type={sub.channelProduct.chatType} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                        {sub.channelProduct.chatTitle}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
                        {sub.subscriptionPlan.name} — ${sub.subscriptionPlan.priceUsd}
                      </p>
                    </div>
                  </div>
                  <span className="badge" style={{ background: sc.bg, color: sc.color, flexShrink: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                    {sc.label}
                  </span>
                </div>

                {/* Time info */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  fontSize: 12, color: 'var(--tg-theme-hint-color)',
                  marginBottom: isActive && sub.inviteLink ? 10 : 0,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {isActive
                      ? `${days} day${days !== 1 ? 's' : ''} left`
                      : `Expired ${formatDate(sub.expiresAt)}`}
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
                      padding: '11px', borderRadius: 12,
                      background: 'var(--tg-theme-button-color)',
                      color: 'var(--tg-theme-button-text-color)',
                      fontSize: 14, fontWeight: 600, textDecoration: 'none',
                    }}
                    className="pressable"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Join Channel
                  </a>
                )}

                {/* Renewal button for expired subs */}
                {!isActive && (
                  <button
                    onClick={() => { haptic.select(); navigate('/channels'); }}
                    style={{
                      marginTop: 8, width: '100%', padding: '10px', borderRadius: 12,
                      background: 'var(--tg-theme-secondary-bg-color)',
                      color: 'var(--tg-theme-button-color)',
                      fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                    }}
                    className="pressable"
                  >
                    Renew Subscription
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
