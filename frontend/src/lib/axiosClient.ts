import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach JWT token and model routing headers
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aivoa_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const primaryModel = localStorage.getItem('aivoa_primary_model')
    const secondaryModel = localStorage.getItem('aivoa_secondary_model')
    if (primaryModel) {
      config.headers['X-Primary-Model'] = primaryModel
    }
    if (secondaryModel) {
      config.headers['X-Secondary-Model'] = secondaryModel
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: map errors to user-friendly format
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('aivoa_token')
      localStorage.removeItem('aivoa_user')
      window.location.href = '/login'
    }

    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'

    return Promise.reject(new Error(message))
  }
)

export default axiosClient
