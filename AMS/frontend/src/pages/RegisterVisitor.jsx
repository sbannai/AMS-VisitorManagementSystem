import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import api from '../utils/api';
import { Spinner, Alert } from '../components/common/UI';
import { Camera, Upload, RefreshCw, X, Car, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const VEHICLE_TYPES = ['none','car','bike','auto'];
const PURPOSE_CATS  = ['meeting','delivery','maintenance','interview','parent_visit','official','other'];
const ID_TYPES      = ['aadhar','passport','driving_license','other'];

export default function RegisterVisitor() {
  const nav = useNavigate();
  const webcamRef = useRef(null);
  const fileRef   = useRef(null);

  const [captureMode, setCaptureMode]   = useState('none'); // none | webcam | file
  const [capturedImg, setCapturedImg]   = useState(null);   // base64 or file object
  const [capturedPrev, setCapturedPrev] = useState(null);   // preview URL
  const [submitting, setSubmitting]     = useState(false);
  const [teachers, setTeachers]         = useState([]);

  const [form, setForm] = useState({
    name:'', phone:'', email:'', company:'',
    vehicleNumber:'', vehicleType:'none',
    idType:'aadhar', idNumber:'',
    purpose:'', purposeCategory:'meeting',
    personToMeet:'', personToMeetId:'', department:'',
    expectedDuration:'60',
  });

  // Load teachers for "person to meet" dropdown
  React.useEffect(() => {
    api.get('/users?role=teacher').then(r => setTeachers(r.data.users)).catch(() => {});
  }, []);

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // Webcam capture
  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot();
    if (img) {
      setCapturedImg(img);
      setCapturedPrev(img);
      setCaptureMode('none');
    }
  }, [webcamRef]);

  // File upload preview
  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
    setCapturedImg(file);
    setCapturedPrev(URL.createObjectURL(file));
    setCaptureMode('none');
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.purpose || !form.personToMeet)
      return toast.error('Please fill all required fields');

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => { if (v) fd.append(k, v); });

      if (capturedImg instanceof File) {
        fd.append('photo', capturedImg);
      } else if (typeof capturedImg === 'string') {
        fd.append('photoBase64', capturedImg);
      }

      await api.post('/visitors', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Visitor registered! Gatekeeper notified.');
      nav('/visitors');
    } catch (_) {}
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-2xl text-surface-900">Register Visitor</h1>
        <p className="text-surface-500 text-sm mt-0.5">Log visitor entry, capture photo, and notify gatekeeper</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Photo capture */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-sm text-surface-700 uppercase tracking-wider mb-4">Visitor Photo</h2>

          {capturedPrev && (
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-brand-400 mb-4 shadow-md">
              <img src={capturedPrev} alt="Captured" className="w-full h-full object-cover"/>
              <button type="button" onClick={() => { setCapturedImg(null); setCapturedPrev(null); }}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                <X className="w-3 h-3"/>
              </button>
            </div>
          )}

          {captureMode === 'webcam' && (
            <div className="relative mb-3">
              <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full max-w-sm rounded-xl border border-surface-200"/>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={capture} className="btn-brand btn-sm"><Camera className="w-3.5 h-3.5"/>Capture</button>
                <button type="button" onClick={() => setCaptureMode('none')} className="btn-outline btn-sm">Cancel</button>
              </div>
            </div>
          )}

          {captureMode !== 'webcam' && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setCaptureMode('webcam')} className="btn-outline btn-sm">
                <Camera className="w-3.5 h-3.5"/>Webcam Capture
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-outline btn-sm">
                <Upload className="w-3.5 h-3.5"/>Upload Photo
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
            </div>
          )}
        </div>

        {/* Personal details */}
        <div className="card p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm text-surface-700 uppercase tracking-wider">Visitor Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Full Name *</label>
              <input className="field-input" placeholder="Visitor's full name" required
                value={form.name} onChange={e => f('name', e.target.value)}/>
            </div>
            <div>
              <label className="field-label">Phone Number *</label>
              <input className="field-input" type="tel" placeholder="+91 9XXXXXXXXX" required
                value={form.phone} onChange={e => f('phone', e.target.value)}/>
            </div>
            <div>
              <label className="field-label">Email</label>
              <input className="field-input" type="email" placeholder="visitor@email.com"
                value={form.email} onChange={e => f('email', e.target.value)}/>
            </div>
            <div>
              <label className="field-label">Company / Organisation</label>
              <input className="field-input" placeholder="Company name (if any)"
                value={form.company} onChange={e => f('company', e.target.value)}/>
            </div>
            <div>
              <label className="field-label">ID Type</label>
              <select className="field-select" value={form.idType} onChange={e => f('idType', e.target.value)}>
                {ID_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">ID Number</label>
              <input className="field-input font-mono" placeholder="ID card number"
                value={form.idNumber} onChange={e => f('idNumber', e.target.value)}/>
            </div>
          </div>
        </div>

        {/* Vehicle */}
        <div className="card p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm text-surface-700 uppercase tracking-wider flex items-center gap-2">
            <Car className="w-4 h-4 text-surface-400"/>Vehicle Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Vehicle Type</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {VEHICLE_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => f('vehicleType', t)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all
                      ${form.vehicleType === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-surface-600 border-surface-200 hover:border-brand-400'}`}>
                    {t === 'none' ? 'No Vehicle' : t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Vehicle Number</label>
              <input className="field-input font-mono uppercase" placeholder="e.g. TS09AB1234"
                value={form.vehicleNumber} onChange={e => f('vehicleNumber', e.target.value.toUpperCase())}
                disabled={form.vehicleType === 'none'}/>
            </div>
          </div>
        </div>

        {/* Visit details */}
        <div className="card p-5 space-y-4">
          <h2 className="font-display font-semibold text-sm text-surface-700 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-surface-400"/>Visit Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Purpose Category</label>
              <select className="field-select" value={form.purposeCategory} onChange={e => f('purposeCategory', e.target.value)}>
                {PURPOSE_CATS.map(p => <option key={p} value={p}>{p.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Expected Duration (minutes)</label>
              <select className="field-select" value={form.expectedDuration} onChange={e => f('expectedDuration', e.target.value)}>
                {['15','30','45','60','90','120'].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="field-label">Purpose / Reason for Visit *</label>
              <textarea rows={2} className="field-textarea" required
                placeholder="Describe the purpose of the visit in detail…"
                value={form.purpose} onChange={e => f('purpose', e.target.value)}/>
            </div>
            <div>
              <label className="field-label">Person to Meet *</label>
              <input className="field-input" placeholder="Name of person to meet" required
                value={form.personToMeet} onChange={e => f('personToMeet', e.target.value)}/>
            </div>
            <div>
              <label className="field-label">Link to Staff Account (optional)</label>
              <select className="field-select" value={form.personToMeetId} onChange={e => f('personToMeetId', e.target.value)}>
                <option value="">— Select staff member —</option>
                {teachers.map(t => <option key={t._id} value={t._id}>{t.name} ({t.subject || t.role})</option>)}
              </select>
            </div>
          </div>
        </div>

        <Alert type="info" message={`Gatekeeper will be notified immediately. If visitor doesn't exit within ${form.expectedDuration} minutes + 10 min buffer, a MISSING alert will be triggered automatically.`}/>

        <div className="flex gap-3">
          <button type="button" onClick={() => nav('/visitors')} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-success flex-1 btn-lg">
            {submitting ? <><Spinner/>Registering…</> : 'Register & Notify Gatekeeper'}
          </button>
        </div>
      </form>
    </div>
  );
}
