import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2, GraduationCap, Users, Shield, School } from 'lucide-react';
import toast from 'react-hot-toast';

const DEMOS = [
  { label: 'Admin',         email: 'admin@school.com',      color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { label: 'Receptionist',  email: 'reception@school.com',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { label: 'Gatekeeper',    email: 'gate@school.com',       color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { label: 'Teacher (Math)',email: 'ramesh@school.com',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Teacher (Sci)', email: 'sunita@school.com',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Parent (Ravi)', email: 'ravi@parent.com',       color: 'bg-brand-100 text-brand-700 border-brand-200' },
  { label: 'Parent (Meena)',email: 'meena@parent.com',      color: 'bg-brand-100 text-brand-700 border-brand-200' },
];

export default function Login() {
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome, ${user.name.split(' ')[0]}!`);
      nav('/');
    } catch (_) {}
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-surface-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)', backgroundSize: '32px 32px' }}/>
        {/* Glow */}
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl"/>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg">
              <School className="w-6 h-6 text-white"/>
            </div>
            <div>
              <p className="font-display font-bold text-white text-lg leading-tight">SchoolERP</p>
              <p className="text-surface-400 text-xs">Appointment & Visitor System</p>
            </div>
          </div>

          <h1 className="font-display font-bold text-4xl xl:text-5xl text-white leading-tight mb-5">
            Manage school<br/>
            <span className="text-brand-400">appointments</span><br/>
            & visitors<br/>
            <span className="text-emerald-400">intelligently.</span>
          </h1>
          <p className="text-surface-400 text-base leading-relaxed max-w-sm">
            Real-time notifications, webcam photo capture, vehicle tracking,
            and automated MISSING visitor alerts — all in one system.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { icon: GraduationCap, label: 'Appointment\nManagement' },
            { icon: Users,         label: 'Visitor\nManagement' },
            { icon: Shield,        label: 'Real-Time\nAlerts' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <Icon className="w-6 h-6 text-brand-400 mx-auto mb-2"/>
              <p className="text-white text-xs font-medium whitespace-pre-line">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface-50">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <School className="w-5 h-5 text-white"/>
            </div>
            <p className="font-display font-bold text-surface-900">SchoolERP</p>
          </div>

          <h2 className="font-display font-bold text-2xl text-surface-900 mb-1">Sign in</h2>
          <p className="text-surface-500 text-sm mb-7">Access your dashboard to manage appointments and visitors.</p>

          {/* Demo buttons */}
          <div className="mb-6 p-4 bg-white rounded-2xl border border-surface-200 shadow-card">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Quick demo login (pass: demo123)</p>
            <div className="flex flex-wrap gap-2">
              {DEMOS.map(d => (
                <button key={d.email} type="button"
                  onClick={() => setForm({ email: d.email, password: 'demo123' })}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all hover:scale-105 ${d.color}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="field-label">Email address</label>
              <input type="email" className="field-input" placeholder="you@school.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required/>
            </div>
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} className="field-input pr-11"
                  placeholder="••••••••"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required/>
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700 transition-colors">
                  {show ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-brand w-full btn-lg">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin"/>Signing in…</>
                : 'Sign In'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
