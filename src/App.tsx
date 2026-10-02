import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useTelegramTheme } from './hooks/useTelegramTheme';
import { ApiProvider } from './context/ApiContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import WalletPage from './pages/WalletPage';
import InvoicePage from './pages/InvoicePage';
import ChannelsPage from './pages/ChannelsPage';
import MerchantPage from './pages/MerchantPage';
import AdminPage from './pages/AdminPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import PaymentLinkPage from './pages/PaymentLinkPage';

export default function App() {
  useTelegramTheme();

  return (
    <ApiProvider>
      <Toaster
        position="top-center"
        gap={8}
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--tg-theme-bg-color)',
            color: 'var(--tg-theme-text-color)',
            border: '1px solid var(--tg-theme-section-separator-color)',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          },
        }}
      />
      <Routes>
        <Route element={<Layout />}>
          <Route index          element={<HomePage />} />
          <Route path="wallet"        element={<WalletPage />} />
          <Route path="invoice"       element={<CreateInvoicePage />} />
          <Route path="invoices"      element={<InvoicePage />} />
          <Route path="channels"      element={<ChannelsPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="merchant"      element={<MerchantPage />} />
          <Route path="admin"         element={<AdminPage />} />
        </Route>
        <Route path="pay/:slug" element={<PaymentLinkPage />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </ApiProvider>
  );
}
