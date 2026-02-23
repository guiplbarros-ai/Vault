'use client'

import { getSupabaseBrowserClient } from '@/lib/db/supabase'
import { useEffect, useState } from 'react'

export default function DiagnosticPage() {
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `${new Date().toISOString()}: ${msg}`])
  }

  useEffect(() => {
    async function runDiagnostics() {
      addLog('Iniciando diagnósticos...')

      // Teste 1: Window
      addLog(`Window existe: ${typeof window !== 'undefined'}`)

      // Teste 2: Supabase client
      try {
        const supabase = getSupabaseBrowserClient()
        addLog('Supabase client criado com sucesso')

        // Teste 3: Sessão de autenticação
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          addLog(`ERRO ao verificar sessão: ${sessionError.message}`)
        } else if (session) {
          addLog(`Sessão ativa: user=${session.user.email}`)
        } else {
          addLog('Nenhuma sessão ativa (não autenticado)')
        }

        // Teste 4: Conectividade com o banco
        const { data: instData, error: instError } = await supabase
          .from('instituicoes')
          .select('*', { count: 'exact', head: true })

        if (instError) {
          addLog(`ERRO ao consultar instituicoes: ${instError.message} (code: ${instError.code})`)
        } else {
          addLog(`Tabela instituicoes acessível`)
        }

        const { data: contasData, error: contasError } = await supabase
          .from('contas')
          .select('*', { count: 'exact', head: true })

        if (contasError) {
          addLog(`ERRO ao consultar contas: ${contasError.message} (code: ${contasError.code})`)
        } else {
          addLog(`Tabela contas acessível`)
        }

        const { data: txData, error: txError } = await supabase
          .from('transacoes')
          .select('*', { count: 'exact', head: true })

        if (txError) {
          addLog(`ERRO ao consultar transacoes: ${txError.message} (code: ${txError.code})`)
        } else {
          addLog(`Tabela transacoes acessível`)
        }

        const { data: catData, error: catError } = await supabase
          .from('categorias')
          .select('*', { count: 'exact', head: true })

        if (catError) {
          addLog(`ERRO ao consultar categorias: ${catError.message} (code: ${catError.code})`)
        } else {
          addLog(`Tabela categorias acessível`)
        }

        // Teste 5: Variáveis de ambiente
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        addLog(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'definido' : 'AUSENTE'}`)
        addLog(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey ? 'definido' : 'AUSENTE'}`)

      } catch (err) {
        addLog(`ERRO fatal: ${err}`)
        console.error('Erro detalhado:', err)
      }

      addLog('Diagnósticos concluídos!')
    }

    runDiagnostics()
  }, [])

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Diagnóstico Supabase</h1>

        <div className="bg-card border rounded-lg p-6 space-y-2">
          <div className="font-mono text-sm space-y-1">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`${
                  log.includes('ERRO')
                    ? 'text-red-500'
                    : log.includes('AUSENTE')
                      ? 'text-yellow-500'
                      : log.includes('sucesso') || log.includes('acessível') || log.includes('ativa')
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
            Executar Novamente
          </button>

          <a
            href="/"
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90 inline-block"
          >
            Voltar ao App
          </a>
        </div>
      </div>
    </div>
  )
}
