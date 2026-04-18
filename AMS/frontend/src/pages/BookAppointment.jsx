import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Alert, Spinner } from '../components/common/UI';
import { Search, Calendar, Clock, ChevronRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const REASONS = [
  { value: 'academics',       label: 'Academics / Studies' },
  { value: 'behaviour',       label: 'Behaviour / Conduct' },
  { value: 'progress_report', label: 'Progress Report' },
  { value: 'fee',             label: 'Fee Related' },
  { value: 'general',         label: 'General Discussion' },
  { value: 'other',           label: 'Other' },
];

const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00',
];

export default function BookAppointment() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [step,     setStep]     = useState(1);
  const [teachers, setTeachers] = useState([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    teacherId: '', teacherName: '', teacherSubject: '',
    appointmentDate: '', startTime: '', endTime: '',
    reason: 'general', title: '', description: '',
  });

  useEffect(() => {
    api.get('/users?role=teacher').then(r => setTeachers(r.data.users)).catch(() => {});
  }, []);

  const filtered = teachers.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject?.toLowerCase().includes(search.toLowerCase()) ||
    t.classSection?.toLowerCase().includes(search.toLowerCase())
  );

  const selectTeacher = t => {
    setForm(f => ({ ...f, teacherId: t._id, teacherName: t.name, teacherSubject: t.subject || '' }));
    setStep(2);
  };

  const selectSlot = time => {
    const [h, m] = time.split(':').map(Number);
    const endH = m + 30 >= 60 ? h + 1 : h;
    const endM = (m + 30) % 60;
    const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
    setForm(f => ({ ...f, startTime: time, endTime }));
  };

  const submit = async () => {
    if (!form.appointmentDate) return toast.error('Please select a date');
    if (!form.startTime)       return toast.error('Please select a time slot');
    setSubmitting(true);
    try {
      await api.post('/appointments', {
        teacherId:       form.teacherId,
        title:           form.title || `Meeting with ${form.teacherName}`,
        description:     form.description,
        appointmentDate: form.appointmentDate,
        startTime:       form.startTime,
        endTime:         form.endTime,
        reason:          form.reason,
      });
      toast.success('Appointment requested! Teacher will be notified.');
      nav('/appointments');
    } catch (_) {}
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-surface-900">Book Appointment</h1>
        <p className="text-surface-500 text-sm mt-0.5">Request a meeting with your child's teacher</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-3">
        {[
          { n: 1, label: 'Select Teacher' },
          { n: 2, label: 'Choose Date & Time' },
          { n: 3, label: 'Confirm Details' },
        ].map(({ n, label }) => (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step > n ? 'bg-emerald-500 text-white' : step === n ? 'bg-brand-600 text-white' : 'bg-surface-200 text-surface-500'}`}>
                {step > n ? <Check className="w-3.5 h-3.5"/> : n}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${step >= n ? 'text-surface-900' : 'text-surface-400'}`}>{label}</span>
            </div>
            {n < 3 && <div className={`flex-1 h-px ${step > n ? 'bg-emerald-400' : 'bg-surface-200'}`}/>}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Select teacher */}
      {step === 1 && (
        <div className="card animate-slide-up">
          <div className="p-5 border-b border-surface-100">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400"/>
              <input className="field-input pl-10" placeholder="Search by name, subject, or class…"
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="divide-y divide-surface-50">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-surface-400 text-sm">No teachers found</div>
            ) : filtered.map((t, i) => (
              <button key={t._id} onClick={() => selectTeacher(t)}
                className="w-full flex items-center gap-4 p-5 hover:bg-surface-50 transition-colors group text-left">
                <Avatar name={t.name} size="md" index={i}/>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-surface-900">{t.name}</p>
                  <p className="text-sm text-surface-500 mt-0.5">
                    {t.subject && <span className="font-medium text-brand-600">{t.subject}</span>}
                    {t.subject && t.classSection && ' · '}
                    {t.classSection && `Class ${t.classSection}`}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-brand-500 transition-colors flex-shrink-0"/>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Date + time */}
      {step === 2 && (
        <div className="card p-6 animate-slide-up space-y-5">
          <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
            <Avatar name={form.teacherName} size="sm" index={1}/>
            <div>
              <p className="text-sm font-semibold text-surface-900">{form.teacherName}</p>
              <p className="text-xs text-surface-500">{form.teacherSubject}</p>
            </div>
            <button onClick={() => setStep(1)} className="ml-auto btn-ghost btn-sm">Change</button>
          </div>

          <div>
            <label className="field-label">Appointment Date</label>
            <input type="date" className="field-input"
              min={new Date().toISOString().split('T')[0]}
              value={form.appointmentDate}
              onChange={e => setForm(f => ({ ...f, appointmentDate: e.target.value }))}/>
          </div>

          <div>
            <label className="field-label">Time Slot (30 min sessions)</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-1">
              {TIME_SLOTS.map(t => (
                <button key={t} type="button"
                  onClick={() => selectSlot(t)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all
                    ${form.startTime === t
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-white text-surface-700 border-surface-200 hover:border-brand-400 hover:text-brand-600'}`}>
                  {t}
                </button>
              ))}
            </div>
            {form.startTime && (
              <p className="text-xs text-emerald-600 font-medium mt-2">
                ✓ Selected: {form.startTime} – {form.endTime}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-outline flex-1">Back</button>
            <button onClick={() => { if (!form.appointmentDate || !form.startTime) { toast.error('Pick a date and slot'); return; } setStep(3); }}
              className="btn-brand flex-1">Continue</button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="card p-6 animate-slide-up space-y-5">
          <div>
            <label className="field-label">Reason for Meeting</label>
            <select className="field-select" value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
              {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Subject / Title <span className="text-surface-400 normal-case font-normal">(optional)</span></label>
            <input className="field-input" placeholder={`Meeting with ${form.teacherName}`}
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}/>
          </div>
          <div>
            <label className="field-label">Message to Teacher <span className="text-surface-400 normal-case font-normal">(optional)</span></label>
            <textarea rows={3} className="field-textarea" placeholder="Anything specific you'd like to discuss…"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
          </div>

          {/* Summary */}
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Appointment Summary</p>
            {[
              ['Teacher',    form.teacherName],
              ['Subject',    form.teacherSubject || 'N/A'],
              ['Date',       form.appointmentDate],
              ['Time',       `${form.startTime} – ${form.endTime}`],
              ['Reason',     REASONS.find(r => r.value === form.reason)?.label],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-brand-600 font-medium">{k}</span>
                <span className="text-brand-900 font-semibold">{v}</span>
              </div>
            ))}
          </div>

          <Alert type="info" message="The teacher will receive a notification and must accept your appointment request."/>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-outline flex-1">Back</button>
            <button onClick={submit} disabled={submitting} className="btn-brand flex-1">
              {submitting ? <><Spinner size="sm"/>Sending…</> : 'Send Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
