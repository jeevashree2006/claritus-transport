import { forwardRef } from 'react';
import './Button.css';

/**
 * The ONLY button used in the app.
 *
 * Props:
 *   variant       'primary' | 'secondary' | 'ghost' | 'danger'
 *   size          'sm' | 'md' | 'lg'
 *   icon          lucide-react icon component, e.g. icon={Plus}
 *   iconPosition  'left' | 'right'
 *   fullWidth     stretch to the container width
 *   loading       shows a spinner and disables the button
 * Icon-only buttons (no children) MUST get an aria-label.
 */
const ICON_SIZES = { sm: 14, md: 16, lg: 18 };

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    loading = false,
    disabled = false,
    type = 'button',
    className = '',
    children,
    ...rest
  },
  ref
) {
  const iconOnly = Boolean(Icon) && !children;
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && 'btn--full',
    iconOnly && 'btn--icon-only',
    loading && 'btn--loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const iconNode = Icon ? <Icon size={ICON_SIZES[size]} aria-hidden="true" className="btn__icon" /> : null;

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : iconPosition === 'left' && iconNode}
      {children && <span className="btn__label">{children}</span>}
      {!loading && iconPosition === 'right' && iconNode}
    </button>
  );
});

export default Button;
