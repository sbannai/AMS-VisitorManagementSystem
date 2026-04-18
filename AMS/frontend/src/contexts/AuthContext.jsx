import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { connectSocket, disconnectSocket } from '../utils/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('sch_user');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      connectSocket(u._id);
    }
    setLoading(false);
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
