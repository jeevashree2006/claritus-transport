import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import './Alert.css';

/**
 * Inline message box.
 *   <Alert tone="danger">Username or password is wrong.</Alert>
 * tone: 'info' | 'success' | 'warning' | 'danger'
 */
const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

export function Alert({ tone = 'info', title, children, className = '' }) {
  const Icon = ICONS[tone] || Info;
  const urgent = tone === 'danger' || tone === 'warning';

  return (
    <div
      className={['alert', `alert--${tone}`, className].filter(Boolean).join(' ')}
      role={urgent ? 'alert' : 'status'}
    >
      <Icon size={18} aria-hidden="true" className="alert__icon" />
      <div className="alert__content">
        {title && <p className="alert__title">{title}</p>}
        {children && <div className="alert__text">{children}</div>}
      </div>
    </div>
  );
}

export default Alert;
