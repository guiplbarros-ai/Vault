'use client'

import { useEffect } from 'react'

/**
 * ResizeObserver Error Suppressor
 *
 * Suprime o erro benigno "ResizeObserver loop completed with undelivered notifications"
 * que ocorre frequentemente com Recharts e componentes que mudam de tamanho rapidamente.
 *
 * Este erro não afeta a funcionalidade - é apenas um aviso do browser que o ResizeObserver
 * não conseguiu entregar todas as notificações de mudança de tamanho em um único frame.
 */
export function ResizeObserverErrorSuppressor() {
  useEffect(() => {
    // Suprime o erro do ResizeObserver no console
    const originalError = window.console.error

    window.console.error = (...args) => {
      // Filtrar erro do ResizeObserver
      if (
        args[0]?.message?.includes?.('ResizeObserver loop') ||
        args[0]?.toString?.()?.includes?.('ResizeObserver loop') ||
        (typeof args[0] === 'string' && args[0].includes('ResizeObserver loop'))
      ) {
        return
      }

      // Passar outros erros normalmente
      originalError.apply(window.console, args)
    }

    // Suprime o erro na janela também
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('ResizeObserver loop')) {
        event.stopImmediatePropagation()
        event.preventDefault()
        return true
      }
      return false
    }

    window.addEventListener('error', handleError, { capture: true })

    return () => {
      window.console.error = originalError
      window.removeEventListener('error', handleError, { capture: true })
    }
  }, [])

  return null
}
