import { useEffect, useRef } from 'react';

// ── Theme sync ──────────────────────────────────────────────────────────────
export function useTelegramTheme() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    function applyTheme() {
      const t = tg.themeParams;
      const r = document.documentElement;
      const set = (k: string, v?: string) => v && r.style.setProperty(k, v);

      set('--tg-theme-bg-color',               t.bg_color);
      set('--tg-theme-text-color',             t.text_color);
      set('--tg-theme-hint-color',             t.hint_color);
      set('--tg-theme-link-color',             t.link_color);
      set('--tg-theme-button-color',           t.button_color);
      set('--tg-theme-button-text-color',      t.button_text_color);
      set('--tg-theme-secondary-bg-color',     t.secondary_bg_color);
      set('--tg-theme-header-bg-color',        t.header_bg_color);
      set('--tg-theme-accent-text-color',      t.accent_text_color);
      set('--tg-theme-destructive-text-color', t.destructive_text_color);
      set('--tg-theme-subtitle-text-color',    t.subtitle_text_color);
      set('--tg-theme-section-bg-color',       t.section_bg_color);
      set('--tg-theme-section-separator-color',t.section_separator_color);

      // Body background
      document.body.style.backgroundColor = t.secondary_bg_color || '#efeff3';
    }

    applyTheme();
    tg.ready();
    tg.expand();
    tg.onEvent('themeChanged', applyTheme);
    return () => tg.offEvent('themeChanged', applyTheme);
  }, []);
}

// ── Back button ──────────────────────────────────────────────────────────────
export function useTelegramBackButton(onBack?: () => void) {
  const cbRef = useRef(onBack);
  cbRef.current = onBack;

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg || !onBack) return;

    const handler = () => cbRef.current?.();
    tg.BackButton.show();
    tg.BackButton.onClick(handler);
    return () => {
      tg.BackButton.offClick(handler);
      tg.BackButton.hide();
    };
  }, [!!onBack]);  // only re-run when presence changes, not fn identity
}

// ── Main button ──────────────────────────────────────────────────────────────
export function useTelegramMainButton(
  label: string,
  onClick: () => void,
  options: { enabled?: boolean; loading?: boolean; color?: string } = {}
) {
  const { enabled = true, loading = false, color } = options;
  const cbRef = useRef(onClick);
  cbRef.current = onClick;

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const btn = tg.MainButton;
    btn.setText(label);
    if (color) btn.setParams({ color });
    if (loading) {
      btn.showProgress(false);
    } else if (enabled) {
      btn.enable();
      btn.hideProgress();
      btn.show();
    } else {
      btn.disable();
      btn.show();
    }

    const handler = () => cbRef.current();
    btn.onClick(handler);
    return () => {
      btn.offClick(handler);
      btn.hideProgress();
      btn.hide();
    };
  }, [label, enabled, loading, color]);
}

// ── Haptic ──────────────────────────────────────────────────────────────────
export const haptic = {
  impact:  (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') =>
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style),
  success: () =>
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success'),
  error:   () =>
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error'),
  warning: () =>
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning'),
  select:  () =>
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged(),
};

// ── Popup / Alert ────────────────────────────────────────────────────────────
export function showTelegramAlert(message: string): Promise<void> {
  return new Promise(resolve => {
    const tg = window.Telegram?.WebApp;
    if (tg) { tg.showAlert(message, resolve); }
    else { alert(message); resolve(); }
  });
}

export function showTelegramConfirm(message: string): Promise<boolean> {
  return new Promise(resolve => {
    const tg = window.Telegram?.WebApp;
    if (tg) { tg.showConfirm(message, resolve); }
    else { resolve(confirm(message)); }
  });
}
