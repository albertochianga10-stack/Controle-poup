import { useEffect } from 'react';
import { Toast } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.slice(0, 3).map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
  key?: string;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const { id, message, type, duration = 3000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  const config = {
    success: {
      bg: 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    },
    error: {
      bg: 'bg-rose-950/90 border-rose-500/30 text-rose-200',
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-950/90 border-amber-500/30 text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    info: {
      bg: 'bg-indigo-950/90 border-indigo-500/30 text-indigo-200',
      icon: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
    },
  }[type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-300 pointer-events-auto transform translate-y-0 animate-fade-in ${config.bg}`}
      style={{ animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
    >
      {config.icon}
      <p className="text-sm font-medium flex-1 pt-0.5 leading-relaxed">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="text-current hover:opacity-80 transition-opacity p-0.5 rounded-lg hover:bg-white/5 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
