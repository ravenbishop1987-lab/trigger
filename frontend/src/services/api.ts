import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE = 'https://emotional-trigger-saas.onrender.com/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

/* ======================
   REQUEST INTERCEPTOR
====================== */

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/* ======================
   RESPONSE INTERCEPTOR
====================== */

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

/* ======================
   AUTH
====================== */

export const authApi = {
  register: (body: any) =>
    api.post('/auth/register', body).then((r) => r.data),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  me: () =>
    api.get('/auth/me').then((r) => r.data),
}

/* ======================
   SCORES
====================== */

export const scoresApi = {
  current: () =>
    api.get('/scores').then((r) => r.data),

  heatmap: (days: number) =>
    api.get(`/scores/heatmap`, { params: { days } }).then((r) => r.data),

  history: (months: number) =>
    api.get(`/scores/history`, { params: { months } }).then((r) => r.data),
}

/* ======================
   TRIGGERS
====================== */

export const triggersApi = {
  list: (params?: { limit?: number }) =>
    api.get('/triggers', { params }).then((r) => ({
      data: r.data,
    })),

  create: (body: any) =>
    api.post('/triggers', body).then((r) => r.data),

  update: (id: string, body: any) =>
    api.put(`/triggers/${id}`, body).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/triggers/${id}`).then((r) => r.data),
}

/* ======================
   PATTERNS
====================== */

export const patternsApi = {
  getAll: () =>
    api.get('/patterns').then((r) => r.data),
}

/* ======================
   SUMMARIES
====================== */

export const summariesApi = {
  get: () =>
    api.get('/summaries').then((r) => r.data),
}

/* ======================
   SUBSCRIPTIONS
====================== */

export const subscriptionsApi = {
  // Called by SettingsPage: checkoutMut.mutate(plan.tier)
  checkout: (tier: string) =>
    api.post('/subscriptions/checkout', { tier }).then((r) => r.data),

  // Called by SettingsPage: portalMut.mutate()
  portal: () =>
    api.post('/subscriptions/portal').then((r) => r.data),

  // Get current subscription status
  getStatus: () =>
    api.get('/subscriptions/status').then((r) => r.data),

  // Legacy method name (keep for compatibility)
  createCheckout: (tier: string) =>
    api.post('/subscriptions/checkout', { tier }).then((r) => r.data),
}

/* ======================
   RELATIONSHIPS
====================== */

export const relationshipsApi = {
  get: () =>
    api.get('/relationships').then((r) => r.data),
}
