import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge, ReasonBadge, Avatar, Modal, Spinner, EmptyState, PageLoader, Alert } from '../components/common/UI';
import { Calendar, Clock, Search, Filter, CheckCircle2, XCircle, CheckCheck, ArrowLeft, MessageSquare, RefreshCw, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

/* ────────────────────────────── LIST ────────────────────────────── */
export function AppointmentList() {
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(sp.get('status') || '');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/appointments', { params });
      setAppts(data.appointments);
    } catch (_) {}
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = appts.filter(a =>
    !search ||
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.parent?.name.toLowerCase().includes(search.toLowerCase()) ||
    a.teacher?.name.toLowerCase().includes(search.toLowerCase())
  );

  const STATUSES = ['','pending','accepted','completed','declined','cancelled'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-surface-900">Appointments</h1>
          <p className="text-surface-500 text-sm mt-0.5">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline btn-sm"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}/></button>
          {user?.role === 'parent' && <Link to="/book" className="btn-brand btn-sm"><Calendar className="w-3.5 h-3.5"/>New Request</Link>}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400"/>
          <input className="field-input pl-10" placeholder="Search appointments…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-surface-400"/>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize
                ${statusFilter === s ? 'bg-brand-600 text-white shadow-sm' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <PageLoader/> : filtered.length === 0 ? (
          <EmptyState icon={Calendar} title="No appointments" subtitle="Nothing matches your current filter"/>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  {['Title','Parent / Teacher','Date & Time','Reason','Status',''].map(h => (
                    <th key={h} className="tbl-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a._id} className="tbl-row">
                    <td className="tbl-cell font-semibold text-surface-900 max-w-[180px] truncate">{a.title}</td>
                    <td className="tbl-cell">
                      {user?.role !== 'parent' && (
                        <div className="flex items-center gap-2">
                          <Avatar name={a.parent?.name||'?'} size="sm" index={0}/>
                          <div>
                            <p className="text-xs font-semibold">{a.parent?.name}</p>
                            <p className="text-xs text-surface-400">{a.parent?.childName}</p>
                          </div>
                        </div>
                      )}
                      {user?.role === 'parent' && (
                        <div className="flex items-center gap-2">
                          <Avatar name={a.teacher?.name||'?'} size="sm" index={1}/>
                          <div>
                            <p className="text-xs font-semibold">{a.teacher?.name}</p>
                            <p className="text-xs text-surface-400">{a.teacher?.subject}</p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="tbl-cell whitespace-nowrap">
                      <p className="text-xs font-semibold">{a.appointmentDate}</p>
                      <p className="text-xs text-surface-400">{a.startTime} – {a.endTime}</p>
                    </td>
                    <td className="tbl-cell"><ReasonBadge reason={a.reason}/></td>
                    <td className="tbl-cell"><StatusBadge status={a.status}/></td>
                    <td className="tbl-cell text-right">
                      <Link to={`/appointments/${a._id}`} className="btn-ghost btn-sm">
                        View <ChevronRight className="w-3.5 h-3.5"/>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────── DETAIL ──────────────────────────── */
export function AppointmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [appt, setAppt]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // 'accept'|'decline'|'complete'|'cancel'
  const [note,  setNote]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get(`/appointments/${id}`); setAppt(data.appointment); }
    catch (_) {}
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const action = async (type) => {
    setSubmitting(true);
    try {
      const body = {};
      if (type === 'accept')   { body.teacherNote    = note; await api.patch(`/appointments/${id}/accept`,   body); toast.success('Appointment accepted!'); }
      if (type === 'decline')  { body.declinedReason = note; await api.patch(`/appointments/${id}/decline`,  body); toast.success('Appointment declined.'); }
      if (type === 'complete') { body.meetingSummary = note; await api.patch(`/appointments/${id}/complete`, body); toast.success('Meeting completed! Receptionist notified.'); }
      if (type === 'cancel')   {                              await api.patch(`/appointments/${id}/cancel`);         toast.success('Appointment cancelled.'); }
      setModal(null);
      setNote('');
      load();
    } catch (_) {}
    finally { setSubmitting(false); }
  };

  if (loading) return <PageLoader/>;
  if (!appt) return <EmptyState icon={Calendar} title="Appointment not found" action={<button onClick={() => nav('/appointments')} className="btn-brand btn-sm">Go Back</button>}/>;

  const isTeacher = user?.role === 'teacher';
  const isParent  = user?.role === 'parent';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => nav(-1)} className="btn-ghost btn-sm -ml-2">
        <ArrowLeft className="w-4 h-4"/> Back
      </button>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display font-bold text-xl text-surface-900">{appt.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={appt.status}/>
              <ReasonBadge reason={appt.reason}/>
            </div>
          </div>
          {/* Teacher actions */}
          {isTeacher && appt.status === 'pending' && (
            <div className="flex gap-2">
              <button onClick={() => setModal('accept')}  className="btn-success btn-sm"><CheckCircle2 className="w-3.5 h-3.5"/>Accept</button>
              <button onClick={() => setModal('decline')} className="btn-danger btn-sm"><XCircle className="w-3.5 h-3.5"/>Decline</button>
            </div>
          )}
          {isTeacher && appt.status === 'accepted' && (
            <button onClick={() => setModal('complete')} className="btn-brand btn-sm"><CheckCheck className="w-3.5 h-3.5"/>Mark Complete</button>
          )}
          {isParent && ['pending','accepted'].includes(appt.status) && (
            <button onClick={() => setModal('cancel')} className="btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50">Cancel</button>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="field-label">Parent</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Avatar name={appt.parent?.name||'?'} size="sm" index={0}/>
              <div>
                <p className="text-sm font-semibold text-surface-900">{appt.parent?.name}</p>
                <p className="text-xs text-surface-500">{appt.parent?.childName} · {appt.parent?.childClass}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="field-label">Teacher</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Avatar name={appt.teacher?.name||'?'} size="sm" index={1}/>
              <div>
                <p className="text-sm font-semibold text-surface-900">{appt.teacher?.name}</p>
                <p className="text-xs text-surface-500">{appt.teacher?.subject} · {appt.teacher?.classSection}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="field-label">Date</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Calendar className="w-4 h-4 text-brand-500"/>
              <span className="text-sm font-semibold text-surface-900">{appt.appointmentDate}</span>
            </div>
          </div>
          <div>
            <p className="field-label">Time</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-4 h-4 text-brand-500"/>
              <span className="text-sm font-semibold text-surface-900">{appt.startTime} – {appt.endTime}</span>
            </div>
          </div>
        </div>

        {appt.description && (
          <div className="mt-4 p-3 bg-surface-50 rounded-xl">
            <p className="field-label mb-1">Message from parent</p>
            <p className="text-sm text-surface-700">{appt.description}</p>
          </div>
        )}

        {appt.teacherNote && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="field-label text-emerald-700 mb-1">Teacher's note</p>
            <p className="text-sm text-emerald-800">{appt.teacherNote}</p>
          </div>
        )}

        {appt.declinedReason && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="field-label text-red-700 mb-1">Reason for declining</p>
            <p className="text-sm text-red-800">{appt.declinedReason}</p>
          </div>
        )}

        {appt.meetingSummary && (
          <div className="mt-3 p-3 bg-brand-50 border border-brand-200 rounded-xl">
            <p className="field-label text-brand-700 mb-1">Meeting summary</p>
            <p className="text-sm text-brand-800">{appt.meetingSummary}</p>
          </div>
        )}

        {appt.receptionistNotified && (
          <Alert type="success" message={`Receptionist notified at ${format(new Date(appt.receptionistNotifiedAt), 'dd MMM, HH:mm')}`}/>
        )}
      </div>

      {/* Accept modal */}
      <Modal open={modal === 'accept'} onClose={() => setModal(null)} title="Accept Appointment">
        <p className="text-sm text-surface-600 mb-4">You are accepting this appointment. You can add an optional note for the parent.</p>
        <label className="field-label">Optional note to parent</label>
        <textarea rows={3} className="field-textarea" placeholder="e.g. Please arrive 5 minutes early…"
          value={note} onChange={e => setNote(e.target.value)}/>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setModal(null)} className="btn-outline flex-1">Cancel</button>
          <button onClick={() => action('accept')} disabled={submitting} className="btn-success flex-1">
            {submitting ? <><Spinner size="sm"/>Accepting…</> : <><CheckCircle2 className="w-4 h-4"/>Accept</>}
          </button>
        </div>
      </Modal>

      {/* Decline modal */}
      <Modal open={modal === 'decline'} onClose={() => setModal(null)} title="Decline Appointment" dangerous>
        <p className="text-sm text-surface-600 mb-4">The parent will be notified. Please provide a reason so they can reschedule.</p>
        <label className="field-label">Reason for declining *</label>
        <textarea rows={3} className="field-textarea" placeholder="e.g. I'm unavailable on that date. Please try the following week…"
          value={note} onChange={e => setNote(e.target.value)}/>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setModal(null)} className="btn-outline flex-1">Cancel</button>
          <button onClick={() => action('decline')} disabled={submitting} className="btn-danger flex-1">
            {submitting ? <><Spinner size="sm"/>Declining…</> : <><XCircle className="w-4 h-4"/>Decline</>}
          </button>
        </div>
      </Modal>

      {/* Complete modal */}
      <Modal open={modal === 'complete'} onClose={() => setModal(null)} title="Mark Meeting as Complete">
        <Alert type="info" message="This will notify the receptionist that the meeting has concluded."/>
        <div className="mt-4">
          <label className="field-label">Meeting summary <span className="text-surface-400 normal-case font-normal">(optional)</span></label>
          <textarea rows={3} className="field-textarea mt-1.5" placeholder="Brief summary of what was discussed…"
            value={note} onChange={e => setNote(e.target.value)}/>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setModal(null)} className="btn-outline flex-1">Cancel</button>
          <button onClick={() => action('complete')} disabled={submitting} className="btn-brand flex-1">
            {submitting ? <><Spinner size="sm"/>Completing…</> : <><CheckCheck className="w-4 h-4"/>Mark Complete + Notify Receptionist</>}
          </button>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal open={modal === 'cancel'} onClose={() => setModal(null)} title="Cancel Appointment" dangerous>
        <p className="text-sm text-surface-600">Are you sure you want to cancel this appointment? The teacher will be notified.</p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setModal(null)} className="btn-outline flex-1">Keep it</button>
          <button onClick={() => action('cancel')} disabled={submitting} className="btn-danger flex-1">
            {submitting ? <><Spinner size="sm"/>Cancelling…</> : 'Yes, Cancel'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
