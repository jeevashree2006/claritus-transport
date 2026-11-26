/**
 * Percentage with a small horizontal bar. Shows "–" when there is nothing to measure.
 *   <RateBar value={82} label="Reply rate" />
 */
import { formatPercent } from '../utils/format';

export default function RateBar({ value, label, tone = 'success' }) {
  if (value === null || value === undefined) return <span className="rate-bar__empty">–</span>;
  const width = Math.max(0, Math.min(100, value));
  return (
    <span className="rate-bar">
      <span className="rate-bar__value">{formatPercent(value)}</span>
      <span
        className="rate-bar__track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
      >
        <span className={`rate-bar__fill rate-bar__fill--${tone}`} style={{ width: `${width}%` }} />
      </span>
    </span>
  );
}
