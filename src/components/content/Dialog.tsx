import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Modal built on the native <dialog>: the browser traps focus, Escape closes it,
 * and focus returns to whatever opened it. Renders only while open.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Short text under the title, read as the dialog's description */
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg' | 'drawer';
  /** alertdialog for confirms that destroy something */
  alert?: boolean;
}

export default function Dialog({ open, onClose, title, description, children, footer, size = 'sm', alert }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    ref.current?.showModal();
    // Closing removes the dialog; send focus back to what opened it.
    return () => { (opener.current as HTMLElement | null)?.focus?.(); };
  }, [open]);

  if (!open) return null;
  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${size}`}
      role={alert ? 'alertdialog' : undefined}
      aria-labelledby={`${id}-t`}
      aria-describedby={description ? `${id}-d` : undefined}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="dialog__inner">
        <div className="dialog__head">
          <h2 id={`${id}-t`} className="dialog__title">{title}</h2>
          <button type="button" className="bframe__btn" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </div>
        {description && <div id={`${id}-d`} className="dialog__desc">{description}</div>}
        {children && <div className="dialog__body">{children}</div>}
        {footer && <div className="dialog__foot">{footer}</div>}
      </div>
    </dialog>
  );
}
