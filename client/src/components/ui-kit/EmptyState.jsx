import { Inbox } from 'lucide-react';
import './EmptyState.css';

/**
 * Friendly "nothing here" block.
 *   <EmptyState icon={Truck} title="..." description="..." action={<Button>..</Button>} />
 */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className = '' }) {
  return (
    <div className={['empty-state', className].filter(Boolean).join(' ')}>
      <span className="empty-state__icon" aria-hidden="true">
        <Icon size={28} />
      </span>
      {title && <h2 className="empty-state__title">{title}</h2>}
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

export default EmptyState;
