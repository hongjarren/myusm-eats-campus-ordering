import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastMsg = { id: string; message: string; type: ToastType; duration?: number };

interface ToastProps extends ToastMsg {
  onClose: (id: string) => void;
}

const ICONS: Record<ToastType, LucideIcon> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const WRAP_COLORS: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-yellow-50 border-yellow-200',
  info: 'bg-blue-50 border-blue-200',
};

const TEXT_COLORS: Record<ToastType, string> = {
  success: 'text-green-800',
  error: 'text-red-800',
  warning: 'text-yellow-800',
  info: 'text-blue-800',
};

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  info: 'text-blue-600',
};

function Toast({ id, message, type, duration = 4000, onClose }: ToastProps) {
  const Icon = ICONS[type];
  const [hovering, setHovering] = useState(false);
  const startRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(duration);
  const rafRef = useRef<number>();

  // auto-dismiss with hover-to-pause
  useEffect(() => {
    const tick = () => {
      if (!hovering) {
        const elapsed = Date.now() - startRef.current;
        if (elapsed >= remainingRef.current) {
          onClose(id);
          return;
        }
      } else {
        // freeze timer while hovering
        startRef.current = Date.now();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [hovering, id, onClose]);

  // progress bar width (0 → 100)
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const int = setInterval(() => {
      if (!hovering) {
        const elapsed = Date.now() - (startRef.current - (duration - remainingRef.current));
        const pct = Math.min(100, Math.round((elapsed / duration) * 100));
        setProgress(pct);
        if (pct >= 100) clearInterval(int);
      }
    }, 50);
    return () => clearInterval(int);
  }, [hovering, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`toast-card pointer-events-auto flex w-[340px] items-start gap-3 rounded-xl border p-4 shadow-md ${WRAP_COLORS[type]} ${TEXT_COLORS[type]} animate-toast-enter`}
      onMouseEnter={() => {
        setHovering(true);
        // capture remaining time when you hover
        const elapsed = Date.now() - (startRef.current - (duration - remainingRef.current));
        remainingRef.current = Math.max(0, duration - elapsed);
      }}
      onMouseLeave={() => {
        setHovering(false);
        startRef.current = Date.now();
      }}
    >
      <div className="pt-0.5">
        <Icon className={`h-5 w-5 ${ICON_COLORS[type]}`} />
      </div>

      <div className="flex-1 text-[13px] leading-5">
        <div className="font-medium">{message}</div>
      </div>

      <button
        aria-label="Dismiss"
        onClick={() => onClose(id)}
        className="ml-1 rounded p-1 text-gray-400 hover:text-gray-600 transition"
      >
        <X className="h-4 w-4" />
      </button>

      {/* progress bar */}
      <div className="absolute left-0 bottom-0 h-[3px] w-full overflow-hidden rounded-b-xl bg-black/0">
        <div
          className={`h-full ${ICON_COLORS[type]} bg-current/30`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: ToastMsg[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed top-6 right-6 z-[9999] flex max-h-[80vh] w-[360px] flex-col gap-3 overflow-y-auto">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onClose={removeToast} />
      ))}
    </div>
  );
}

// useToast hook moved to './useToast' to satisfy react-refresh/only-export-components rule
