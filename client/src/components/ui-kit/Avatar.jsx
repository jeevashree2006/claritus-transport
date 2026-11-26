import './Avatar.css';

/**
 * Round avatar showing the first letter of the name.
 *   <Avatar name="Administrator" />
 * size: 'sm' | 'md' | 'lg'
 */
export function Avatar({ name = '', size = 'md', className = '' }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <span className={['avatar', `avatar--${size}`, className].filter(Boolean).join(' ')} aria-hidden="true">
      {initial}
    </span>
  );
}

export default Avatar;
