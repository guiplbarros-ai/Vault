'use client'

/**
 * Database Provider
 * Agent CORE: Owner
 *
 * Inicializa o banco de dados SQLite no navegador e disponibiliza via Context
 */

import { getDB } from '@/lib/db/client'
import type { CortexCashDB } from '@/lib/db/client'
import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

// Importa debug helpers (apenas em dev) - com tratamento de erro
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  import('@/lib/db/debug').catch((err) => {
    console.warn('⚠️ Não foi possível carregar debug helpers:', err)
  })
}

interface DBContextType {
  db: CortexCashDB | null
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
  const [db, setDb] = useState<CortexCashDB | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpeningDB, setIsOpeningDB] = useState(false)

  useEffect(() => {
    // Só executa no cliente
    if (typeof window === 'undefined') return

    let timeoutId: ReturnType<typeof setTimeout>
    let longOpenId: ReturnType<typeof setTimeout>

    let timedOut = false

    async function initialize() {
      try {
        console.log('🔄 Inicializando banco de dados Dexie...')

        // Timeout de 10 segundos para detectar travamentos
        timeoutId = setTimeout(() => {
          console.error('❌ Timeout na inicialização do banco de dados')
          timedOut = true
          setError('Timeout ao inicializar banco de dados. Tente recarregar a página.')
          setIsLoading(false)
        }, 10000)

        // Verificação síncrona básica (não bloqueia)
        const { checkIndexedDBSupport, checkIndexedDBSupportAsync } = await import(
          '@/lib/db/client'
        )
        const basicSupport = checkIndexedDBSupport()
        if (!basicSupport.supported) {
          throw new Error(basicSupport.error || 'IndexedDB não está disponível neste navegador')
        }

        // Dispara verificação assíncrona COMPLETA em background (Safari modo privado, etc.)
        // Não bloqueia a UI — apenas reporta erro se detectar bloqueio.
        checkIndexedDBSupportAsync()
          .then((support) => {
            if (!support.supported) {
              setError(
                support.error || 'IndexedDB pode estar bloqueado (modo privado ou configurações)'
              )
            }
          })
          .catch(() => {
            // Silencia erros não críticos desta verificação
          })

        // Inicializa Dexie (IndexedDB) imediatamente após checagem básica
        const dbInstance = getDB()
        // Aguarda abertura/migrações para evitar telas internas ficarem em "loading infinito"
        setIsOpeningDB(true)
        // Se abrir demorar, mostramos ao usuário que está migrando
        longOpenId = setTimeout(() => {
          console.log('⏳ Abertura/migração do banco demorando...')
        }, 1200)
        await dbInstance.open()
        clearTimeout(longOpenId)
        setIsOpeningDB(false)

        console.log('✅ Banco de dados Dexie inicializado')

        // Cancela o timeout
        clearTimeout(timeoutId)

        // Só atualiza state se não tiver dado timeout
        if (!timedOut) {
          // Libera a UI IMEDIATAMENTE
          setDb(dbInstance)
          setIsInitialized(true)
          setIsLoading(false)
        }

        console.log('✅ Cortex Cash pronto para uso!')
      } catch (err) {
        console.error('❌ Erro ao inicializar banco de dados:', err)
        clearTimeout(timeoutId)
        // Só atualiza state se não tiver dado timeout
        if (!timedOut) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido')
          setIsLoading(false)
        }
      }
    }

    initialize()

    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (longOpenId) clearTimeout(longOpenId)
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
            <p className="text-sm text-muted-foreground mt-2">
              {isOpeningDB
                ? 'Abrindo/migrando banco de dados...'
                : 'Inicializando banco de dados...'}
            </p>
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
    const handleClearCache = async () => {
      if (!confirm('⚠️ Isso vai limpar TODOS os seus dados. Deseja continuar?')) {
        return
      }

      try {
        // Limpa IndexedDB
        if ('indexedDB' in window) {
          await indexedDB.deleteDatabase('cortex-cash')
        }

        // Limpa localStorage
        localStorage.clear()

        // Recarrega
        window.location.reload()
      } catch (err) {
        alert('Erro ao limpar cache. Tente limpar manualmente nas configurações do navegador.')
        console.error(err)
      }
    }

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
            <h2 className="text-xl font-bold text-destructive">Erro ao Inicializar</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Não foi possível inicializar o banco de dados.
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
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:opacity-90 transition"
            >
              Limpar Cache e Reiniciar
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Dica: Verifique se o IndexedDB está habilitado no seu navegador
          </p>
        </div>
      </div>
    )
  }

  return (
    <DBContext.Provider value={{ db, isInitialized, isLoading, error }}>
      {children}
    </DBContext.Provider>
  )
}
