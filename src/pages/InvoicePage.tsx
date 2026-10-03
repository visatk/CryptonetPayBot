import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ExternalLink, Plus } from 'lucide-react';
import { useApi } from '../context/ApiContext';
import { useTelegramBackButton, haptic } from '../hooks/useTelegramTheme';
import CryptoIcon, { getCryptoBg } from '../components/CryptoIcon';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:   { label: 'Pending',   color: '#6b7280', bg: 'rgba(107,114,128,0.1)', dot: '#6b7280' },
  created:   { label: 'Awaiting',  color: '#d97706', bg: 'rgba(217,119,6,0.1)',   dot: '#f59e0b' },
  paid:      { label: 'Paid',      color: '#059669', bg: 'rgba(5,150,105,0.1)',   dot: '#10b981' },
  partpaid:  { label: 'Part Paid', color: '#d97706', bg: 'rgba(217,119,6,0.1)',   dot: '#f59e0b' },
  overpaid:  { label: 'Overpaid',  color: '#4f46e5', bg: 'rgba(79,70,229,0.1)',   dot: '#6366f1' },
  completed: { label: 'Completed', color: '#059669', bg: 'rgba(5,150,105,0.1)',   dot: '#10b981' },
  expired:   { label: 'Expired',   color: '#dc2626', bg: 'rgba(220,38,38,0.1)',   dot: '#ef4444' },
  failed:    { label: 'Failed',    color: '#dc2626', bg: 'rgba(220,38,38,0.1)',   dot: '#ef4444' },
};

interface Invoice {
  id: number;
  invoiceRef: string;
  type: string;
  currency: string;
  amountCrypto: string;
  amountUsd: number;
  status: string;
  apironeInvoiceUrl: string | null;
  createdAt: string;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function InvoiceCard({ inv }: { inv: Invoice }) {
  const sc    = STATUS[inv.status] ?? STATUS.pending;
  const color = getCryptoBg(inv.currency);

  return (
    <div
      style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 16, padding: '14px 16px' }}
      className="animate-fade-up"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CryptoIcon currency={inv.currency} size={38} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {inv.invoiceRef}
            </p>
            <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
              {formatDate(inv.createdAt)}
            </p>
          </div>
        </div>
        <span
          className="badge"
          style={{ background: sc.bg, color: sc.color, flexShrink: 0 }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
          {sc.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
            ${inv.amountUsd.toFixed(2)}
          </p>
          <p style={{ fontSize: 11, color, margin: '2px 0 0', fontWeight: 600 }}>
            {inv.amountCrypto} {inv.currency.toUpperCase()}
          </p>
        </div>
        {inv.apironeInvoiceUrl && (
          <a
            href={inv.apironeInvoiceUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => haptic.impact('light')}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'var(--tg-theme-secondary-bg-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
            }}
            className="pressable"
          >
            <ExternalLink size={15} color="var(--tg-theme-button-color)" />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function InvoicePage() {
  const { apiFetch } = useApi();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useTelegramBackButton(() => navigate('/'));

  const loadInvoices = useCallback(async (p: number) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res  = await apiFetch(`/tma/invoices?page=${p}`);
      const data = await res.json() as { items: Invoice[]; hasMore: boolean };
      if (p === 1) setInvoices(data.items);
      else setInvoices(prev => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setPage(p);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadInvoices(1); }, [loadInvoices]);

  return (
    <div style={{ padding: 16, minHeight: '100%', background: 'var(--tg-theme-secondary-bg-color)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Invoices</h1>
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '2px 0 0' }}>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { haptic.impact('light'); navigate('/invoice'); }}
            className="pressable"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 10,
              background: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
              fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={14} /> New
          </button>
          <button
            onClick={() => loadInvoices(1)}
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
              size={16} color="var(--tg-theme-hint-color)"
              style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="shimmer" style={{ height: 96 }} />)}
        </div>
      ) : invoices.length === 0 ? (
        <div style={{ background: 'var(--tg-theme-bg-color)', borderRadius: 18, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'rgba(16,185,129,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.7">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>No invoices yet</p>
          <p style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', margin: '0 0 20px', lineHeight: 1.5 }}>
            Create your first invoice to start accepting crypto payments
          </p>
          <button
            onClick={() => { haptic.impact('medium'); navigate('/invoice'); }}
            className="pressable"
            style={{
              padding: '12px 24px', borderRadius: 12,
              background: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
              fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}
          >
            Create Invoice
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {invoices.map(inv => <InvoiceCard key={inv.id} inv={inv} />)}

          {hasMore && (
            <button
              onClick={() => loadInvoices(page + 1)}
              disabled={loadingMore}
              className="pressable"
              style={{
                width: '100%', padding: '13px', borderRadius: 14,
                background: 'var(--tg-theme-bg-color)',
                color: 'var(--tg-theme-button-color)',
                fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                border: 'none', cursor: 'pointer',
              }}
            >
              {loadingMore
                ? <><RefreshCw size={15} className="animate-spin-slow" /> Loading…</>
                : 'Load More'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
