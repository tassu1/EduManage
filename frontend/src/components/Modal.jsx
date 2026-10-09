import { X } from "lucide-react";
import "./Modal.css";

/**
 * size: 'small' | 'medium' | 'large' | 'xlarge'
 */
export default function Modal({ isOpen, onClose, title, size = "medium", children }) {
  if (!isOpen) return null;

  return (
    <div className="em-modal-overlay" onClick={onClose}>
      <div
        className={`em-modal em-modal--${size}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="em-modal__header">
          <h3 className="em-modal__title">{title}</h3>
          <button type="button" className="em-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="em-modal__body">{children}</div>
      </div>
    </div>
  );
}
