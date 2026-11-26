import './Card.css';

/**
 * White panel with an optional header (icon + title + action slot).
 *
 *   <Card title="Trip status" action={<Link to="...">View all</Link>}>...</Card>
 */
export function Card({ title, icon: Icon, action, children, className = '', bodyClassName = '', as: Tag = 'section' }) {
  const hasHeader = Boolean(title || action);

  return (
    <Tag className={['card', className].filter(Boolean).join(' ')}>
      {hasHeader && (
        <header className="card__header">
          {title && (
            <h2 className="card__title">
              {Icon && <Icon size={18} aria-hidden="true" className="card__title-icon" />}
              {title}
            </h2>
          )}
          {action && <div className="card__action">{action}</div>}
        </header>
      )}
      <div className={['card__body', bodyClassName].filter(Boolean).join(' ')}>{children}</div>
    </Tag>
  );
}

export default Card;
