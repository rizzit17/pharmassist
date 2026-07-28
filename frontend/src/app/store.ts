import { configureStore } from '@reduxjs/toolkit'
import complaintReducer from '@/features/complaints/complaintSlice'
import chatReducer from '@/features/copilot/chatSlice'
import authReducer from '@/features/auth/authSlice'
import themeReducer from '@/features/settings/themeSlice'

export const store = configureStore({
  reducer: {
    complaint: complaintReducer,
    chat: chatReducer,
    auth: authReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['complaint/setDraft'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
