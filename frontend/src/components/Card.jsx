import "./Card.css";

/**
 * Generic content panel with an optional header (title + right-aligned actions).
 * Replaces the repeated `<div className="tab-header"><h2>...</h2><div className="header-actions">...` markup.
 */
export default function Card({ title, actions, children, className = "" }) {
  return (
    <div className={`em-card ${className}`}>
      {(title || actions) && (
        <div className="em-card__header">
          {title && <h2 className="em-card__title">{title}</h2>}
          {actions && <div className="em-card__actions">{actions}</div>}
        </div>
      )}
      <div className="em-card__body">{children}</div>
    </div>
  );
}
