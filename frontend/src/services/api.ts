import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE = 'https://emotional-trigger-saas.onrender.com/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('API Error:', err.response?.data || err.message)

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
  get: () =>
    api.get('/scores').then((r) => r.data),
}

/* ======================
   TRIGGERS
====================== */

export const triggersApi = {
  getAll: () =>
    api.get('/triggers').then((r) => r.data),

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
  createCheckout: (priceId: string) =>
    api.post('/subscriptions/checkout', { priceId }).then((r) => r.data),

  getStatus: () =>
    api.get('/subscriptions/status').then((r) => r.data),
}

/* ======================
   RELATIONSHIPS
====================== */

export const relationshipsApi = {
  get: () =>
    api.get('/relationships').then((r) => r.data),
}