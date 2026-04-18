import axios from 'axios';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const WS   = process.env.REACT_APP_WS_URL  || 'http://localhost:5000';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sch_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    const msg = err.response?.data?.message || 'Network error';
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    } else {
      toast.error(msg);
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Socket singleton ─────────────────────────────────────────────────────────
let socket = null;
const listeners = new Map();

export function connectSocket(userId) {
  if (socket?.connected) return socket;
  socket = io(WS, { withCredentials: true, transports: ['websocket','polling'] });
  socket.on('connect',    () => { socket.emit('authenticate', userId); });
  socket.on('notification', data => {
    listeners.forEach(fn => fn(data));
  });
  return socket;
}

export function subscribeSocket(key, fn) { listeners.set(key, fn); }
export function unsubscribeSocket(key)   { listeners.delete(key); }
export function disconnectSocket()       { socket?.disconnect(); socket = null; }
export function getSocket()              { return socket; }
