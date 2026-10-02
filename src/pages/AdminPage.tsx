import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ShoppingBag, FileText, RefreshCw, TrendingUp } from 'lucide-react';
import { useApi } from '../context/ApiContext';
import { useTelegramBackButton } from '../hooks/useTelegramTheme';

interface Stats {
  users: number;
  merchants: number;
  invoices: number;
  subscriptions: number;
}

export default function AdminPage() {
  const { isOwner, apiFetch } = useApi();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useTelegramBackButton(() => navigate('/'));

  useEffect(() => {
    if (!isOwner) { navigate('/'); return; }
    loadStats();
  }, [isOwner]);

  async function loadStats() {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/stats');
      if (res.ok) setStats(await res.json() as Stats);
    } finally {
      setLoading(false);
    }
  }

  if (!isOwner) return null;

  const statCards = stats ? [
    { label: 'Total Users',    value: stats.users,         icon: Users,        color: '#6366f1' },
    { label: 'Merchants',      value: stats.merchants,     icon: ShoppingBag,  color: '#f59e0b' },
    { label: 'Invoices',       value: stats.invoices,      icon: FileText,     color: '#10b981' },
    { label: 'Subscriptions',  value: stats.subscriptions, icon: TrendingUp,   color: '#8b5cf6' },
  ] : [];

  return (
    <div className="p-4 min-h-full" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
      {/* Header */}
      <div
        className="rounded-2xl p-5 mb-5"
        style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm">Super Admin</p>
            <h1 className="text-white text-xl font-bold">Dashboard</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-xl">⚡</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--tg-theme-hint-color)' }}>PLATFORM STATS</h2>
        <button onClick={loadStats} className="p-1.5 rounded-full" style={{ background: 'var(--tg-theme-bg-color)' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--tg-theme-hint-color)' }} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl shimmer" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                style={{ background: `${color}15` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick admin actions */}
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--tg-theme-hint-color)' }}>ACTIONS</h2>
      <div className="rounded-2xl overflow-hidden divide-y" style={{ background: 'var(--tg-theme-bg-color)' }}>
        {[
          { label: 'Register Webhook', action: () => registerWebhook() },
          { label: 'Set Bot Commands', action: () => setBotCommands() },
        ].map(({ label, action }) => (
          <button key={label} onClick={action}
            className="w-full text-left px-4 py-3.5 flex items-center justify-between text-sm font-medium"
          >
            {label}
            <span style={{ color: 'var(--tg-theme-button-color)' }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );

  async function registerWebhook() {
    const res = await fetch('/webhook/register', { method: 'POST' });
    const data = await res.json() as { ok: boolean };
    alert(data.ok ? '✅ Webhook registered!' : '❌ Failed');
  }

  async function setBotCommands() {
    const res = await fetch('/webhook/commands', { method: 'POST' });
    const data = await res.json() as { ok: boolean };
    alert(data.ok ? '✅ Commands set!' : '❌ Failed');
  }
}
