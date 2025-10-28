"use client"

/**
 * Database Provider
 * Agent CORE: Owner
 *
 * Inicializa o banco de dados SQLite no navegador e disponibiliza via Context
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDB } from '@/lib/db/client';
import { initializeSeedData } from '@/lib/db/seed';
import type { CortexCashDB } from '@/lib/db/client';

interface DBContextType {
  db: CortexCashDB | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

const DBContext = createContext<DBContextType>({
  db: null,
  isInitialized: false,
  isLoading: true,
  error: null,
});

export function useDB() {
  const context = useContext(DBContext);
  if (!context) {
    throw new Error('useDB must be used within DBProvider');
  }
  return context;
}

interface DBProviderProps {
  children: React.ReactNode;
}

export function DBProvider({ children }: DBProviderProps) {
  const [db, setDb] = useState<CortexCashDB | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Só executa no cliente
    if (typeof window === 'undefined') return;

    async function initialize() {
      try {
        console.log('🔄 Inicializando banco de dados Dexie...');

        // Inicializa Dexie (IndexedDB)
        const dbInstance = getDB();

        console.log('✅ Banco de dados Dexie inicializado');

        // Insere categorias padrão se necessário
        console.log('🔄 Verificando seed de categorias...');
        await initializeSeedData(dbInstance);

        setDb(dbInstance);
        setIsInitialized(true);
        setIsLoading(false);

        console.log('✅ Cortex Cash pronto para uso!');
      } catch (err) {
        console.error('❌ Erro ao inicializar banco de dados:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  // Tela de loading
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
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
              Inicializando banco de dados...
            </p>
          </div>
          <div className="flex justify-center">
            <div className="h-1 w-48 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela de erro
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-4 p-6">
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
            <p className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded">
              {error}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <DBContext.Provider value={{ db, isInitialized, isLoading, error }}>
      {children}
    </DBContext.Provider>
  );
}
