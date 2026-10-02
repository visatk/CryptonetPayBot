import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, ChevronRight, RefreshCw, Check, Key } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '../context/ApiContext';
import { useTelegramBackButton } from '../hooks/useTelegramTheme';

interface ChannelProduct {
  id: number;
  chatTitle: string;
  chatType: string;
  isActive: boolean;
}

interface Merchant {
  id: number;
  name: string;
  description?: string;
  apiKey: string;
  isActive: boolean;
  channelProducts: ChannelProduct[];
}

type View = 'list' | 'create' | 'detail' | 'addChannel' | 'addPlan';

export default function MerchantPage() {
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Merchant | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Add channel form
  const [chatId, setChatId] = useState('');
  const [chatTitle, setChatTitle] = useState('');
  const [chatType, setChatType] = useState<'channel' | 'group' | 'supergroup'>('channel');
  const [chatUser, setChatUser] = useState('');
  const [chanDesc, setChanDesc] = useState('');
  const [addingChan, setAddingChan] = useState(false);

  // Add plan form
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planDays, setPlanDays] = useState('');
  const [planMaxUsers, setPlanMaxUsers] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [addingPlan, setAddingPlan] = useState(false);

  useTelegramBackButton(() => {
    if (view !== 'list') { setView('list'); setSelected(null); }
    else navigate('/');
  });

  useEffect(() => { loadMerchants(); }, []);

  async function loadMerchants() {
    setLoading(true);
    try {
      const res = await apiFetch('/tma/merchants');
      const data = await res.json() as { merchants: Merchant[] };
      setMerchants(data.merchants || []);
    } finally {
      setLoading(false);
    }
  }

  async function createMerchant() {
    if (!name.trim()) { toast.error('Enter merchant name'); return; }
    setCreating(true);
    try {
      const res = await apiFetch('/tma/merchant/create', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: desc }),
      });
      const data = await res.json() as { merchant: Merchant; apiKey: string };
      if (!res.ok) { toast.error('Failed to create merchant'); return; }
      toast.success('Merchant created!');
      setMerchants(prev => [...prev, data.merchant]);
      setView('list');
      setName(''); setDesc('');
    } finally {
      setCreating(false);
    }
  }

  async function addChannel() {
    if (!chatId || !chatTitle) { toast.error('Fill in all fields'); return; }
    if (!selected) return;
    setAddingChan(true);
    try {
      const res = await apiFetch(`/tma/merchant/${selected.id}/channel`, {
        method: 'POST',
        body: JSON.stringify({
          telegramChatId: chatId, chatTitle, chatType,
          chatUsername: chatUser, description: chanDesc,
        }),
      });
      if (res.ok) {
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
    if (!planName || !planPrice || !planDays || !selectedProduct) {
      toast.error('Fill in all fields'); return;
    }
    setAddingPlan(true);
    try {
      const res = await apiFetch(`/tma/channel/${selectedProduct}/plan`, {
        method: 'POST',
        body: JSON.stringify({
          name: planName,
          priceUsd: parseFloat(planPrice),
          durationDays: parseInt(planDays),
          maxUsers: planMaxUsers ? parseInt(planMaxUsers) : undefined,
        }),
      });
      if (res.ok) {
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
    setCopiedKey(true);
    toast.success('API key copied!');
    setTimeout(() => setCopiedKey(false), 2000);
  }

  const inputCls = "w-full mt-1 bg-transparent outline-none text-sm font-medium py-1";

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
            className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'var(--tg-theme-button-color)' }}
          >
            {creating ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
            {creating ? 'Creating…' : 'Create Merchant'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Add channel form ─────────────────────────────────────────────────────
  if (view === 'addChannel' && selected) {
    return (
      <div className="p-4 min-h-full" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
        <h1 className="text-xl font-bold mb-5">Add Channel/Group</h1>
        <div className="space-y-3">
          {[
            { label: 'Chat ID (e.g. -1001234567890) *', value: chatId, set: setChatId, ph: '-1001234567890' },
            { label: 'Chat Title *', value: chatTitle, set: setChatTitle, ph: 'My Premium Channel' },
            { label: 'Username (without @)', value: chatUser, set: setChatUser, ph: 'mychannel' },
            { label: 'Description', value: chanDesc, set: setChanDesc, ph: 'What subscribers get…' },
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
                  className="flex-1 py-2 rounded-xl text-xs font-medium capitalize"
                  style={chatType === t
                    ? { background: 'var(--tg-theme-button-color)', color: 'white' }
                    : { background: 'var(--tg-theme-secondary-bg-color)' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={addChannel} disabled={addingChan}
            className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'var(--tg-theme-button-color)' }}
          >
            {addingChan ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
            {addingChan ? 'Adding…' : 'Add Channel'}
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
        <p className="text-sm mb-5" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Select channel and configure the plan
        </p>
        <div className="space-y-3">
          {/* Channel selector */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
            <label className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>Channel *</label>
            <div className="flex flex-col gap-1 mt-2">
              {selected.channelProducts.map(cp => (
                <button key={cp.id} onClick={() => setSelectedProduct(cp.id)}
                  className="text-left px-3 py-2 rounded-xl text-sm font-medium"
                  style={selectedProduct === cp.id
                    ? { background: 'var(--tg-theme-button-color)', color: 'white' }
                    : { background: 'var(--tg-theme-secondary-bg-color)' }}
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
            { label: 'Max Users (leave empty for unlimited)', value: planMaxUsers, set: setPlanMaxUsers, ph: '', type: 'number' },
          ].map(({ label, value, set, ph, type }) => (
            <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
              <label className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>{label}</label>
              <input type={type} className={inputCls} placeholder={ph} value={value} onChange={e => set(e.target.value)} />
            </div>
          ))}
          <button
            onClick={addPlan} disabled={addingPlan || !selectedProduct}
            className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'var(--tg-theme-button-color)' }}
          >
            {addingPlan ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
            {addingPlan ? 'Adding…' : 'Add Plan'}
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
          <div className="flex items-center gap-2 mb-1">
            <Key size={14} style={{ color: 'var(--tg-theme-hint-color)' }} />
            <p className="text-xs font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>API KEY</p>
          </div>
          <p className="font-mono text-xs break-all mb-2">{refreshed.apiKey}</p>
          <button onClick={() => copyApiKey(refreshed.apiKey)}
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: 'var(--tg-theme-button-color)' }}
          >
            {copiedKey ? <Check size={13} /> : <Copy size={13} />}
            {copiedKey ? 'Copied!' : 'Copy API Key'}
          </button>
        </div>

        {/* Channels */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tg-theme-hint-color)' }}>CHANNELS</h3>
          <button onClick={() => setView('addChannel')}
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: 'var(--tg-theme-button-color)' }}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {refreshed.channelProducts.length === 0 ? (
          <div className="rounded-2xl p-5 text-center mb-4" style={{ background: 'var(--tg-theme-bg-color)' }}>
            <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>No channels yet</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {refreshed.channelProducts.map(cp => (
              <div key={cp.id} className="rounded-2xl p-3 flex items-center justify-between"
                style={{ background: 'var(--tg-theme-bg-color)' }}>
                <div>
                  <p className="font-medium text-sm">{cp.chatTitle}</p>
                  <p className="text-xs capitalize" style={{ color: 'var(--tg-theme-hint-color)' }}>{cp.chatType}</p>
                </div>
                <button
                  onClick={() => { setSelectedProduct(cp.id); setView('addPlan'); }}
                  className="text-xs px-3 py-1.5 rounded-xl font-medium"
                  style={{ background: 'var(--tg-theme-secondary-bg-color)', color: 'var(--tg-theme-button-color)' }}
                >
                  + Plan
                </button>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setView('addPlan')}
          className="w-full py-3.5 rounded-2xl font-semibold text-white"
          style={{ background: 'var(--tg-theme-button-color)' }}
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
        <button onClick={loadMerchants} className="p-2 rounded-full" style={{ background: 'var(--tg-theme-bg-color)' }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--tg-theme-hint-color)' }} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 rounded-2xl shimmer" />)}</div>
      ) : merchants.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--tg-theme-bg-color)' }}>
          <p className="text-4xl mb-3">🏪</p>
          <p className="font-semibold">No merchants yet</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--tg-theme-hint-color)' }}>
            Create a merchant account to accept payments
          </p>
          <button onClick={() => setView('create')}
            className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-white"
            style={{ background: 'var(--tg-theme-button-color)' }}
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
                className="w-full text-left rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'var(--tg-theme-bg-color)' }}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <span className="text-xl">🏪</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                    {m.channelProducts.length} channel{m.channelProducts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--tg-theme-hint-color)' }} />
              </button>
            ))}
          </div>
          <button onClick={() => setView('create')}
            className="w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2"
            style={{ background: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-button-color)' }}
          >
            <Plus size={18} /> New Merchant
          </button>
        </>
      )}
    </div>
  );
}
