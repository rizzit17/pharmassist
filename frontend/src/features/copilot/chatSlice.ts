import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ChatMessage } from '@/types/copilot'
import { v4 as uuidv4 } from 'uuid'

interface ChatState {
  messages: ChatMessage[]
  sessionId: string | null
  isProcessing: boolean
  uploadProgress: number | null
  error: string | null
}

const initialState: ChatState = {
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I\'m the PharmAssist Copilot. You can describe a customer complaint in plain language, or upload a PDF/email document - I\'ll extract the structured data and populate the form automatically.\n\nTo get started, type a complaint description or drag & drop a file.',
      timestamp: new Date().toISOString(),
    },
  ],
  sessionId: null,
  isProcessing: false,
  uploadProgress: null,
  error: null,
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addUserMessage: (
      state,
      action: PayloadAction<{ content: string; attachedFileName?: string }>
    ) => {
      state.messages.push({
        id: uuidv4(),
        role: 'user',
        content: action.payload.content,
        timestamp: new Date().toISOString(),
        attachedFileName: action.payload.attachedFileName,
        isFileUpload: !!action.payload.attachedFileName,
      })
    },

    addProcessingIndicator: (state) => {
      state.messages.push({
        id: 'processing',
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isProcessing: true,
      })
      state.isProcessing = true
    },

    addFileProgressMessage: (state, action: PayloadAction<{ fileName: string; progress: number }>) => {
      const existing = state.messages.find((m) => m.id === 'file-progress')
      if (existing) {
        existing.progressValue = action.payload.progress
      } else {
        state.messages.push({
          id: 'file-progress',
          role: 'assistant',
          content: `Processing ${action.payload.fileName}...`,
          timestamp: new Date().toISOString(),
          isProcessing: true,
          progressValue: action.payload.progress,
        })
      }
      state.uploadProgress = action.payload.progress
    },

    addAssistantMessage: (state, action: PayloadAction<string>) => {
      // Remove processing indicator
      state.messages = state.messages.filter(
        (m) => m.id !== 'processing' && m.id !== 'file-progress'
      )
      state.messages.push({
        id: uuidv4(),
        role: 'assistant',
        content: action.payload,
        timestamp: new Date().toISOString(),
      })
      state.isProcessing = false
      state.uploadProgress = null
    },

    setProcessingError: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(
        (m) => m.id !== 'processing' && m.id !== 'file-progress'
      )
      state.messages.push({
        id: uuidv4(),
        role: 'assistant',
        content: action.payload,
        timestamp: new Date().toISOString(),
      })
      state.isProcessing = false
      state.uploadProgress = null
      state.error = action.payload
    },

    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload
    },

    clearError: (state) => {
      state.error = null
    },

    resetChat: () => initialState,
  },
})

export const {
  addUserMessage,
  addProcessingIndicator,
  addFileProgressMessage,
  addAssistantMessage,
  setProcessingError,
  setSessionId,
  clearError,
  resetChat,
} = chatSlice.actions

export default chatSlice.reducer
