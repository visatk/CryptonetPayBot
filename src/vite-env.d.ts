/// <reference types="vite/client" />

interface Window {
  Telegram?: {
    WebApp: {
      initData: string;
      initDataUnsafe: any;
      backgroundColor: string;
      colorScheme: string;
      safeAreaInset: { top: number; bottom: number; left: number; right: number };
      contentSafeAreaInset: { top: number; bottom: number; left: number; right: number };
      isClosingConfirmationEnabled: boolean;
      
      ready: () => void;
      expand: () => void;
      requestFullscreen: () => void;
      disableVerticalSwipes: () => void;
      enableClosingConfirmation: () => void;
      setHeaderColor: (color: string) => void;
      setBottomBarColor: (color: string) => void;
      onEvent: (eventType: string, eventHandler: () => void) => void;
      offEvent: (eventType: string, eventHandler: () => void) => void;
      openTelegramLink: (url: string) => void;
      
      HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
      };
    };
  };
}
