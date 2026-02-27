import axios from 'axios'
import { useAuthStore } from '../store/authStore'

/*
  PRODUCTION FIX
  We are HARD-CODING the backend API base URL
  to eliminate Vite env injection issues.
*/

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://emotional-trigger-saas.onrender.com/api'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle expired token
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

// AUTH
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  register: (body: any) =>
    api.post('/auth/register', body).then((r) => r.data),

  me: () =>
    api.get('/auth/me').then((r) => r.data),
}