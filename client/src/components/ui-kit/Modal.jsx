import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import './Modal.css';

/**
 * Dialog. Render it only while it should be open:
 *   {open && <Modal title="Edit" onClose={() => setOpen(false)} footer={<Button>Save</Button>}>...</Modal>}
 *
 * Props:
 *   variant  'center' (default) | 'side' (slides in from the right)
 *   size     'sm' | 'md' | 'lg'
 * Closes on Escape, overlay click and the close button.
 */
export function Modal({ title, onClose, footer, children, variant = 'center', size = 'md' }) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();
    document.body.classList.add('no-scroll');

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('no-scroll');
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className={`modal-overlay modal-overlay--${variant}`} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal modal--${variant} modal--${size}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
          <Button variant="ghost" size="sm" icon={X} onClick={onClose} aria-label="Close" />
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
