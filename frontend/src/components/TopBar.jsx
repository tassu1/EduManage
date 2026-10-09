import "./TopBar.css";

/**
 * Page title bar. `actions` accepts arbitrary JSX (usually one or two buttons).
 */
export default function TopBar({ title, subtitle, actions }) {
  return (
    <div className="em-topbar">
      <div>
        <h1 className="em-topbar__title">{title}</h1>
        {subtitle && <p className="em-topbar__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="em-topbar__actions">{actions}</div>}
    </div>
  );
}
