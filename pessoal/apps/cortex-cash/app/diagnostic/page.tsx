'use client'

import { useEffect, useState } from 'react'

export default function DiagnosticPage() {
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `${new Date().toISOString()}: ${msg}`])
  }

  useEffect(() => {
    async function runDiagnostics() {
      addLog('🧪 Iniciando diagnósticos...')

      // Teste 1: Window
      addLog(`✅ Window existe: ${typeof window !== 'undefined'}`)

      // Teste 2: IndexedDB
      const hasIndexedDB = 'indexedDB' in window
      addLog(`${hasIndexedDB ? '✅' : '❌'} IndexedDB disponível: ${hasIndexedDB}`)

      if (!hasIndexedDB) {
        addLog('❌ PROBLEMA CRÍTICO: IndexedDB não está disponível!')
        return
      }

      // Teste 3: Listar bancos existentes
      try {
        const dbs = await indexedDB.databases()
        addLog(`✅ Bancos existentes: ${JSON.stringify(dbs.map((d) => d.name))}`)
      } catch (err) {
        addLog(`⚠️ Erro ao listar bancos: ${err}`)
      }

      // Teste 4: Deletar banco cortex-cash
      try {
        await new Promise<void>((resolve, reject) => {
          const req = indexedDB.deleteDatabase('cortex-cash')
          req.onsuccess = () => {
            addLog('✅ Banco cortex-cash deletado (se existia)')
            resolve()
          }
          req.onerror = (e) => {
            addLog(`❌ Erro ao deletar banco: ${e}`)
            reject(e)
          }
          req.onblocked = () => {
            addLog('⚠️ Deleção bloqueada - feche outras abas da aplicação')
          }
        })
      } catch (err) {
        addLog(`❌ Erro fatal ao deletar: ${err}`)
      }

      // Teste 5: Criar banco de teste
      try {
        await new Promise<void>((resolve, reject) => {
          const req = indexedDB.open('cortex-cash-diagnostic', 1)

          req.onupgradeneeded = () => {
            addLog('✅ OnUpgradeNeeded disparado')
            const db = req.result
            db.createObjectStore('test', { keyPath: 'id' })
          }

          req.onsuccess = () => {
            addLog('✅ Banco de teste criado com sucesso!')
            req.result.close()
            resolve()
          }

          req.onerror = (e) => {
            addLog(`❌ Erro ao criar banco: ${(e.target as any)?.error?.message || e}`)
            reject(e)
          }
        })
      } catch (err) {
        addLog(`❌ Erro fatal ao criar banco: ${err}`)
      }

      // Teste 6: Importar e testar Dexie
      try {
        addLog('🔄 Importando Dexie...')
        const Dexie = (await import('dexie')).default
        addLog('✅ Dexie importado')

        const testDB = new Dexie('cortex-cash-dexie-test')
        testDB.version(1).stores({
          test: 'id',
        })

        await testDB.open()
        addLog('✅ Dexie funcionando! Banco criado.')

        // Adicionar um item de teste
        try {
          await testDB.table('test').add({ id: 1, data: 'teste' })
          addLog('✅ Item de teste adicionado')
        } catch (err: any) {
          if (err?.name === 'ConstraintError') {
            addLog('⚠️ Item já existe (esperado em hot-reload)')
          } else {
            throw err
          }
        }

        // Ler item
        const item = await testDB.table('test').get(1)
        addLog(`✅ Item lido: ${JSON.stringify(item)}`)

        testDB.close()
      } catch (err) {
        addLog(`❌ Erro com Dexie: ${err}`)
        console.error('Erro Dexie detalhado:', err)
      }

      addLog('🏁 Diagnósticos concluídos!')
    }

    runDiagnostics()
  }, [])

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔬 Diagnóstico IndexedDB</h1>

        <div className="bg-card border rounded-lg p-6 space-y-2">
          <div className="font-mono text-sm space-y-1">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`${
                  log.includes('❌')
                    ? 'text-red-500'
                    : log.includes('⚠️')
                      ? 'text-yellow-500'
                      : log.includes('✅')
                        ? 'text-green-500'
                        : 'text-muted-foreground'
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => {
              setLogs([])
              window.location.reload()
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
          >
            🔄 Executar Novamente
          </button>

          <a
            href="/"
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90 inline-block"
          >
            ← Voltar ao App
          </a>
        </div>
      </div>
    </div>
  )
}
