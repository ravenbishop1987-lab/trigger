import axios from 'axios'

const API_BASE = 'https://emotional-trigger-saas.onrender.com/api'

export const authApi = {
  register: async (body: any) => {
    const response = await axios.post(
      `${API_BASE}/auth/register`,
      body
    )
    return response.data
  },

  login: async (email: string, password: string) => {
    const response = await axios.post(
      `${API_BASE}/auth/login`,
      { email, password }
    )
    return response.data
  }
}