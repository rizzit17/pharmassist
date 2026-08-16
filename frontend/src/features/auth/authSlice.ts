import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/types/complaint'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('pharmassist_user') || 'null'),
  token: localStorage.getItem('pharmassist_token'),
  isAuthenticated: !!localStorage.getItem('pharmassist_token'),
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
      localStorage.setItem('pharmassist_token', action.payload.token)
      localStorage.setItem('pharmassist_user', JSON.stringify(action.payload.user))
    },
    updateUser: (state, action: PayloadAction<{ name?: string; role?: string }>) => {
      if (state.user) {
        if (action.payload.name !== undefined) state.user.name = action.payload.name
        if (action.payload.role !== undefined) state.user.role = action.payload.role
        localStorage.setItem('pharmassist_user', JSON.stringify(state.user))
      }
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      localStorage.removeItem('pharmassist_token')
      localStorage.removeItem('pharmassist_user')
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
  },
})

export const { setCredentials, updateUser, logout, setLoading } = authSlice.actions
export default authSlice.reducer
