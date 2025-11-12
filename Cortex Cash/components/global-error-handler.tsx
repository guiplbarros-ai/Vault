'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

/**
 * Global Error Handler component
 *
 * Responsabilidade: Agent CORE (Infraestrutura)
 *
 * Captura erros não tratados:
 * - window.onerror (JavaScript errors)
 * - window.onunhandledrejection (Promise rejections)
 *
 * Features:
 * - Toast notifications para erros
 * - Logging estruturado
 * - Prevenção de crash total
 * - Feedback ao usuário
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    // Armazenar referência ao console.error original para evitar loops
    const originalConsoleError = console.error

    // Flag para prevenir recursão infinita
    let isHandlingError = false

    // Handler para erros JavaScript não capturados
    const handleError = (event: ErrorEvent) => {
      // Prevenir recursão
      if (isHandlingError) {
        return
      }

      // Ignorar erros benignos do ResizeObserver (comum em gráficos/recharts)
      if (event.message?.includes('ResizeObserver loop')) {
        return
      }

      // Ignorar erros do próprio GlobalErrorHandler para evitar loops
      if (event.message?.includes('[GlobalErrorHandler]')) {
        return
      }

      event.preventDefault()
      isHandlingError = true

      // Usar console.error original para evitar triggerar o handler novamente
      originalConsoleError('[GlobalErrorHandler] Uncaught error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      })

      // Mostrar toast apenas se não for um erro de rede comum
      if (!event.message.includes('Failed to fetch') && !event.message.includes('NetworkError')) {
        toast.error('Erro Inesperado', {
          description: 'Algo deu errado. Tente novamente.',
          duration: 5000,
        })
      }

      // Log no localStorage
      logError({
        type: 'uncaught_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString(),
      })

      isHandlingError = false
    }

    // Handler para Promises rejeitadas não tratadas
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevenir recursão
      if (isHandlingError) {
        return
      }

      event.preventDefault()
      isHandlingError = true

      // Usar console.error original para evitar triggerar o handler novamente
      originalConsoleError('[GlobalErrorHandler] Unhandled promise rejection:', {
        reason: event.reason,
        promise: event.promise,
      })

      // Extrair mensagem da razão
      const message =
        typeof event.reason === 'string'
          ? event.reason
          : event.reason?.message || 'Promise rejection'

      // Mostrar toast apenas se não for um erro de rede comum
      if (!message.includes('Failed to fetch') && !message.includes('NetworkError')) {
        toast.error('Erro de Operação', {
          description: 'Não foi possível completar a operação. Tente novamente.',
          duration: 5000,
        })
      }

      // Log no localStorage
      logError({
        type: 'unhandled_rejection',
        reason: event.reason?.toString(),
        message,
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
      })

      isHandlingError = false
    }

    // Registrar handlers
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Este component não renderiza nada
  return null
}

/**
 * Função auxiliar para salvar logs de erro no localStorage
 */
function logError(errorData: any) {
  try {
    const key = 'global_error_logs'
    const existingLogs = JSON.parse(localStorage.getItem(key) || '[]')

    // Adicionar novo log
    existingLogs.push(errorData)

    // Manter apenas os últimos 20 erros
    const recentLogs = existingLogs.slice(-20)

    // Salvar
    localStorage.setItem(key, JSON.stringify(recentLogs))
  } catch (e) {
    // Se não conseguir salvar, apenas logar no console
    console.error('Failed to save error log:', e)
  }
}

/**
 * Função utilitária para acessar logs de erro salvos
 * Útil para debugging e análise
 */
export function getErrorLogs(): any[] {
  try {
    // Combinar logs de ErrorBoundary e GlobalErrorHandler
    const boundaryLogs = JSON.parse(localStorage.getItem('error_logs') || '[]')
    const globalLogs = JSON.parse(localStorage.getItem('global_error_logs') || '[]')

    return [
      ...boundaryLogs.map((log: any) => ({ ...log, source: 'ErrorBoundary' })),
      ...globalLogs.map((log: any) => ({ ...log, source: 'GlobalErrorHandler' })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  } catch (e) {
    console.error('Failed to get error logs:', e)
    return []
  }
}

/**
 * Função utilitária para limpar logs de erro
 * Útil para testes ou limpeza periódica
 */
export function clearErrorLogs() {
  try {
    localStorage.removeItem('error_logs')
    localStorage.removeItem('global_error_logs')
    console.log('[ErrorLogs] Logs cleared successfully')
  } catch (e) {
    console.error('Failed to clear error logs:', e)
  }
}
