import { useState, useCallback } from 'react'

export interface UseCopyToClipboardReturn {
  isCopied: boolean
  copyToClipboard: (text: string) => Promise<boolean>
}

/**
 * Hook for copying text to clipboard
 * @param timeout - Time in ms before resetting isCopied state (default: 2000)
 * @returns Object with isCopied state and copyToClipboard function
 */
export function useCopyToClipboard(timeout: number = 2000): UseCopyToClipboardReturn {
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = useCallback(
    async (text: string): Promise<boolean> => {
      if (!navigator?.clipboard) {
        console.warn('Clipboard API not available')
        return false
      }

      try {
        await navigator.clipboard.writeText(text)
        setIsCopied(true)

        setTimeout(() => {
          setIsCopied(false)
        }, timeout)

        return true
      } catch (error) {
        console.warn('Failed to copy text:', error)
        setIsCopied(false)
        return false
      }
    },
    [timeout]
  )

  return { isCopied, copyToClipboard }
}
