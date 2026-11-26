import './Loader.css';

/**
 * Spinner.
 *   <Loader />                     inline
 *   <Loader fullScreen label="Checking your session" />
 * size: 'sm' | 'md' | 'lg'
 */
export function Loader({ fullScreen = false, label = 'Loading', size = 'md', showLabel = false, className = '' }) {
  const spinner = (
    <span
      className={['loader', `loader--${size}`, !fullScreen && className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className="loader__spinner" aria-hidden="true" />
      <span className={showLabel || fullScreen ? 'loader__label' : 'sr-only'}>{label}</span>
    </span>
  );

  if (!fullScreen) return spinner;

  return <div className={['loader-screen', className].filter(Boolean).join(' ')}>{spinner}</div>;
}

export default Loader;
