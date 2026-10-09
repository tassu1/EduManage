import "./FormField.css";

/**
 * Labeled input wrapper. Pass any native input props through; this only
 * standardizes label + spacing + focus/error styling, not validation logic.
 */
export default function FormField({ label, htmlFor, error, children }) {
  return (
    <div className="em-field">
      {label && (
        <label className="em-field__label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error && <div className="em-field__error">{error}</div>}
    </div>
  );
}
