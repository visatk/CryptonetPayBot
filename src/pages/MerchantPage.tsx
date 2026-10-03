import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, ChevronRight, RefreshCw, Check, Key, Users, Share2, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '../context/ApiContext';
import { useTelegramBackButton, haptic } from '../hooks/useTelegramTheme';

interface SubscriptionPlan {
  id: number;
  name: string;
  priceUsd: number;
  durationDays: number;
  isActive: boolean;
}

interface ChannelProduct {
  id: number;
  chatTitle: string;
  chatType: string;
  chatUsername?: string;
  description?: string;
  isActive: boolean;
  subscriptionPlans?: SubscriptionPlan[];
}

interface Merchant {
  id: number;
  name: string;
  description?: string;
  apiKey: string;
  isActive: boolean;
  channelProducts: ChannelProduct[];
}

interface Subscriber {
  id: number;
  status: 'active' | 'expired' | 'revoked';
  expiresAt: string;
  user: { id: number; firstName: string; username?: string };
  subscriptionPlan: { name: string; priceUsd: number };
}

type View = 'list' | 'create' | 'detail' | 'addChannel' | 'addPlan' | 'subscribers';

export default function MerchantPage() {
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [merchants, setMerchants]  = useState<Merchant[]>([]);
  const [loading, setLoading]      = useState(true);
  const [view, setView]            = useState<View>('list');
  const [selected, setSelected]    = useState<Merchant | null>(null);
  const [copiedKey, setCopiedKey]  = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ChannelProduct | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Create form state
  const [name, setName]   = useState('');
  const [desc, setDesc]   = useState('');
  const [creating, setCreating] = useState(false);

  // Add channel form
  const [chatId, setChatId]     = useState('');
  const [chatTitle, setChatTitle] = useState('');
  const [chatType, setChatType]  = useState<'channel' | 'group' | 'supergroup'>('channel');
  const [chatUser, setChatUser]  = useState('');
  const [chanDesc, setChanDesc]  = useState('');
  const [addingChan, setAddingChan] = useState(false);

  // Add plan form
  const [planName, setPlanName]       = useState('');
  const [planPrice, setPlanPrice]     = useState('');
  const [planDays, setPlanDays]       = useState('');
  const [planMaxUsers, setPlanMaxUsers] = useState('');
  const [planProductId, setPlanProductId] = useState<number | null>(null);
  const [addingPlan, setAddingPlan]   = useState(false);

  useTelegramBackButton(() => {
    if (view === 'subscribers')  { setView('detail'); setSubscribers([]); }
    else if (view !== 'list')    { setView('list'); setSelected(null); }
    else navigate('/');
  });

  useEffect(() => { loadMerchants(); }, []);

  async function loadMerchants() {
    setLoading(true);
    try {
      const res  = await apiFetch('/tma/merchants');
      const data = await res.json() as { merchants: Merchant[] };
      setMerchants(data.merchants || []);
    } finally {
      setLoading(false);
    }
  }

  async function createMerchant() {
    if (!name.trim()) { toast.error('Enter merchant name'); return; }
    setCreating(true);
    haptic.impact('medium');
    try {
      const res  = await apiFetch('/tma/merchant/create', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: desc }),
      });
      const data = await res.json() as { merchant: Merchant; apiKey: string };
      if (!res.ok) { toast.error('Failed to create merchant'); return; }
      haptic.success();
      toast.success('Merchant created!');
      setMerchants(prev => [...prev, data.merchant]);
      setView('list');
      setName(''); setDesc('');
    } finally {
      setCreating(false);
    }
  }

  async function addChannel() {
    if (!chatId || !chatTitle) { toast.error('Fill in all required fields'); return; }
    if (!selected) return;
    setAddingChan(true);
    haptic.impact('medium');
    try {
      const res = await apiFetch(`/tma/merchant/${selected.id}/channel`, {
        method: 'POST',
        body: JSON.stringify({ telegramChatId: chatId, chatTitle, chatType, chatUsername: chatUser, description: chanDesc }),
      });
      if (res.ok) {
        haptic.success();
        toast.success('Channel added!');
        await loadMerchants();
        setView('detail');
        setChatId(''); setChatTitle(''); setChatUser(''); setChanDesc('');
      } else {
        toast.error('Failed to add channel');
      }
    } finally {
      setAddingChan(false);
    }
  }

  async function addPlan() {
    if (!planName || !planPrice || !planDays || !planProductId) {
      toast.error('Fill in all required fields'); return;
    }
    setAddingPlan(true);
    haptic.impact('medium');
    try {
      const res = await apiFetch(`/tma/channel/${planProductId}/plan`, {
        method: 'POST',
        body: JSON.stringify({
          name: planName,
          priceUsd: parseFloat(planPrice),
          durationDays: parseInt(planDays),
          maxUsers: planMaxUsers ? parseInt(planMaxUsers) : undefined,
        }),
      });
      if (res.ok) {
        haptic.success();
        toast.success('Plan added!');
        await loadMerchants();
        setView('detail');
        setPlanName(''); setPlanPrice(''); setPlanDays(''); setPlanMaxUsers('');
      } else {
        toast.error('Failed to add plan');
      }
    } finally {
      setAddingPlan(false);
    }
  }

  async function copyApiKey(key: string) {
    await navigator.clipboard.writeText(key);
    haptic.select();
    setCopiedKey(true);
    toast.success('API key copied!');
    setTimeout(() => setCopiedKey(false), 2000);
  }

  async function shareChannelLink(productId: number) {
    haptic.impact('light');
    try {
      const res  = await apiFetch(`/tma/channel/${productId}/share`);
      const data = await res.json() as { deepLink: string };
      if (data.deepLink) {
        const tg = window.Telegram?.WebApp;
        if (tg?.openTelegramLink) {
          tg.openTelegramLink(
            `https://t.me/share/url?url=${encodeURIComponent(data.deepLink)}&text=${encodeURIComponent('Subscribe to this premium channel/group')}`
          );
        } else {
          await navigator.clipboard.writeText(data.deepLink);
          toast.success('Share link copied!');
        }
      }
    } catch {
      toast.error('Failed to get share link');
    }
  }

  async function loadSubscribers(productId: number) {
    setLoadingSubs(true);
    setSubscribers([]);
    try {
      const res  = await apiFetch(`/tma/channel/${productId}/subscribers`);
      const data = await res.json() as { subscribers: Subscriber[] };
      setSubscribers(data.subscribers ?? []);
    } finally {
      setLoadingSubs(false);
    }
  }

  async function revokeSubscription(subId: number) {
    haptic.impact('heavy');
    try {
      const res = await apiFetch(`/tma/subscription/${subId}/revoke`, { method: 'POST' });
      if (res.ok) {
        haptic.success();
        toast.success('Subscription revoked');
        setSubscribers(prev => prev.map(s => s.id === subId ? { ...s, status: 'revoked' as const } : s));
      } else {
        toast.error('Failed to revoke');
      }
    } catch {
      toast.error('Failed to revoke');
    }
  }

  const inputCls = "w-full mt-1 bg-transparent outline-none text-sm font-medium py-1";

  // ─── Subscriber view ──────────────────────────────────────────────────────
  if (view === 'subscribers' && selectedProduct) {
    return (
      <div className="p-4 min-h-full" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
        <h1 className="text-xl font-bold mb-1">{selectedProduct.chatTitle}</h1>
        <p className="text-sm mb-4" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Subscribers
        </p>

        {loadingSubs ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl shimmer" />)}
          </div>
        ) : subscribers.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--tg-theme-bg-color)' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(99,102,241,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <Users size={24} style={{ color: '#6366f1' }} />
            </div>
            <p className="font-semibold text-sm">No subscribers yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Share the channel link to get subscribers
            </p>
            <button
              onClick={() => shareChannelLink(selectedProduct.id)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl pressable"
              style={{ background: 'var(--tg-theme-button-color)', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              <Share2 size={13} /> Share Link
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {subscribers.map(sub => {
              const isActive = sub.status === 'active';
              const expires  = new Date(sub.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <div key={sub.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'var(--tg-theme-bg-color)' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Users size={17} style={{ color: isActive ? '#10b981' : '#9ca3af' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {sub.user.firstName}{sub.user.username ? ` @${sub.user.username}` : ''}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                      {sub.subscriptionPlan.name} • {isActive ? `until ${expires}` : sub.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge" style={{
                      background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                      color: isActive ? '#059669' : '#6b7280',
                      flexShrink: 0,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                      {sub.status}
                    </span>
                    {isActive && (
                      <button
                        onClick={() => revokeSubscription(sub.id)}
                        className="pressable"
                        style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: 'rgba(239,68,68,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: 'none', cursor: 'pointer',
                        }}
                        title="Revoke access"
                      >
                        <Trash2 size={13} color="#ef4444" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Create merchant form ─────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="p-4 min-h-full" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
        <h1 className="text-xl font-bold mb-1">Create Merchant</h1>
        <p className="text-sm mb-5" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Set up your merchant account to sell subscriptions
        </p>
        <div className="space-y-3">
          <div className="rounded-2xl p-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
            <label className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Business Name *</label>
            <input className={inputCls} placeholder="My Store" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
            <label className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Description</label>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="About your store…" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <button
            onClick={createMerchant} disabled={creating || !name}
            className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 pressable"
            style={{ background: 'var(--tg-theme-button-color)', border: 'none', cursor: 'pointer' }}
          >
            {creating ? <><RefreshCw size={18} className="animate-spin" /> Creating…</> : <><Plus size={18} /> Create Merchant</>}
          </button>
        </div>
      </div>
    );
  }

  // ─── Add channel form ─────────────────────────────────────────────────────
  if (view === 'addChannel' && selected) {
    return (
      <div className="p-4 min-h-full" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
        <h1 className="text-xl font-bold mb-1">Add Channel/Group</h1>
        <p className="text-sm mb-5" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Make sure the bot is an admin of the chat
        </p>
        <div className="space-y-3">
          {[
            { label: 'Chat ID (e.g. -1001234567890) *', value: chatId,    set: setChatId,    ph: '-1001234567890'    },
            { label: 'Chat Title *',                     value: chatTitle, set: setChatTitle, ph: 'My Premium Channel' },
            { label: 'Username (without @)',              value: chatUser,  set: setChatUser,  ph: 'mychannel'         },
            { label: 'Description',                      value: chanDesc,  set: setChanDesc,  ph: 'What subscribers get…' },
          ].map(({ label, value, set, ph }) => (
            <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
              <label className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>{label}</label>
              <input className={inputCls} placeholder={ph} value={value} onChange={e => set(e.target.value)} />
            </div>
          ))}
          <div className="rounded-2xl p-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
            <label className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Type</label>
            <div className="flex gap-2 mt-2">
              {(['channel', 'group', 'supergroup'] as const).map(t => (
                <button key={t} onClick={() => setChatType(t)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium capitalize pressable"
                  style={chatType === t
                    ? { background: 'var(--tg-theme-button-color)', color: 'white', border: 'none', cursor: 'pointer' }
                    : { background: 'var(--tg-theme-secondary-bg-color)', border: 'none', cursor: 'pointer' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={addChannel} disabled={addingChan}
            className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 pressable"
            style={{ background: 'var(--tg-theme-button-color)', border: 'none', cursor: 'pointer' }}
          >
            {addingChan ? <><RefreshCw size={18} className="animate-spin" /> Adding…</> : <><Plus size={18} /> Add Channel</>}
          </button>
        </div>
      </div>
    );
  }

  // ─── Add plan form ────────────────────────────────────────────────────────
  if (view === 'addPlan' && selected) {
    return (
      <div className="p-4 min-h-full" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
        <h1 className="text-xl font-bold mb-2">Add Subscription Plan</h1>
        <p className="text-sm mb-5" style={{ color: 'var(--tg-theme-hint-color)' }}>Select channel and configure the plan</p>
        <div className="space-y-3">
          {/* Channel selector */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
            <label className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Channel *</label>
            <div className="flex flex-col gap-1 mt-2">
              {selected.channelProducts.map(cp => (
                <button key={cp.id} onClick={() => setPlanProductId(cp.id)}
                  className="text-left px-3 py-2.5 rounded-xl text-sm font-medium pressable"
                  style={planProductId === cp.id
                    ? { background: 'var(--tg-theme-button-color)', color: 'white', border: 'none', cursor: 'pointer' }
                    : { background: 'var(--tg-theme-secondary-bg-color)', border: 'none', cursor: 'pointer' }}
                >
                  {cp.chatTitle}
                </button>
              ))}
            </div>
          </div>
          {[
            { label: 'Plan Name *', value: planName, set: setPlanName, ph: 'Monthly', type: 'text' },
            { label: 'Price (USD) *', value: planPrice, set: setPlanPrice, ph: '9.99', type: 'number' },
            { label: 'Duration (days) *', value: planDays, set: setPlanDays, ph: '30', type: 'number' },
            { label: 'Max Users (unlimited if empty)', value: planMaxUsers, set: setPlanMaxUsers, ph: '', type: 'number' },
          ].map(({ label, value, set, ph, type }) => (
            <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
              <label className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>{label}</label>
              <input type={type} className={inputCls} placeholder={ph} value={value} onChange={e => set(e.target.value)} />
            </div>
          ))}
          <button
            onClick={addPlan} disabled={addingPlan || !planProductId}
            className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 pressable"
            style={{ background: 'var(--tg-theme-button-color)', border: 'none', cursor: 'pointer' }}
          >
            {addingPlan ? <><RefreshCw size={18} className="animate-spin" /> Adding…</> : <><Plus size={18} /> Add Plan</>}
          </button>
        </div>
      </div>
    );
  }

  // ─── Merchant detail ──────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    const refreshed = merchants.find(m => m.id === selected.id) || selected;
    return (
      <div className="p-4 min-h-full" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
        <h1 className="text-xl font-bold mb-4">{refreshed.name}</h1>

        {/* API Key */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Key size={14} style={{ color: 'var(--tg-theme-hint-color)' }} />
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tg-theme-hint-color)' }}>API Key</p>
          </div>
          <p className="font-mono text-xs break-all mb-2" style={{ opacity: 0.7 }}>{refreshed.apiKey}</p>
          <button onClick={() => copyApiKey(refreshed.apiKey)}
            className="flex items-center gap-1.5 text-xs font-semibold pressable"
            style={{ color: 'var(--tg-theme-button-color)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {copiedKey ? <Check size={13} /> : <Copy size={13} />}
            {copiedKey ? 'Copied!' : 'Copy API Key'}
          </button>
        </div>

        {/* API Docs quick link */}
        <div className="rounded-2xl p-3 mb-4 flex items-center gap-3" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <ExternalLink size={14} style={{ color: '#6366f1', flexShrink: 0 }} />
          <p className="text-xs flex-1" style={{ color: '#6366f1' }}>
            Use your API key to create invoices via the Merchant REST API
          </p>
        </div>

        {/* Channels */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tg-theme-hint-color)' }}>Channels & Groups</h3>
          <button onClick={() => setView('addChannel')}
            className="text-xs font-semibold flex items-center gap-1 pressable"
            style={{ color: 'var(--tg-theme-button-color)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {refreshed.channelProducts.length === 0 ? (
          <div className="rounded-2xl p-5 text-center mb-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
            <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>No channels yet. Add one to start selling subscriptions.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {refreshed.channelProducts.map(cp => (
              <div key={cp.id} className="rounded-2xl p-3" style={{ background: 'var(--tg-theme-bg-color)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: cp.chatType === 'channel' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {cp.chatType === 'channel'
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.13 12 19.8 19.8 0 0 1 1.06 3.33A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 21 16.92z"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{cp.chatTitle}</p>
                      <p className="text-xs capitalize" style={{ color: 'var(--tg-theme-hint-color)' }}>{cp.chatType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => shareChannelLink(cp.id)}
                      className="pressable"
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(99,102,241,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer',
                      }}
                      title="Share channel link"
                    >
                      <Share2 size={13} color="#6366f1" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(cp);
                        setView('subscribers');
                        loadSubscribers(cp.id);
                      }}
                      className="pressable"
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(16,185,129,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer',
                      }}
                      title="View subscribers"
                    >
                      <Users size={13} color="#10b981" />
                    </button>
                    <button
                      onClick={() => { setPlanProductId(cp.id); setView('addPlan'); }}
                      className="pressable"
                      style={{
                        padding: '5px 10px', borderRadius: 8,
                        background: 'var(--tg-theme-secondary-bg-color)',
                        color: 'var(--tg-theme-button-color)',
                        fontSize: 12, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      + Plan
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setView('addPlan')}
          className="w-full py-3.5 rounded-2xl font-semibold text-white pressable"
          style={{ background: 'var(--tg-theme-button-color)', border: 'none', cursor: 'pointer' }}
        >
          + Add Subscription Plan
        </button>
      </div>
    );
  }

  // ─── Merchant list ────────────────────────────────────────────────────────
  return (
    <div className="p-4 min-h-full" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Merchant</h1>
          <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Manage your stores & channels</p>
        </div>
        <button onClick={loadMerchants} className="p-2 rounded-full pressable" style={{ background: 'var(--tg-theme-bg-color)', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--tg-theme-hint-color)' }} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 rounded-2xl shimmer" />)}</div>
      ) : merchants.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--tg-theme-bg-color)' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(139,92,246,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.8">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <p className="font-semibold">No merchants yet</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--tg-theme-hint-color)' }}>
            Create a merchant account to accept payments and sell subscriptions
          </p>
          <button onClick={() => setView('create')}
            className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-white pressable"
            style={{ background: 'var(--tg-theme-button-color)', border: 'none', cursor: 'pointer' }}
          >
            Create Merchant
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {merchants.map(m => (
              <button key={m.id}
                onClick={() => { setSelected(m); setView('detail'); }}
                className="w-full text-left rounded-2xl p-4 flex items-center gap-3 pressable"
                style={{ background: 'var(--tg-theme-bg-color)', border: 'none', cursor: 'pointer' }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                  background: 'rgba(139,92,246,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.8">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{m.name}</p>
                  <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                    {m.channelProducts.length} channel{m.channelProducts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--tg-theme-hint-color)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
          <button onClick={() => setView('create')}
            className="w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 pressable"
            style={{ background: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-button-color)', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={18} /> New Merchant
          </button>
        </>
      )}
    </div>
  );
}
