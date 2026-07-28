import { useState, useEffect } from 'react'

/**
 * useHighlightOnChange — returns whether a field is currently highlighted (recently updated by AI).
 * @param fieldName - the field name to check
 * @param updatedFields - list of fields updated in the last AI response
 * @param durationMs - how long to show the highlight (default 3000ms)
 */
export function useHighlightOnChange(
  fieldName: string,
  updatedFields: string[],
  durationMs = 3000
): boolean {
  const [isHighlighted, setIsHighlighted] = useState(false)

  useEffect(() => {
    if (updatedFields.includes(fieldName)) {
      setIsHighlighted(true)
      const timer = setTimeout(() => setIsHighlighted(false), durationMs)
      return () => clearTimeout(timer)
    }
  }, [updatedFields, fieldName, durationMs])

  return isHighlighted
}
