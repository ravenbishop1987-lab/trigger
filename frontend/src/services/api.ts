import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── API helpers ────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (body: any) => api.post('/auth/register', body).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const triggersApi = {
  list: (params?: any) => api.get('/triggers', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/triggers/${id}`).then((r) => r.data),
  create: (body: any) => api.post('/triggers', body).then((r) => r.data),
  update: (id: string, body: any) => api.patch(`/triggers/${id}`, body).then((r) => r.data),
  delete: (id: string) => api.delete(`/triggers/${id}`).then((r) => r.data),
  getRegulation: (id: string) => api.post(`/triggers/${id}/regulation`).then((r) => r.data),
};

export const scoresApi = {
  current: () => api.get('/scores/current').then((r) => r.data),
  history: (weeks?: number) => api.get('/scores/history', { params: { weeks } }).then((r) => r.data),
  heatmap: (days?: number) => api.get('/scores/heatmap', { params: { days } }).then((r) => r.data),
  compute: (body?: any) => api.post('/scores/compute', body).then((r) => r.data),
};

export const patternsApi = {
  list: () => api.get('/patterns').then((r) => r.data),
  cluster: (days?: number) => api.post('/patterns/cluster', { days }).then((r) => r.data),
  escalation: () => api.get('/patterns/escalation').then((r) => r.data),
  trends: (days?: number) => api.get('/patterns/trends', { params: { days } }).then((r) => r.data),
};

export const summariesApi = {
  list: () => api.get('/summaries').then((r) => r.data),
  generate: (week_offset?: number) =>
    api.post('/summaries/generate', { week_offset }).then((r) => r.data),
};

export const subscriptionsApi = {
  status: () => api.get('/subscriptions/status').then((r) => r.data),
  checkout: (tier: string) => api.post('/subscriptions/checkout', { tier }).then((r) => r.data),
  portal: () => api.post('/subscriptions/portal').then((r) => r.data),
};
