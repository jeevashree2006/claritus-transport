/**
 * Timeline of a requirement, newest first (from requirement_history).
 */
import { formatDateTime } from '../utils/format';
import './HistoryList.css';

export default function HistoryList({ items = [] }) {
  if (items.length === 0) {
    return <p className="history-list__empty">Nothing has happened yet.</p>;
  }

  return (
    <ol className="history-list">
      {items.map((item) => (
        <li key={item.id} className="history-list__item">
          <span className="history-list__dot" aria-hidden="true" />
          <div className="history-list__body">
            <p className="history-list__message">{item.message}</p>
            <p className="history-list__meta">
              {formatDateTime(item.createdAt)}
              {item.createdBy && ` · ${item.createdBy}`}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
