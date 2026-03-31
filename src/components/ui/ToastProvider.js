import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/ui';

const ToastContext = createContext(null);

const VARIANT_CLASSES = {
  info: 'border-brand-blue/30 bg-brand-blue/20 text-blue-50',
  success: 'border-app-success/30 bg-app-success/15 text-green-50',
  warning: 'border-app-warning/35 bg-app-warning/15 text-yellow-50',
  danger: 'border-app-danger/35 bg-app-danger/15 text-red-50',
};

export function ToastProvider({children}) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({title, description, variant = 'info', duration = 3600}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setToasts((currentToasts) => [
        ...currentToasts,
        {
          id,
          title,
          description,
          variant,
        },
      ]);

      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, duration);

      timersRef.current.set(id, timer);
      return id;
    },
    [dismissToast]
  );

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const value = useMemo(() => ({showToast, dismissToast}), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto rounded-2xl border px-4 py-3 shadow-card backdrop-blur',
              VARIANT_CLASSES[toast.variant] || VARIANT_CLASSES.info
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-sm leading-6 opacity-90">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="focus-ring rounded-full p-1 text-current/75 transition hover:text-current"
                aria-label="Dismiss notification"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider');
  }

  return context;
}
