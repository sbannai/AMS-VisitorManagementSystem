import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { connectSocket, disconnectSocket } from '../utils/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreStoredSession = () => {
      const token = localStorage.getItem('sch_token');
      const stored = localStorage.getItem('sch_user');
      if (!token || !stored) return;

      try {
        const storedUser = JSON.parse(stored);
        setUser(storedUser);
        connectSocket(storedUser._id || storedUser.id);
      } catch (_) {
        localStorage.removeItem('sch_token');
        localStorage.removeItem('sch_user');
      }
    };

    const restoreSession = async () => {
      try {
        const { data: health } = await api.get('/health');
        const dbEngine = health?.database?.engine;

        if (dbEngine !== 'mysql') {
          restoreStoredSession();
          return;
        }

        const smsSsoUrl = process.env.REACT_APP_SMS_SSO_TOKEN_URL || 'http://localhost:3000/api/v1.sms/sso/token';
        const smsResponse = await fetch(smsSsoUrl, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audience: 'ams' }),
        });

        if (!smsResponse.ok) throw new Error('SMS SSO session is not active');

        const smsData = await smsResponse.json();
        if (!smsData?.ssoToken) throw new Error('SMS SSO token is missing');

        const { data } = await api.post('/auth/sso-login', { ssoToken: smsData.ssoToken });
        localStorage.setItem('sch_token', data.token);
        localStorage.setItem('sch_user', JSON.stringify(data.user));
        setUser(data.user);
        connectSocket(data.user._id);
      } catch (_) {
        disconnectSocket();
        localStorage.removeItem('sch_token');
        localStorage.removeItem('sch_user');
        setUser(null);
      }
    };

    restoreSession().finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('sch_token', data.token);
    localStorage.setItem('sch_user',  JSON.stringify(data.user));
    setUser(data.user);
    connectSocket(data.user._id);
    return data.user;
  };

  const logout = () => {
    disconnectSocket();
    localStorage.removeItem('sch_token');
    localStorage.removeItem('sch_user');
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
