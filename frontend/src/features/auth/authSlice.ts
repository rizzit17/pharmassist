import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/types/complaint'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('aivoa_user') || 'null'),
  token: localStorage.getItem('aivoa_token'),
  isAuthenticated: !!localStorage.getItem('aivoa_token'),
  isLoading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      localStorage.setItem('aivoa_token', action.payload.token)
      localStorage.setItem('aivoa_user', JSON.stringify(action.payload.user))
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      localStorage.removeItem('aivoa_token')
      localStorage.removeItem('aivoa_user')
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
  },
})

export const { setCredentials, logout, setLoading } = authSlice.actions
export default authSlice.reducer
