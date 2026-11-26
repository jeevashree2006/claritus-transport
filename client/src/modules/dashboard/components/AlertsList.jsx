/**
 * "Alerts and exceptions" list (dashboard only).
 * An item with `to` is a link to the page where it can be dealt with.
 */
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import './AlertsList.css';

export default function AlertsList({ items = [] }) {
  return (
    <ul className="alerts-list">
      {items.map((item) => {
        const content = (
          <>
            <div className="alerts-list__text">
              <p className="alerts-list__title">{item.title}</p>
              <p className="alerts-list__detail">{item.detail}</p>
            </div>
            {item.to && <ChevronRight size={18} aria-hidden="true" className="alerts-list__chevron" />}
          </>
        );
        return (
          <li key={item.id} className={`alerts-list__item alerts-list__item--${item.tone}`}>
            {item.to ? (
              <Link to={item.to} className="alerts-list__link">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
