/**
 * Label / value grid for a requirement's details.
 *   <DetailGrid items={[{ label: 'Material', value: 'Steel coils' }]} />
 */
import './DetailGrid.css';

export default function DetailGrid({ items = [] }) {
  return (
    <dl className="detail-grid">
      {items
        .filter((item) => item.value !== undefined)
        .map((item) => (
          <div key={item.label} className="detail-grid__item">
            <dt className="detail-grid__label">{item.label}</dt>
            <dd className="detail-grid__value">{item.value || '–'}</dd>
          </div>
        ))}
    </dl>
  );
}
