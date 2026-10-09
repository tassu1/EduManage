import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import "./ToastStack.css";

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

function ToastStackItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const Icon = ICONS[toast.type] || CheckCircle2;

  return (
    <div className={`em-toast-stack__item em-toast-stack__item--${toast.type}`} role="status">
      <Icon size={18} strokeWidth={2} />
      <span>{toast.message}</span>
      <button
        type="button"
        className="em-toast-stack__close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

/**
 * Renders any number of simultaneous toasts, stacked with a gap —
 * fixes a latent overlap issue where two independently-fixed single
 * toasts would sit on top of each other if both fired at once.
 * Each toast auto-dismisses after 5s, matching the original behavior.
 *
 * toasts: [{ id, message, type }]
 */
export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="em-toast-stack">
      {toasts.map((toast) => (
        <ToastStackItem toast={toast} onDismiss={onDismiss} key={toast.id} />
      ))}
    </div>
  );
}
