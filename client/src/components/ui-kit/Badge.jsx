import './Badge.css';

/**
 * Small status pill.
 *   <Badge tone="success">Delivered</Badge>
 * tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral'
 */
export function Badge({ tone = 'neutral', children, className = '' }) {
  return <span className={['badge', `badge--${tone}`, className].filter(Boolean).join(' ')}>{children}</span>;
}

export default Badge;
