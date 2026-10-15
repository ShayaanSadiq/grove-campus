import { useEffect } from 'react';
import { STATUS_LABELS } from '../constants.js';

export function PageHeader({ eyebrow, title, lede, children }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {children}
    </header>
  );
}

export function Banner({ kind = 'error', children }) {
  if (!children) return null;
  return <div className={`banner banner-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Loading({ label = 'Loading' }) {
  return <p className="loading" role="status">{label}…</p>;
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Field({ label, error, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : hint ? <small className="hint">{hint}</small> : null}
    </label>
  );
}

export function Badge({ value }) {
  if (!value) return null;
  return <span className={`badge badge-${value}`}>{STATUS_LABELS[value] || value}</span>;
}

export function Stars({ value }) {
  const full = Math.round(Number(value) || 0);
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {'★'.repeat(full)}
      {'☆'.repeat(Math.max(0, 5 - full))}
    </span>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="btn btn-ghost btn-small" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function artClass(category = '') {
  return `art art-${category.toLowerCase()}`;
}
