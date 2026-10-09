import "./Button.css";

/**
 * variant: 'primary' | 'secondary' | 'danger' | 'ghost'
 */
export default function Button({
  variant = "secondary",
  loading = false,
  icon: Icon,
  children,
  disabled,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      className={`em-btn em-btn--${variant}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="em-btn__spinner" aria-hidden="true" />
      ) : (
        Icon && <Icon size={16} strokeWidth={2} />
      )}
      <span>{loading ? "Working…" : children}</span>
    </button>
  );
}
