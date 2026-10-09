import { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import "./Toast.css";

/**
 * Renders the same success/error text the app already produces
 * (error.response?.data?.message, etc.) — this only changes how it's
 * displayed: a dismissible, auto-clearing toast instead of a div that
 * sits on the page until the next state change overwrites it.
 *
 * type: 'success' | 'error'
 */
export default function Toast({ type = "success", message, onDismiss, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  const Icon = type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`em-toast em-toast--${type}`} role="status">
      <Icon size={18} strokeWidth={2} />
      <span>{message}</span>
      <button type="button" className="em-toast__close" onClick={onDismiss} aria-label="Dismiss">
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
