import axios from 'axios'

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl) return envUrl
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
    const token = localStorage.getItem('pharmassist_token')
    if (token && !isAuthRoute) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const primaryModel = localStorage.getItem('pharmassist_primary_model')
    const secondaryModel = localStorage.getItem('pharmassist_secondary_model')
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
      localStorage.removeItem('pharmassist_token')
      localStorage.removeItem('pharmassist_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    const detail = error.response?.data?.detail
    const validationMessage = Array.isArray(detail)
      ? detail.map((item: { loc?: (string | number)[]; msg?: string }) =>
          `${item.loc?.slice(1).join('.') || 'Request'}: ${item.msg || 'Invalid value'}`
        ).join('; ')
      : detail
    const message =
      validationMessage ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'

    return Promise.reject(new Error(message))
  }
)

export default axiosClient
