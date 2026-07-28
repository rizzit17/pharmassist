import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ThemeState {
  isDark: boolean
}

const initialDark = saved === 'dark'

const initialState: ThemeState = {
  isDark: initialDark,
}

// Apply immediately on load
if (initialDark) {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.isDark = !state.isDark
      if (state.isDark) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('aivoa_theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('aivoa_theme', 'light')
      }
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.isDark = action.payload === 'dark'
      if (state.isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      localStorage.setItem('aivoa_theme', action.payload)
    },
  },
})

export const { toggleTheme, setTheme } = themeSlice.actions
export default themeSlice.reducer
