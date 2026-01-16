/**
 * Hook para gerenciar o estado do banco de dados
 */

import { initializeDatabase } from '@/lib/db/initialize'
import { useEffect, useState } from 'react'

export function useDatabase() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true)
        await initializeDatabase()
        setIsInitialized(true)
      } catch (err) {
        setError(err as Error)
        console.error('Erro ao inicializar banco:', err)
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  return { isInitialized, isLoading, error }
}
