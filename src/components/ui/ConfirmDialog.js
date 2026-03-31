import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './Button';

const ConfirmDialogContext = createContext(null);

const DEFAULT_OPTIONS = {
  title: 'Are you sure?',
  description: 'This action cannot be undone.',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  tone: 'danger',
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone,
  onConfirm,
  onCancel,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-app-bg/80 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="surface-card w-full max-w-md p-6"
      >
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
            Confirm action
          </p>
          <h2 id="confirm-dialog-title" className="text-2xl font-semibold text-white">
            {title}
          </h2>
          <p className="text-sm leading-7 text-app-soft">{description}</p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialogProvider({children}) {
  const [dialogOptions, setDialogOptions] = useState(DEFAULT_OPTIONS);
  const [isOpen, setIsOpen] = useState(false);
  const resolverRef = useRef(null);

  const closeDialog = useCallback((result) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }

    setIsOpen(false);
    setDialogOptions(DEFAULT_OPTIONS);
  }, []);

  const confirm = useCallback((options = {}) => {
    setDialogOptions({
      ...DEFAULT_OPTIONS,
      ...options,
    });
    setIsOpen(true);

    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeDialog(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeDialog, isOpen]);

  const value = useMemo(() => ({confirm}), [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={isOpen}
        title={dialogOptions.title}
        description={dialogOptions.description}
        confirmLabel={dialogOptions.confirmLabel}
        cancelLabel={dialogOptions.cancelLabel}
        tone={dialogOptions.tone}
        onConfirm={() => closeDialog(true)}
        onCancel={() => closeDialog(false)}
      />
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error('useConfirmDialog must be used inside a ConfirmDialogProvider');
  }

  return context;
}
