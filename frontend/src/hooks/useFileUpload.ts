import { useCallback, useRef } from 'react'

/**
 * useFileUpload — handles file selection and drag-and-drop validation.
 */
export function useFileUpload(
  onFileSelected: (file: File) => void,
  options?: {
    allowedExtensions?: string[]
    maxSizeMB?: number
    onError?: (message: string) => void
  }
) {
  const {
    allowedExtensions = ['.pdf', '.eml', '.txt', '.png', '.jpg', '.jpeg'],
    maxSizeMB = 10,
    onError,
  } = options || {}

  const inputRef = useRef<HTMLInputElement>(null)

  const validate = useCallback(
    (file: File): boolean => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!allowedExtensions.includes(ext)) {
        onError?.(
          `File type ${ext} is not supported. Allowed: ${allowedExtensions.join(', ')}`
        )
        return false
      }
      const sizeMB = file.size / (1024 * 1024)
      if (sizeMB > maxSizeMB) {
        onError?.(`File too large (${sizeMB.toFixed(1)}MB). Max: ${maxSizeMB}MB`)
        return false
      }
      return true
    },
    [allowedExtensions, maxSizeMB, onError]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && validate(file)) {
        onFileSelected(file)
      }
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    },
    [validate, onFileSelected]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (file && validate(file)) {
        onFileSelected(file)
      }
    },
    [validate, onFileSelected]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const openFilePicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  return { inputRef, handleFileInput, handleDrop, handleDragOver, openFilePicker }
}
