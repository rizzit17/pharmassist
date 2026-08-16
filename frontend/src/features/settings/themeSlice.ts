import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ThemeState {
  isDark: boolean
}

// Clear legacy key to ensure Light Mode default on existing sessions
if (typeof window !== 'undefined') {
  if (!localStorage.getItem('pharmassist_theme_v2')) {
    localStorage.removeItem('pharmassist_theme')
    localStorage.setItem('pharmassist_theme_v2', 'light')
  }
}

const saved = typeof window !== 'undefined' ? localStorage.getItem('pharmassist_theme_v2') : 'light'
const initialDark = saved === 'dark'

const initialState: ThemeState = {
  isDark: initialDark,
}

// Apply immediately on script execution
if (typeof document !== 'undefined') {
  if (initialDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.isDark = !state.isDark
      if (state.isDark) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('pharmassist_theme_v2', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('pharmassist_theme_v2', 'light')
      }
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.isDark = action.payload === 'dark'
      if (state.isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      localStorage.setItem('pharmassist_theme_v2', action.payload)
    },
  },
})

export const { toggleTheme, setTheme } = themeSlice.actions
export default themeSlice.reducer
