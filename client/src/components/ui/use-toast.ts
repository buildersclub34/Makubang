import * as React from 'react';

type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

type ToastOptions = Omit<Toast, 'id'>;

interface ToastContextType {
  toast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const toast = React.useCallback(({ title, description, type = 'default', duration = 5000 }: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    setToasts((currentToasts) => [
      ...currentToasts,
      { id, title, description, type, duration },
    ]);

    if (duration) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, [dismissToast]);

  const contextValue = React.useMemo(
    () => ({
      toast,
      dismissToast,
    }),
    [toast, dismissToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
