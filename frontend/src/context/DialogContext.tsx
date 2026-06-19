import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import AlertDialog from '../components/dialog/AlertDialog';
import ConfirmDialog from '../components/dialog/ConfirmDialog';
import ToastContainer, { type ToastData } from '../components/dialog/Toast';

interface DialogContextType {
  showAlert: (params: { title: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => void;
  showConfirm: (params: {
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
    confirmText?: string;
  }) => void;
  toast: (params: { message: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
    confirmText: string;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [nextId, setNextId] = useState(1);

  const showAlert = useCallback(({ title, message, type = 'info' }: { title: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => {
    setAlert({ title, message, type });
  }, []);

  const showConfirm = useCallback(({ title, message, onConfirm, variant = 'danger', confirmText = 'ยืนยัน' }: {
    title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info'; confirmText?: string;
  }) => {
    setConfirm({ title, message, onConfirm, variant, confirmText });
  }, []);

  const toast = useCallback(({ message, type = 'info', duration = 3000 }: { message: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => {
    const id = nextId;
    setNextId(n => n + 1);
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, [nextId]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, toast }}>
      {children}
      <AlertDialog
        open={!!alert}
        onClose={() => setAlert(null)}
        title={alert?.title || ''}
        message={alert?.message || ''}
        type={alert?.type || 'info'}
      />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm || (() => {})}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        variant={confirm?.variant || 'danger'}
        confirmText={confirm?.confirmText || 'ยืนยัน'}
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </DialogContext.Provider>
  );
}
