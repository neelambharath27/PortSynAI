import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

type ToastKind = "success" | "warning" | "error" | "info";

interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface NotificationContextValue {
  notify: (toast: Omit<Toast, "id">) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

const ICONS: Record<ToastKind, typeof CheckCircleIcon> = {
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
};

const COLORS: Record<ToastKind, string> = {
  success: "text-status-success",
  warning: "text-status-warning",
  error: "text-status-danger",
  info: "text-cyan-400",
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = ICONS[toast.kind];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                className="glass-panel pointer-events-auto flex items-start gap-3 rounded-xl p-4"
              >
                <Icon className={`h-5 w-5 shrink-0 ${COLORS[toast.kind]}`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {toast.title}
                  </p>
                  {toast.message && (
                    <p className="mt-0.5 text-xs text-ink-300">
                      {toast.message}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="text-ink-500 hover:text-white"
                  aria-label="Dismiss notification"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotification must be used within NotificationProvider",
    );
  return ctx;
}
