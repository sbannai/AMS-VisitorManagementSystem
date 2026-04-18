import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeSocket, unsubscribeSocket } from '../utils/api';
import api from '../utils/api';
import {
  LayoutDashboard, Calendar, PlusCircle, Users, UserCheck, Bell,
  LogOut, Menu, X, ChevronRight, School, AlertTriangle
} from 'lucide-react';
import { Avatar } from '../components/common/UI';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ROLE_NAV = {
  admin: [
    { to: '/',            icon: LayoutDashboard, label: 'Dashboard',     end: true },
    { to: '/appointments',icon: Calendar,        label: 'Appointments' },
    { to: '/visitors',    icon: Users,           label: 'Visitors' },
    { to: '/users',       icon: UserCheck,       label: 'Staff & Users' },
  ],
  receptionist: [
    { to: '/',            icon: LayoutDashboard, label: 'Dashboard',     end: true },
    { to: '/appointments',icon: Calendar,        label: 'Appointments' },
    { to: '/visitors',    icon: Users,           label: 'Visitors' },
    { to: '/visitors/register', icon: PlusCircle, label: 'Register Visitor' },
  ],
  gatekeeper: [
    { to: '/',            icon: LayoutDashboard, label: 'Dashboard',     end: true },
    { to: '/visitors',    icon: Users,           label: 'Active Visitors' },
  ],
  teacher: [
    { to: '/',            icon: LayoutDashboard, label: 'Dashboard',     end: true },
    { to: '/appointments',icon: Calendar,        label: 'My Appointments' },
  ],
  parent: [
    { to: '/',            icon: LayoutDashboard, label: 'Dashboard',     end: true },
    { to: '/appointments',icon: Calendar,        label: 'My Appointments' },
    { to: '/book',        icon: PlusCircle,      label: 'Book Appointment' },
  ],
};

const ROLE_COLOR = {
  admin:        'bg-violet-100 text-violet-700',
  receptionist: 'bg-amber-100 text-amber-700',
  gatekeeper:   'bg-cyan-100 text-cyan-700',
  teacher:      'bg-emerald-100 text-emerald-700',
  parent:       'bg-brand-100 text-brand-700',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [missingAlerts, setMissingAlerts] = useState([]);

  const loadNotifs = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnread(data.unread);
      setMissingAlerts(data.notifications.filter(n => n.type === 'visitor_missing' && !n.isRead));
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadNotifs();

    subscribeSocket('layout', ({ notification }) => {
      if (!notification) return;
      setNotifications(prev => [notification, ...prev.slice(0, 49)]);
      setUnread(u => u + 1);

      if (notification.type === 'visitor_missing') {
        setMissingAlerts(prev => [notification, ...prev]);
        toast.error(`🚨 ${notification.title}`, { duration: 8000, position: 'top-center' });
      } else if (notification.priority === 'urgent' || notification.priority === 'high') {
        toast(`🔔 ${notification.title}`, { duration: 5000 });
      }
    });

    return () => unsubscribeSocket('layout');
  }, [loadNotifs]);

  const markRead = async () => {
    await api.patch('/notifications/read').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
    setMissingAlerts([]);
  };

  const doLogout = () => { logout(); nav('/login'); };
  const links = ROLE_NAV[user?.role] || [];

  return (
    <div className="flex h-screen bg-surface-50 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-14'} bg-white border-r border-surface-100 flex flex-col transition-all duration-200 ease-out flex-shrink-0 z-20 shadow-sm`}>
        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-4 py-4 border-b border-surface-100 min-h-[64px] ${!sidebarOpen && 'justify-center px-2'}`}>
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <School className="w-4 h-4 text-white"/>
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-sm text-surface-900 truncate">SchoolERP</p>
              <p className="text-xs text-surface-400 truncate">Management System</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(s => !s)}
            className="p-1 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors flex-shrink-0">
            {sidebarOpen ? <X className="w-3.5 h-3.5"/> : <Menu className="w-3.5 h-3.5"/>}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'} ${!sidebarOpen && 'justify-center !px-2'}`}
              title={!sidebarOpen ? label : undefined}>
              {({ isActive }) => (
                <>
                  <Icon className="w-4 h-4 flex-shrink-0"/>
                  {sidebarOpen && <span className="truncate">{label}</span>}
                  {sidebarOpen && isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60"/>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-2 border-t border-surface-100">
          {sidebarOpen ? (
            <div className="px-3 py-2 flex items-center gap-2.5 mb-1">
              <Avatar name={user?.name || '?'} size="sm" index={0}/>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-surface-800 truncate">{user?.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold capitalize ${ROLE_COLOR[user?.role] || ''}`}>{user?.role}</span>
              </div>
            </div>
          ) : null}
          <button onClick={doLogout}
            className={`nav-link nav-link-inactive w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 ${!sidebarOpen && 'justify-center !px-2'}`}
            title={!sidebarOpen ? 'Sign Out' : undefined}>
            <LogOut className="w-4 h-4 flex-shrink-0"/>
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-surface-100 px-6 py-3 flex items-center justify-between min-h-[64px] sticky top-0 z-10 shadow-sm">
          <div>
            <p className="font-display font-bold text-surface-900 text-sm">
              {user?.role === 'teacher' ? `${user.name} · ${user.subject}` :
               user?.role === 'parent'  ? `Parent of ${user.childName || 'student'}` :
               user?.name}
            </p>
            <p className="text-xs text-surface-400 capitalize">{user?.role} · {format(new Date(), 'EEEE, dd MMM yyyy')}</p>
          </div>

          {/* Missing visitor urgent banner */}
          {missingAlerts.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5"/>
              {missingAlerts.length} MISSING VISITOR{missingAlerts.length > 1 ? 'S' : ''}
            </div>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button onClick={() => { setNotifOpen(o => !o); if (!notifOpen) markRead(); }}
              className="relative btn-icon">
              <Bell className="w-4 h-4"/>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-modal border border-surface-100 z-50 animate-slide-up overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
                  <p className="font-display font-bold text-sm text-surface-900">Notifications</p>
                  <button onClick={() => setNotifOpen(false)} className="btn-ghost !p-1"><X className="w-3.5 h-3.5"/></button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-surface-400 text-sm">No notifications</div>
                  ) : notifications.slice(0, 20).map(n => (
                    <div key={n._id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-surface-50 hover:bg-surface-50 transition-colors ${!n.isRead ? 'bg-brand-50/50' : ''}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 priority-${n.priority}`}/>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${n.type === 'visitor_missing' ? 'text-red-700' : 'text-surface-800'}`}>{n.title}</p>
                        <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-surface-400 mt-1">{format(new Date(n.createdAt), 'dd MMM, HH:mm')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            <Outlet/>
          </div>
        </main>
      </div>
    </div>
  );
}
