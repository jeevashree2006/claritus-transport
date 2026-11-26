/**
 * Horizontal bars: open requirements per stage (dashboard only).
 */
import './StageBars.css';

export default function StageBars({ items = [] }) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <ol className="stage-bars">
      {items.map((item, index) => (
        <li key={item.stage} className="stage-bars__row">
          <span className="stage-bars__label">
            <span className="stage-bars__step" aria-hidden="true">
              {index + 1}
            </span>
            {item.stage}
          </span>
          <span className="stage-bars__track" aria-hidden="true">
            <span className="stage-bars__fill" style={{ width: `${(item.count / max) * 100}%` }} />
          </span>
          <span className="stage-bars__value">
            {item.count}
            <span className="sr-only"> requirements</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
