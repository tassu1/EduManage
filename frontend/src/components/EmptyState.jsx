import "./EmptyState.css";

/**
 * Used whenever a list/collection genuinely has zero items — not for
 * "data not available" (that's a different message, don't conflate them).
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="em-empty">
      {Icon && (
        <div className="em-empty__icon">
          <Icon size={22} strokeWidth={1.75} />
        </div>
      )}
      <p className="em-empty__title">{title}</p>
      {description && <p className="em-empty__description">{description}</p>}
      {action && <div className="em-empty__action">{action}</div>}
    </div>
  );
}
