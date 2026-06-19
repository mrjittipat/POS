import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
}

const icons = {
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' },
  warning: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100' },
};

export default function AlertDialog({
  open,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'ตกลง',
}: AlertDialogProps) {
  if (!open) return null;

  const { icon: Icon, color, bg } = icons[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-full ${bg} flex items-center justify-center mx-auto mb-4`}>
            <Icon size={28} className={color} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>

          {/* Message */}
          <p className="text-gray-500 mb-6">{message}</p>

          {/* Button */}
          <button
            onClick={onClose}
            className={`w-full py-2.5 px-4 rounded-xl font-medium transition-colors ${
              type === 'error'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : type === 'success'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : type === 'warning'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
