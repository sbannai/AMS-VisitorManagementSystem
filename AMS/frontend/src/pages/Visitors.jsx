import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge, PurposeBadge, Avatar, Modal, Spinner, EmptyState, PageLoader, Alert } from '../components/common/UI';
import { Users, Search, Filter, CheckCheck, LogOut, ArrowLeft, Car, RefreshCw, ChevronRight, PlusCircle, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

/* ────────────────────────────── LIST ────────────────────────────── */
export function VisitorList() {
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter,   setDateFilter]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter)   params.date   = dateFilter;
      if (search)       params.search = search;
      const { data } = await api.get('/visitors', { params });
      setVisitors(data.visitors);
    } catch (_) {}
    finally { setLoading(false); }
  }, [statusFilter, dateFilter, search]);

  useEffect(() => { load(); }, [load]);

  const STATUSES = [
    { value: '',               label: 'All' },
    { value: 'checked_in',     label: 'Checked In' },
    { value: 'meeting_complete',label: 'Meeting Done' },
    { value: 'overdue',        label: 'Overdue' },
    { value: 'missing',        label: '⚠ Missing' },
    { value: 'checked_out',    label: 'Checked Out' },
  ];

  const missingCount = visitors.filter(v => v.status === 'missing').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-surface-900">Visitors</h1>
          <p className="text-surface-500 text-sm mt-0.5">{visitors.length} record{visitors.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline btn-sm"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}/></button>
          {['receptionist','admin'].includes(user?.role) && (
            <Link to="/visitors/register" className="btn-success btn-sm"><PlusCircle className="w-3.5 h-3.5"/>Register Visitor</Link>
          )}
        </div>
      </div>

      {/* Missing alert banner */}
      {missingCount > 0 && (
        <div className="bg-red-600 text-white rounded-2xl p-4 flex items-center gap-3 animate-slide-up">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse"/>
          <p className="font-bold">{missingCount} MISSING VISITOR{missingCount > 1 ? 'S' : ''} — Immediate action required!</p>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400"/>
            <input className="field-input pl-10" placeholder="Search by name, phone, vehicle…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <input type="date" className="field-input w-40"
            value={dateFilter} onChange={e => setDateFilter(e.target.value)}/>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-surface-400 flex-shrink-0"/>
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all
                ${s.value === 'missing' ? (statusFilter === s.value ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100') :
                  statusFilter === s.value ? 'bg-brand-600 text-white shadow-sm' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <PageLoader/> : visitors.length === 0 ? (
          <EmptyState icon={Users} title="No visitors found"
            subtitle="Try adjusting your filters"
            action={['receptionist','admin'].includes(user?.role) ? (
              <Link to="/visitors/register" className="btn-success btn-sm"><PlusCircle className="w-3.5 h-3.5"/>Register Visitor</Link>
            ) : null}/>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-100">
                <tr>
                  {['Visitor','Badge','Purpose','Person to Meet','Vehicle','Check In','Status',''].map(h => (
                    <th key={h} className="tbl-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visitors.map((v, i) => (
                  <tr key={v._id} className={`tbl-row ${v.status === 'missing' ? 'bg-red-50' : ''}`}>
                    <td className="tbl-cell">
                      <div className="flex items-center gap-2.5">
                        {v.photoUrl || v.photoBase64 ? (
                          <img src={v.photoUrl || v.photoBase64} alt={v.name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-surface-200"/>
                        ) : (
                          <Avatar name={v.name} size="sm" index={i}/>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-surface-900">{v.name}</p>
                          <p className="text-[11px] text-surface-400">{v.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="tbl-cell font-mono text-xs text-brand-700">{v.badgeNumber}</td>
                    <td className="tbl-cell"><PurposeBadge purpose={v.purposeCategory}/></td>
                    <td className="tbl-cell text-xs font-medium">{v.personToMeet}</td>
                    <td className="tbl-cell">
                      {v.vehicleNumber ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Car className="w-3.5 h-3.5 text-surface-400"/>
                          <span className="font-mono font-medium">{v.vehicleNumber}</span>
                        </div>
                      ) : <span className="text-xs text-surface-400">None</span>}
                    </td>
                    <td className="tbl-cell text-xs whitespace-nowrap">
                      {format(new Date(v.checkInTime), 'dd MMM, HH:mm')}
                    </td>
                    <td className="tbl-cell"><StatusBadge status={v.status} type="visitor"/></td>
                    <td className="tbl-cell text-right">
                      <Link to={`/visitors/${v._id}`} className="btn-ghost btn-sm">
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
export function VisitorDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [visitor, setVisitor]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [modal,   setModal]       = useState(null); // 'complete'|'checkout'
  const [note,    setNote]        = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get(`/visitors/${id}`); setVisitor(data.visitor); }
    catch (_) {}
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const completeMeeting = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/visitors/${id}/complete-meeting`, { hostNotes: note });
      toast.success('Meeting marked complete! Gatekeeper notified. 10-min alert set.');
      setModal(null); setNote(''); load();
    } catch (_) {}
    finally { setSubmitting(false); }
  };

  const checkout = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/visitors/${id}/checkout`, { gatekeeperNotes: note });
      toast.success('Visitor checked out successfully!');
      setModal(null); setNote(''); load();
    } catch (_) {}
    finally { setSubmitting(false); }
  };

  if (loading) return <PageLoader/>;
  if (!visitor) return <EmptyState icon={Users} title="Visitor not found" action={<button onClick={() => nav('/visitors')} className="btn-brand btn-sm">Go Back</button>}/>;

  const canComplete = ['teacher','receptionist','admin'].includes(user?.role) &&
    ['checked_in','overdue'].includes(visitor.status);
  const canCheckout = ['gatekeeper','receptionist','admin'].includes(user?.role) &&
    !['checked_out'].includes(visitor.status);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button onClick={() => nav(-1)} className="btn-ghost btn-sm -ml-2"><ArrowLeft className="w-4 h-4"/>Back</button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start gap-4 mb-5">
          {(visitor.photoUrl || visitor.photoBase64) ? (
            <img src={visitor.photoUrl || visitor.photoBase64} alt={visitor.name}
              className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border-2 border-surface-200 shadow-md"/>
          ) : (
            <Avatar name={visitor.name} size="xl" index={0}/>
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-display font-bold text-xl text-surface-900">{visitor.name}</h1>
                <p className="text-surface-500 text-sm mt-0.5">{visitor.phone}{visitor.email ? ` · ${visitor.email}` : ''}</p>
                {visitor.company && <p className="text-sm text-surface-500">{visitor.company}</p>}
              </div>
              <StatusBadge status={visitor.status} type="visitor"/>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-mono text-xs bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-lg font-semibold">
                {visitor.badgeNumber}
              </span>
              {visitor.vehicleNumber && (
                <span className="flex items-center gap-1 text-xs bg-surface-100 text-surface-700 border border-surface-200 px-2 py-0.5 rounded-lg font-semibold">
                  <Car className="w-3 h-3"/>{visitor.vehicleNumber} ({visitor.vehicleType})
                </span>
              )}
            </div>
          </div>
        </div>

        {visitor.status === 'missing' && (
          <Alert type="danger" message={`🚨 MISSING VISITOR — Alert triggered at ${format(new Date(visitor.missingAlertAt), 'HH:mm')}. This person has NOT checked out!`}/>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {[
            ['Purpose', visitor.purpose],
            ['Person to Meet', visitor.personToMeet],
            ['Check-in Time', format(new Date(visitor.checkInTime), 'dd MMM yyyy, HH:mm')],
            ['Expected Duration', `${visitor.expectedDuration} minutes`],
            visitor.checkOutTime && ['Check-out Time', format(new Date(visitor.checkOutTime), 'dd MMM yyyy, HH:mm')],
            visitor.meetingCompletedAt && ['Meeting Completed', format(new Date(visitor.meetingCompletedAt), 'dd MMM yyyy, HH:mm')],
            visitor.idType && ['ID Type', visitor.idType.replace('_',' ')],
            visitor.idNumber && ['ID Number', visitor.idNumber],
          ].filter(Boolean).map(([k,v]) => (
            <div key={k}>
              <p className="field-label mb-0.5">{k}</p>
              <p className="text-sm font-medium text-surface-800">{v}</p>
            </div>
          ))}
        </div>

        {visitor.hostNotes && (
          <div className="mt-4 p-3 bg-brand-50 border border-brand-200 rounded-xl">
            <p className="field-label text-brand-700 mb-1">Host notes</p>
            <p className="text-sm text-brand-800">{visitor.hostNotes}</p>
          </div>
        )}

        {visitor.gatekeeperNotes && (
          <div className="mt-3 p-3 bg-surface-50 border border-surface-200 rounded-xl">
            <p className="field-label mb-1">Gatekeeper notes</p>
            <p className="text-sm text-surface-700">{visitor.gatekeeperNotes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-5 pt-5 border-t border-surface-100">
          {canComplete && (
            <button onClick={() => setModal('complete')} className="btn-brand flex-1">
              <CheckCheck className="w-4 h-4"/>Mark Meeting Complete
            </button>
          )}
          {canCheckout && (
            <button onClick={() => setModal('checkout')} className="btn-success flex-1">
              <LogOut className="w-4 h-4"/>Check Out Visitor
            </button>
          )}
          {!canComplete && !canCheckout && (
            <p className="text-sm text-surface-400 italic">No actions available for your role at this stage.</p>
          )}
        </div>
      </div>

      {/* Complete meeting modal */}
      <Modal open={modal === 'complete'} onClose={() => setModal(null)} title="Mark Meeting as Complete">
        <Alert type="warning" message={`Gatekeeper will be notified immediately. A MISSING alert will auto-trigger if visitor doesn't exit within ${process.env.REACT_APP_ALERT_MINUTES || 10} minutes.`}/>
        <div className="mt-4">
          <label className="field-label">Host notes (optional)</label>
          <textarea rows={3} className="field-textarea mt-1.5" placeholder="Notes about the visit…"
            value={note} onChange={e => setNote(e.target.value)}/>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setModal(null)} className="btn-outline flex-1">Cancel</button>
          <button onClick={completeMeeting} disabled={submitting} className="btn-brand flex-1">
            {submitting ? <><Spinner size="sm"/>Processing…</> : <><CheckCheck className="w-4 h-4"/>Notify Gatekeeper</>}
          </button>
        </div>
      </Modal>

      {/* Checkout modal */}
      <Modal open={modal === 'checkout'} onClose={() => setModal(null)} title="Check Out Visitor">
        <p className="text-sm text-surface-600 mb-4">
          Confirm that <strong>{visitor.name}</strong> ({visitor.vehicleNumber || 'no vehicle'}) is leaving the premises.
        </p>
        <label className="field-label">Gatekeeper notes (optional)</label>
        <textarea rows={2} className="field-textarea mt-1.5" placeholder="Any observations during exit…"
          value={note} onChange={e => setNote(e.target.value)}/>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setModal(null)} className="btn-outline flex-1">Cancel</button>
          <button onClick={checkout} disabled={submitting} className="btn-success flex-1">
            {submitting ? <><Spinner size="sm"/>Checking out…</> : <><LogOut className="w-4 h-4"/>Confirm Check Out</>}
          </button>
        </div>
      </Modal>
    </div>
  );
}
