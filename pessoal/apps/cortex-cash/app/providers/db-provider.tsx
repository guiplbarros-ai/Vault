'use client'

/**
 * Database Provider
 * Agent CORE: Owner
 *
 * Verifica a conexão com o Supabase e disponibiliza status via Context.
 */

import { getSupabase } from '@/lib/db/supabase'
import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

interface DBContextType {
  isInitialized: boolean
  isLoading: boolean
  error: string | null
}

const DBContext = createContext<DBContextType | undefined>(undefined)

export function useDB() {
  const context = useContext(DBContext)
  if (!context) {
    throw new Error('useDB must be used within DBProvider')
  }
  return context
}

interface DBProviderProps {
  children: React.ReactNode
}

export function DBProvider({ children }: DBProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Só executa no cliente
    if (typeof window === 'undefined') return

    let cancelled = false

    async function initialize() {
      try {
        console.log('[DBProvider] Verificando conexão com Supabase...')

        const supabase = getSupabase()

        // Timeout de 10 segundos para detectar falhas de conexão
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout ao conectar ao Supabase')), 10000)
        )

        // Ping: busca a sessão atual como verificação de conectividade
        const checkPromise = supabase.auth.getSession()

        await Promise.race([checkPromise, timeoutPromise])

        if (!cancelled) {
          console.log('[DBProvider] Conexão com Supabase OK')
          setIsInitialized(true)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('[DBProvider] Erro ao conectar ao Supabase:', err)
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido')
          setIsLoading(false)
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [])

  // Tela de loading
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="Cortex Cash"
              className="h-20 w-20 object-contain animate-pulse"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary">Cortex Cash</h2>
            <p className="text-sm text-muted-foreground mt-2">Conectando ao banco de dados...</p>
          </div>
          <div className="flex justify-center">
            <div className="h-1 w-48 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Tela de erro
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-6 p-6">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="Cortex Cash"
              className="h-20 w-20 object-contain opacity-50"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-destructive">Erro ao Conectar</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Não foi possível conectar ao banco de dados.
            </p>
            <p className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded font-mono">
              {error}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition"
            >
              Tentar Novamente
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Dica: Verifique sua conexão com a internet e tente novamente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DBContext.Provider value={{ isInitialized, isLoading, error }}>
      {children}
    </DBContext.Provider>
  )
}
