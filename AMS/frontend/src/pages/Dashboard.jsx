import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge, Avatar, PageLoader } from '../components/common/UI';
import { Calendar, Clock, Users, AlertTriangle, CheckCheck, XCircle, PlusCircle, ArrowRight, RefreshCw, UserX } from 'lucide-react';
import { format, isToday } from 'date-fns';

function Stat({ icon: Icon, label, value, sub, accent = 'blue', loading }) {
  const colors = {
    blue:   'from-brand-500 to-brand-600',
    green:  'from-emerald-500 to-emerald-600',
    amber:  'from-amber-500 to-amber-600',
    red:    'from-red-500 to-red-600',
    violet: 'from-violet-500 to-violet-600',
    cyan:   'from-cyan-500 to-cyan-600',
  };
  return (
    <div className="card p-5 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[accent]} flex items-center justify-center shadow-sm flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white"/>
        </div>
        {sub && <span className="text-xs font-semibold text-surface-400">{sub}</span>}
      </div>
      {loading
        ? <div className="h-8 w-16 bg-surface-100 rounded-lg animate-pulse"/>
        : <p className="font-display font-bold text-3xl text-surface-900">{value}</p>
      }
      <p className="text-xs text-surface-500 mt-1 font-medium">{label}</p>
    </div>
  );
}

function UpcomingAppt({ a, role }) {
  const dateStr = a.appointmentDate;
  const isToday_ = isToday(new Date(dateStr));
  return (
    <Link to={`/appointments/${a._id}`}
      className="flex items-start gap-3 p-3.5 rounded-xl border border-surface-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all group">
      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isToday_ ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-700'}`}>
        <span className="text-xs font-bold leading-none">{format(new Date(dateStr), 'dd')}</span>
        <span className="text-[9px] font-medium mt-0.5 uppercase">{format(new Date(dateStr), 'MMM')}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-900 truncate">{a.title}</p>
        <p className="text-xs text-surface-500 truncate mt-0.5">
          {role === 'parent' ? `${a.teacher?.name} · ${a.teacher?.subject}` : `${a.parent?.name} · Parent of ${a.parent?.childName}`}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <Clock className="w-3 h-3 text-surface-400"/>
          <span className="text-xs text-surface-500">{a.startTime} – {a.endTime}</span>
          {isToday_ && <span className="ml-1 text-[10px] font-bold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded-full">TODAY</span>}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-brand-500 transition-colors flex-shrink-0 mt-1"/>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [apptStats, setApptStats] = useState(null);
  const [visitorStats, setVisitorStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const reqs = [api.get('/appointments/stats')];
      if (['admin','receptionist','gatekeeper'].includes(user?.role)) {
        reqs.push(api.get('/visitors/stats'));
      }
      const [ar, vr] = await Promise.all(reqs);
      setApptStats(ar.data);
      if (vr) setVisitorStats(vr.data);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const as = apptStats?.stats || {};
  const vs = visitorStats?.stats || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-surface-900">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},{' '}
            <span className="text-brand-600">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-surface-500 text-sm mt-0.5">Here's what's happening at school today.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline btn-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}/>
          </button>
          {user?.role === 'parent' && (
            <Link to="/book" className="btn-brand btn-sm"><PlusCircle className="w-3.5 h-3.5"/>Book Appointment</Link>
          )}
          {user?.role === 'receptionist' && (
            <Link to="/visitors/register" className="btn-success btn-sm"><PlusCircle className="w-3.5 h-3.5"/>Register Visitor</Link>
          )}
        </div>
      </div>

      {/* Missing visitor emergency banner */}
      {visitorStats?.missingVisitors?.length > 0 && (
        <div className="bg-red-600 text-white rounded-2xl p-4 flex items-start gap-3 animate-slide-up">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5"/>
          <div className="flex-1">
            <p className="font-display font-bold">🚨 MISSING VISITOR ALERT</p>
            {visitorStats.missingVisitors.map(v => (
              <p key={v._id} className="text-sm text-red-100 mt-1">
                {v.name} · Vehicle: {v.vehicleNumber || 'N/A'} · Came to meet {v.personToMeet} · Alert: {v.missingAlertAt ? format(new Date(v.missingAlertAt), 'HH:mm') : 'N/A'}
              </p>
            ))}
          </div>
          <Link to="/visitors" className="btn-outline btn-sm !bg-white/10 !border-white/30 !text-white">View Visitors</Link>
        </div>
      )}

      {/* Appointment stats */}
      <div>
        <h2 className="font-display font-semibold text-sm text-surface-500 uppercase tracking-wider mb-3">Appointments</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Stat icon={Calendar}   label="Total"     value={as.total||0}     accent="blue"   loading={loading}/>
          <Stat icon={Clock}      label="Pending"   value={as.pending||0}   accent="amber"  loading={loading}/>
          <Stat icon={CheckCheck} label="Accepted"  value={as.accepted||0}  accent="green"  loading={loading}/>
          <Stat icon={CheckCheck} label="Completed" value={as.completed||0} accent="violet" loading={loading}/>
          <Stat icon={XCircle}    label="Declined"  value={as.declined||0}  accent="red"    loading={loading}/>
        </div>
      </div>

      {/* Visitor stats (admin/receptionist/gatekeeper) */}
      {['admin','receptionist','gatekeeper'].includes(user?.role) && (
        <div>
          <h2 className="font-display font-semibold text-sm text-surface-500 uppercase tracking-wider mb-3">Today's Visitors</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Stat icon={Users}        label="Total Today"   value={vs.todayTotal||0}      accent="blue"   loading={loading}/>
            <Stat icon={Users}        label="Checked In"    value={vs.checkedIn||0}       accent="green"  loading={loading}/>
            <Stat icon={CheckCheck}   label="Checked Out"   value={vs.checkedOut||0}      accent="cyan"   loading={loading}/>
            <Stat icon={Clock}        label="Meeting Done"  value={vs.meetingComplete||0} accent="violet" loading={loading}/>
            <Stat icon={AlertTriangle}label="Overdue"       value={vs.overdue||0}         accent="amber"  loading={loading}/>
            <Stat icon={UserX}        label="MISSING"       value={vs.missing||0}         accent="red"    loading={loading}/>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming appointments */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-surface-900">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-brand-600 hover:text-brand-700 text-xs font-semibold flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3"/>
            </Link>
          </div>
          {loading ? <PageLoader/> : apptStats?.upcoming?.length === 0 ? (
            <div className="text-center py-10 text-surface-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40"/>
              <p className="text-sm">No upcoming appointments</p>
              {user?.role === 'parent' && (
                <Link to="/book" className="btn-brand btn-sm mt-3 inline-flex"><PlusCircle className="w-3.5 h-3.5"/>Book one</Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {apptStats?.upcoming?.map(a => <UpcomingAppt key={a._id} a={a} role={user?.role}/>)}
            </div>
          )}
        </div>

        {/* Active visitors or pending appointments */}
        {['admin','receptionist','gatekeeper'].includes(user?.role) ? (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-surface-900">Active Visitors</h2>
              <Link to="/visitors" className="text-brand-600 hover:text-brand-700 text-xs font-semibold flex items-center gap-1">
                Manage <ArrowRight className="w-3 h-3"/>
              </Link>
            </div>
            {loading ? <PageLoader/> : visitorStats?.activeVisitors?.length === 0 ? (
              <div className="text-center py-10 text-surface-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40"/>
                <p className="text-sm">No active visitors on campus</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visitorStats?.activeVisitors?.map(v => (
                  <Link key={v._id} to={`/visitors/${v._id}`}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-surface-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all group">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                      ${v.status === 'missing' ? 'bg-red-100 text-red-700' : v.status === 'overdue' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {v.name.slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-surface-900 truncate">{v.name}</p>
                      <p className="text-xs text-surface-500 truncate">→ {v.personToMeet} · {v.vehicleNumber || 'No vehicle'}</p>
                    </div>
                    <StatusBadge status={v.status} type="visitor"/>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="card p-5">
            <h2 className="font-display font-bold text-surface-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {user?.role === 'parent' && [
                { label: 'Book a new appointment', to: '/book', icon: PlusCircle, color: 'text-brand-600' },
                { label: 'View all my appointments', to: '/appointments', icon: Calendar, color: 'text-emerald-600' },
              ].map(({ label, to, icon: Icon, color }) => (
                <Link key={to} to={to} className="flex items-center gap-3 p-4 rounded-xl border border-surface-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all group">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${color}`}/>
                  <span className="text-sm font-medium text-surface-700">{label}</span>
                  <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-brand-500 transition-colors ml-auto"/>
                </Link>
              ))}
              {user?.role === 'teacher' && [
                { label: 'View pending requests', to: '/appointments?status=pending', icon: Clock, color: 'text-amber-600' },
                { label: 'View accepted appointments', to: '/appointments?status=accepted', icon: CheckCheck, color: 'text-emerald-600' },
              ].map(({ label, to, icon: Icon, color }) => (
                <Link key={to} to={to} className="flex items-center gap-3 p-4 rounded-xl border border-surface-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all group">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${color}`}/>
                  <span className="text-sm font-medium text-surface-700">{label}</span>
                  <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-brand-500 transition-colors ml-auto"/>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
