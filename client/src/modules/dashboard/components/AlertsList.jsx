/**
 * "Alerts and exceptions" list (dashboard only). Display only for now -
 * rows will link to the filtered module pages later.
 */
import { ChevronRight } from 'lucide-react';
import './AlertsList.css';

export default function AlertsList({ items = [] }) {
  return (
    <ul className="alerts-list">
      {items.map((item) => (
        <li key={item.id} className={`alerts-list__item alerts-list__item--${item.tone}`}>
          <div className="alerts-list__text">
            <p className="alerts-list__title">{item.title}</p>
            <p className="alerts-list__detail">{item.detail}</p>
          </div>
          <ChevronRight size={18} aria-hidden="true" className="alerts-list__chevron" />
        </li>
      ))}
    </ul>
  );
}
