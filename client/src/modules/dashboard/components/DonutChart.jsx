/**
 * Donut chart in plain SVG (dashboard only).
 * Each segment is a circle stroke; pathLength=100 lets us use percentages directly.
 */
import './DonutChart.css';

const RADIUS = 42;
const STROKE = 14;
const GAP = 0.8; // small gap between segments, in percent

export default function DonutChart({ segments = [], total, totalLabel = 'Trips' }) {
  let offset = 0;
  const summary = segments.map((s) => `${s.label} ${s.percent}%`).join(', ');

  return (
    <div className="donut">
      <div className="donut__chart">
        <svg viewBox="0 0 120 120" className="donut__svg" role="img" aria-label={`${totalLabel}: ${total}. ${summary}`}>
          <circle cx="60" cy="60" r={RADIUS} className="donut__track" strokeWidth={STROKE} pathLength="100" />
          {segments.map((segment) => {
            const length = Math.max(segment.percent - GAP, 0);
            const circle = (
              <circle
                key={segment.key}
                cx="60"
                cy="60"
                r={RADIUS}
                pathLength="100"
                strokeWidth={STROKE}
                strokeDasharray={`${length} ${100 - length}`}
                strokeDashoffset={-offset}
                className={`donut__segment donut__segment--${segment.tone}`}
              />
            );
            offset += segment.percent;
            return circle;
          })}
        </svg>
        <div className="donut__center" aria-hidden="true">
          <span className="donut__total">{total}</span>
          <span className="donut__total-label">{totalLabel}</span>
        </div>
      </div>

      <ul className="donut__legend">
        {segments.map((segment) => (
          <li key={segment.key} className="donut__legend-item">
            <span className={`donut__dot donut__dot--${segment.tone}`} aria-hidden="true" />
            <span className="donut__legend-label">{segment.label}</span>
            <span className="donut__legend-value">{segment.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
