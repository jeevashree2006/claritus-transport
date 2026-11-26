import { forwardRef, useId } from 'react';
import './Input.css';

/**
 * Text input with label, optional leading icon, hint and error message.
 *
 *   <Input label="Username" icon={User} error={errors.username} value={...} onChange={...} />
 */
export const Input = forwardRef(function Input(
  { label, icon: Icon, hint, error, id, className = '', type = 'text', ...rest },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['field', error && 'field--error', className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className="field__label">
          {label}
        </label>
      )}
      <div className={['input', Icon && 'input--with-icon'].filter(Boolean).join(' ')}>
        {Icon && <Icon size={16} aria-hidden="true" className="input__icon" />}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className="input__control"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      </div>
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
