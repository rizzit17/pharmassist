import { useEffect, useRef } from 'react'

/**
 * useAutoScroll - always scrolls a container to the bottom when content changes.
 * Used by the chat panel to keep latest messages in view.
 */
export function useAutoScroll<T extends HTMLElement>(content: unknown) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [content])

  return ref
}
