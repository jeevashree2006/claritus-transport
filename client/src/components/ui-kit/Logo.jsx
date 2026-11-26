import { useState } from 'react';
import './Logo.css';

/**
 * Company logo (white + orange artwork, made for dark backgrounds).
 * Files live in client/public/brand/ - replace them to change the logo everywhere.
 * If a file can't be loaded, a simple text mark is shown instead.
 *
 * Props:
 *   variant  'full'  - emblem + wordmark (default)
 *            'mark'  - emblem only (collapsed sidebar, small spaces)
 *   size     'sm' | 'md' | 'lg'  - controls the logo height
 */
export const LOGO_SRC = '/brand/claritas-logo.jpg'; // official Claritas Recyclers artwork, used unmodified
export const LOGO_MARK_SRC = '/brand/claritas-mark.svg';

export function Logo({ variant = 'full', size = 'md', className = '' }) {
  const [failed, setFailed] = useState(false);
  const classes = ['logo', `logo--${variant}`, `logo--${size}`, className].filter(Boolean).join(' ');

  if (failed) {
    return (
      <span className={`${classes} logo--fallback`} role="img" aria-label="Claritas">
        <span className="logo__fallback-mark" aria-hidden="true">
          C
        </span>
        {variant === 'full' && (
          <span className="logo__fallback-text" aria-hidden="true">
            Claritas
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={classes}>
      <img
        src={variant === 'mark' ? LOGO_MARK_SRC : LOGO_SRC}
        alt="Claritas"
        className="logo__img"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

export default Logo;
