import axios from 'axios'

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl
  }
  // When running on Vercel or remote host, default directly to live Render backend
  if (
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1')
  ) {
    return 'https://aivoa-backend-5t5q.onrender.com/api/v1'
  }
  return '/api/v1'
}

const BASE_URL = getBaseUrl()

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
    const isAuthRoute = config.url?.includes('/auth/login') || config.url?.includes('/auth/demo')
    const token = localStorage.getItem('aivoa_token')
    if (token && !isAuthRoute) {
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
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
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
