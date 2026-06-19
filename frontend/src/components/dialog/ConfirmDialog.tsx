import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const variants = {
  danger: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    btn: 'bg-red-600 text-white hover:bg-red-700',
  },
  warning: {
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-500',
    btn: 'bg-orange-600 text-white hover:bg-orange-700',
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
    btn: 'bg-primary-600 text-white hover:bg-primary-700',
  },
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!open) return null;

  const v = variants[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-full ${v.iconBg} flex items-center justify-center mx-auto mb-4`}>
            <AlertTriangle size={28} className={v.iconColor} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>

          {/* Message */}
          <p className="text-gray-500 mb-6">{message}</p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-colors ${v.btn}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
