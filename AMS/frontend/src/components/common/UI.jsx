import React from 'react';
import { X, Loader2, AlertTriangle, CheckCircle2, Clock, XCircle, Ban, CheckCheck } from 'lucide-react';

/* ── Avatar ─────────────────────────────────────────────────────────────────── */
const PALETTES = [
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-violet-100 text-violet-700',
];

export function Avatar({ name = '?', size = 'md', index = 0, photoUrl }) {
  const sz = { xs:'w-7 h-7 text-[10px]', sm:'w-8 h-8 text-xs', md:'w-10 h-10 text-sm', lg:'w-12 h-12 text-base', xl:'w-16 h-16 text-xl' };
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  if (photoUrl) return (
    <img src={photoUrl} alt={name}
      className={`${sz[size]} rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm`}/>
  );
  return (
    <div className={`${sz[size]} ${PALETTES[index % PALETTES.length]} rounded-full flex items-center justify-center font-display font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

/* ── Status Badge ───────────────────────────────────────────────────────────── */
const APPT_STATUS = {
  pending:   { label:'Pending',   icon:<Clock className="w-3 h-3"/>,       cls:'badge-pending' },
  accepted:  { label:'Accepted',  icon:<CheckCircle2 className="w-3 h-3"/>, cls:'badge-accepted' },
  declined:  { label:'Declined',  icon:<XCircle className="w-3 h-3"/>,     cls:'badge-declined' },
  completed: { label:'Completed', icon:<CheckCheck className="w-3 h-3"/>,  cls:'badge-completed' },
  cancelled: { label:'Cancelled', icon:<Ban className="w-3 h-3"/>,         cls:'badge-cancelled' },
};

const VISITOR_STATUS = {
  checked_in:       { label:'Checked In',       cls:'badge-checked_in' },
  checked_out:      { label:'Checked Out',      cls:'badge-checked_out' },
  meeting_complete: { label:'Meeting Done',     cls:'badge-meeting_complete' },
  overdue:          { label:'Overdue',          cls:'badge-overdue' },
  missing:          { label:'⚠️ MISSING',       cls:'badge-missing' },
};

export function StatusBadge({ status, type = 'appointment' }) {
  const map = type === 'visitor' ? VISITOR_STATUS : APPT_STATUS;
  const s = map[status] || { label: status, icon: null, cls: 'badge bg-surface-100 text-surface-500' };
  return <span className={s.cls}>{s.icon}{s.label}</span>;
}

/* ── Reason Badge ───────────────────────────────────────────────────────────── */
const REASONS = {
  academics:'Academics', behaviour:'Behaviour', fee:'Fee',
  general:'General', progress_report:'Progress Report', other:'Other',
};
export function ReasonBadge({ reason }) {
  return <span className="badge bg-surface-100 text-surface-600 border border-surface-200">{REASONS[reason]||reason}</span>;
}

/* ── Purpose Badge ──────────────────────────────────────────────────────────── */
const PURPOSES = {
  meeting:'Meeting', delivery:'Delivery', maintenance:'Maintenance',
  interview:'Interview', parent_visit:'Parent Visit', official:'Official', other:'Other',
};
export function PurposeBadge({ purpose }) {
  return <span className="badge bg-cyan-50 text-cyan-700 border border-cyan-200">{PURPOSES[purpose]||purpose}</span>;
}

/* ── Spinner ────────────────────────────────────────────────────────────────── */
export function Spinner({ size = 'md', className = '' }) {
  const sz = { sm:'w-4 h-4', md:'w-6 h-6', lg:'w-8 h-8' };
  return <Loader2 className={`${sz[size]} animate-spin text-brand-600 ${className}`}/>;
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-3"/>
        <p className="text-sm text-surface-500">Loading…</p>
      </div>
    </div>
  );
}

/* ── Modal ──────────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, size = 'md', dangerous = false }) {
  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  const sizes = { sm:'max-w-sm', md:'max-w-md', lg:'max-w-lg', xl:'max-w-2xl', '2xl':'max-w-3xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className={`bg-white rounded-2xl shadow-modal w-full ${sizes[size]} animate-slide-up`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b border-surface-100 ${dangerous?'bg-red-50 rounded-t-2xl':''}`}>
          <h2 className={`font-display font-bold text-base ${dangerous?'text-red-700':'text-surface-900'}`}>{title}</h2>
          <button onClick={onClose} className="btn-ghost !p-1.5"><X className="w-4 h-4"/></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-surface-400"/>
      </div>
      <p className="font-display font-semibold text-surface-700">{title}</p>
      {subtitle && <p className="text-sm text-surface-500 mt-1">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── Alert Box ──────────────────────────────────────────────────────────────── */
export function Alert({ type = 'info', message }) {
  const styles = {
    info:    'bg-brand-50 border-brand-200 text-brand-700',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    danger:  'bg-red-50 border-red-200 text-red-700',
  };
  const icons = {
    info: <CheckCircle2 className="w-4 h-4 flex-shrink-0"/>,
    success: <CheckCircle2 className="w-4 h-4 flex-shrink-0"/>,
    warning: <AlertTriangle className="w-4 h-4 flex-shrink-0"/>,
    danger: <AlertTriangle className="w-4 h-4 flex-shrink-0"/>,
  };
  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium ${styles[type]}`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  );
}
