import { useState, useCallback } from "react";

/**
 * Shared toast-stack state, for pages that can fire multiple messages
 * (e.g. one handler's error while another's success is still visible).
 * Matches the show/remove pattern already used in the original
 * School Admin dashboard's `showToast(message, type)` — just extracted
 * so every role can share it instead of redefining it.
 */
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}
