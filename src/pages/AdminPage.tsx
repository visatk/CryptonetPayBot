import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ShoppingBag, FileText, RefreshCw, TrendingUp, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '../context/ApiContext';
import { useTelegramBackButton, haptic } from '../hooks/useTelegramTheme';

interface Stats {
  users: number;
  merchants: number;
  invoices: number;
  subscriptions: number;
}

export default function AdminPage() {
  const { isOwner, apiFetch } = useApi();
  const navigate = useNavigate();
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useTelegramBackButton(() => navigate('/'));

  useEffect(() => {
    if (!isOwner) { navigate('/'); return; }
    loadStats();
  }, [isOwner]);

  async function loadStats() {
    setLoading(true);
    haptic.impact('light');
    try {
      const res = await apiFetch('/admin/stats');
      if (res.ok) setStats(await res.json() as Stats);
      else toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  }

  async function registerWebhook() {
    setActionLoading('webhook');
    haptic.impact('medium');
    try {
      const res = await fetch('/webhook/register', { method: 'POST' });
      const data = await res.json() as { ok: boolean; description?: string };
      if (data.ok) {
        haptic.success();
        toast.success('Webhook registered successfully!');
      } else {
        haptic.error();
        toast.error(data.description ?? 'Failed to register webhook');
      }
    } catch {
      haptic.error();
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  }

  async function setBotCommands() {
    setActionLoading('commands');
    haptic.impact('medium');
    try {
      const res = await fetch('/webhook/commands', { method: 'POST' });
      const data = await res.json() as { ok: boolean; description?: string };
      if (data.ok) {
        haptic.success();
        toast.success('Bot commands updated!');
      } else {
        haptic.error();
        toast.error(data.description ?? 'Failed to set commands');
      }
    } catch {
      haptic.error();
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  }

  if (!isOwner) return null;

  const statCards = stats ? [
    { label: 'Total Users',   value: stats.users,         icon: Users,       color: '#6366f1' },
    { label: 'Merchants',     value: stats.merchants,     icon: ShoppingBag, color: '#f59e0b' },
    { label: 'Invoices',      value: stats.invoices,      icon: FileText,    color: '#10b981' },
    { label: 'Subscriptions', value: stats.subscriptions, icon: TrendingUp,  color: '#8b5cf6' },
  ] : [];

  const actions = [
    {
      id: 'webhook',
      label: 'Register Webhook',
      desc: 'Register Telegram bot webhook URL',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
      color: '#6366f1',
      fn: registerWebhook,
    },
    {
      id: 'commands',
      label: 'Set Bot Commands',
      desc: 'Update bot command menu',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="4 6 4 2 20 2 20 6"/><line x1="12" y1="2" x2="12" y2="22"/><polyline points="8 22 16 22"/></svg>,
      color: '#10b981',
      fn: setBotCommands,
    },
  ];

  return (
    <div className="p-4 min-h-full" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
      {/* Header */}
      <div
        className="rounded-2xl p-5 mb-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}
      >
        <div style={{
          position: 'absolute', top: -10, right: -10,
          width: 100, height: 100, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)',
        }} />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-white/60 text-sm mb-0.5">Super Admin</p>
            <h1 className="text-white text-xl font-bold">Dashboard</h1>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-3">
        <p className="section-title" style={{ margin: 0 }}>Platform Stats</p>
        <button
          onClick={loadStats}
          className="pressable"
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--tg-theme-bg-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--tg-theme-hint-color)' }} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl shimmer" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl p-4 animate-fade-up"
              style={{ background: 'var(--tg-theme-bg-color)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                style={{ background: `${color}15` }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <p className="section-title">Admin Actions</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {actions.map(({ id, label, desc, icon, color, fn }) => (
          <button
            key={id}
            onClick={fn}
            disabled={actionLoading === id}
            className="pressable"
            style={{
              width: '100%', textAlign: 'left',
              background: 'var(--tg-theme-bg-color)', borderRadius: 16,
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              border: 'none', cursor: 'pointer',
              opacity: actionLoading === id ? 0.7 : 1,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: `${color}12`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {actionLoading === id
                ? <RefreshCw size={18} style={{ color, animation: 'spin 0.8s linear infinite' }} />
                : icon
              }
            </div>
            <div className="flex-1">
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{label}</p>
              <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>{desc}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tg-theme-hint-color)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ))}
      </div>

      {/* Info */}
      <div style={{
        marginTop: 20, padding: '12px 16px', borderRadius: 14,
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Zap size={15} style={{ color: '#6366f1', flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', margin: 0, lineHeight: 1.4 }}>
          This dashboard is only visible to the platform owner.
        </p>
      </div>
    </div>
  );
}
