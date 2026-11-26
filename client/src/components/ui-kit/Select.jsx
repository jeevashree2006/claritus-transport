import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import './Input.css';
import './Select.css';

/**
 * Native select with label and error.
 *
 *   <Select label="Period" options={[{ value: 'month', label: 'This month' }]} value={v} onChange={...} />
 * When there is no visible label, pass aria-label instead.
 */
export const Select = forwardRef(function Select(
  { label, options = [], placeholder, error, id, className = '', size = 'md', ...rest },
  ref
) {
  const autoId = useId();
  const selectId = id || autoId;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className={['field', error && 'field--error', className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={selectId} className="field__label">
          {label}
        </label>
      )}
      <div className="select">
        <select
          ref={ref}
          id={selectId}
          className={`select__control select__control--${size}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden="true" className="select__chevron" />
      </div>
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
});

export default Select;
