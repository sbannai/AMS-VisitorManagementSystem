import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Login            from './pages/Login';
import Layout           from './pages/Layout';
import Dashboard        from './pages/Dashboard';
import BookAppointment  from './pages/BookAppointment';
import { AppointmentList, AppointmentDetail } from './pages/Appointments';
import { VisitorList, VisitorDetail }          from './pages/Visitors';
import RegisterVisitor  from './pages/RegisterVisitor';
import { PageLoader }   from './components/common/UI';

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><PageLoader/></div>;
  return user ? children : <Navigate to="/login" replace/>;
}

function GuestGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><PageLoader/></div>;
  return !user ? children : <Navigate to="/" replace/>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<GuestGuard><Login/></GuestGuard>}/>
      <Route path="/" element={<Guard><Layout/></Guard>}>
        <Route index element={<Dashboard/>}/>

        {/* Appointments */}
        <Route path="appointments"    element={<AppointmentList/>}/>
        <Route path="appointments/:id" element={<AppointmentDetail/>}/>
        <Route path="book"            element={<BookAppointment/>}/>

        {/* Visitors */}
        <Route path="visitors"           element={<VisitorList/>}/>
        <Route path="visitors/register"  element={<RegisterVisitor/>}/>
        <Route path="visitors/:id"       element={<VisitorDetail/>}/>
      </Route>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes/>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '13px',
              background: '#0f172a',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#0f172a' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#0f172a' }, duration: 6000 },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
