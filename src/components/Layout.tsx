import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Wallet, FileText, Tv2, Store, ShieldCheck } from 'lucide-react';
import { useApi } from '../context/ApiContext';

const NAV = [
  { to: '/',            icon: Home,        label: 'Home'    },
  { to: '/wallet',      icon: Wallet,      label: 'Wallet'  },
  { to: '/invoice',     icon: FileText,    label: 'Pay'     },
  { to: '/channels',    icon: Tv2,         label: 'Channels'},
  { to: '/merchant',    icon: Store,       label: 'Merchant'},
];

export default function Layout() {
  const { pathname } = useLocation();
  const { isOwner } = useApi();

  // No nav on pay/* pages
  if (pathname.startsWith('/pay/')) return <Outlet />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Page content */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 72 }}>
        <Outlet />
      </main>

      {/* Bottom tab bar */}
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
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '4px 0',
              textDecoration: 'none',
              color: isActive
                ? 'var(--tg-theme-button-color)'
                : 'var(--tg-theme-hint-color)',
              transition: 'color 0.15s ease',
            })}
          >
            {({ isActive }) => (
              <>
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
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.7}
                  />
                </span>
                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500, lineHeight: 1 }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {isOwner && (
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '4px 0',
              textDecoration: 'none',
              color: isActive ? '#ef4444' : 'var(--tg-theme-hint-color)',
              transition: 'color 0.15s ease',
            })}
          >
            {({ isActive }) => (
              <>
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
                  <ShieldCheck size={20} strokeWidth={isActive ? 2.2 : 1.7} />
                </span>
                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500, lineHeight: 1 }}>
                  Admin
                </span>
              </>
            )}
          </NavLink>
        )}
      </nav>
    </div>
  );
}
