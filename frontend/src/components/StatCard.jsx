import "./StatCard.css";

/**
 * A single KPI number + label. Uses the mono type face for the value —
 * a deliberate nod to gradebook/report-card tabular figures, not a
 * random font pairing.
 *
 * value: only render a real number/string you have. Don't pass a
 * placeholder here — use `EmptyState` or omit the card instead.
 */
export default function StatCard({ icon: Icon, label, value, tone = "default" }) {
  return (
    <div className={`em-stat-card em-stat-card--${tone}`}>
      {Icon && (
        <div className="em-stat-card__icon">
          <Icon size={18} strokeWidth={2} />
        </div>
      )}
      <div>
        <div className="em-stat-card__value">{value}</div>
        <div className="em-stat-card__label">{label}</div>
      </div>
    </div>
  );
}
