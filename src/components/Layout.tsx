import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '../context/ApiContext';
import { haptic } from '../hooks/useTelegramTheme';

// ── SVG Icon components (professional, no emoji) ──────────────────────────────
function IconHome({ active }: { active: boolean }) {
  const w = active ? 2.2 : 1.7;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IconWallet({ active }: { active: boolean }) {
  const w = active ? 2.2 : 1.7;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}
function IconInvoice({ active }: { active: boolean }) {
  const w = active ? 2.2 : 1.7;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconChannels({ active }: { active: boolean }) {
  const w = active ? 2.2 : 1.7;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function IconMerchant({ active }: { active: boolean }) {
  const w = active ? 2.2 : 1.7;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <rect x="9" y="12" width="6" height="10" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  );
}
function IconAdmin({ active }: { active: boolean }) {
  const w = active ? 2.2 : 1.7;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const NAV = [
  { to: '/',         IconComp: IconHome,     label: 'Home'     },
  { to: '/wallet',   IconComp: IconWallet,   label: 'Wallet'   },
  { to: '/invoices', IconComp: IconInvoice,  label: 'Invoices' },
  { to: '/channels', IconComp: IconChannels, label: 'Channels' },
  { to: '/merchant', IconComp: IconMerchant, label: 'Merchant' },
];

export default function Layout() {
  const { pathname } = useLocation();
  const { isOwner } = useApi();
  const navigate = useNavigate();

  // No nav on pay/* pages
  if (pathname.startsWith('/pay/')) return <Outlet />;

  function navTo(to: string) {
    haptic.select();
    navigate(to);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Page content */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 72 }}>
        <Outlet />
      </main>

      {/* Bottom tab bar — uses <button> so mobile long-press never shows URL */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: 'var(--tg-theme-bg-color)',
          borderTop: '1px solid var(--tg-theme-section-separator-color)',
          display: 'flex',
          alignItems: 'stretch',
          paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
          paddingTop: 6,
          zIndex: 100,
        }}
      >
        {NAV.map(({ to, IconComp, label }) => {
          const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
          return (
            <button
              key={to}
              onClick={() => navTo(to)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '4px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-hint-color)',
                transition: 'color 0.15s ease',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 28,
                  borderRadius: 10,
                  background: isActive
                    ? 'color-mix(in srgb, var(--tg-theme-button-color) 12%, transparent)'
                    : 'transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                <IconComp active={isActive} />
              </span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500, lineHeight: 1 }}>
                {label}
              </span>
            </button>
          );
        })}

        {isOwner && (() => {
          const isActive = pathname === '/admin';
          return (
            <button
              onClick={() => navTo('/admin')}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '4px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? '#ef4444' : 'var(--tg-theme-hint-color)',
                transition: 'color 0.15s ease',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 28,
                  borderRadius: 10,
                  background: isActive ? 'rgba(239,68,68,0.12)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                <IconAdmin active={isActive} />
              </span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500, lineHeight: 1 }}>
                Admin
              </span>
            </button>
          );
        })()}
      </nav>
    </div>
  );
}
