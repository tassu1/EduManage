import "./BarChart.css";

/**
 * Small horizontal bar chart, built with plain divs — no charting
 * library. Intended for same-instant category comparisons (counts,
 * fee breakdowns), NOT for anything implying a trend over time, since
 * this app's backend doesn't currently return time-series data.
 *
 * data: [{ label: string, value: number, unit?: string }]
 * If every value is 0 or data is empty, renders an explicit "no data
 * yet" state instead of a chart with invisible bars.
 */
export default function BarChart({ data, unit = "", emptyLabel = "No data yet" }) {
  const max = Math.max(0, ...data.map((d) => d.value));

  if (data.length === 0 || max === 0) {
    return <div className="em-barchart__empty">{emptyLabel}</div>;
  }

  return (
    <div className="em-barchart" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}${unit}`).join(", ")}>
      {data.map((d) => (
        <div className="em-barchart__row" key={d.label}>
          <div className="em-barchart__label">{d.label}</div>
          <div className="em-barchart__track">
            <div
              className="em-barchart__fill"
              style={{ width: `${Math.max((d.value / max) * 100, 3)}%` }}
            />
          </div>
          <div className="em-barchart__value">
            {d.value}
            {d.unit ?? unit}
          </div>
        </div>
      ))}
    </div>
  );
}
