'use client'

/**
 * Auto-Categorização
 *
 * 4-step pipeline:
 * 0. Reclassificar tipos (transferências detectadas por padrão)
 * 1. Criar regras de classificação (fonte: classification-rules.ts)
 * 2. Aplicar regras nas transações
 * 3. AI classification para restantes
 */

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  CLASSIFICATION_RULES,
  assignPriorities,
} from '@/lib/constants/classification-rules'
import { getDB } from '@/lib/db/client'
import { getCurrentUserId } from '@/lib/db/seed-usuarios'
import { matchTypeReclassRule } from '@/lib/pluggy/transaction-type-rules'
import { logger } from '@/lib/utils/logger'
import { Play, CheckCircle, AlertCircle } from 'lucide-react'

// =============================================================================
// Tipos
// =============================================================================

interface Stats {
  tiposReclassificados: number
  regrasCriadas: number
  transacoesCategorizadas: number
  classificadasPorAI: number
  semCategoria: number
}

interface AutoCategorizeProps {
  onComplete?: () => void
}

// =============================================================================
// Componente
// =============================================================================

export function AutoCategorize({ onComplete }: AutoCategorizeProps) {
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState<
    'idle' | 'reclassify' | 'rules' | 'applying' | 'ai' | 'done'
  >('idle')
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-50), msg])
  }, [])

  const handleRun = useCallback(async () => {
    setRunning(true)
    setError(null)
    setLogs([])
    setStats(null)

    const stats: Stats = {
      tiposReclassificados: 0,
      regrasCriadas: 0,
      transacoesCategorizadas: 0,
      classificadasPorAI: 0,
      semCategoria: 0,
    }

    try {
      const db = getDB()
      const usuarioId = getCurrentUserId()

      // =====================================================================
      // STEP 0: Reclassificar tipos de transação
      // =====================================================================
      setStep('reclassify')
      addLog('🔄 Reclassificando tipos de transação...')

      const pluggyTransactions = await db.transacoes
        .filter((t) => t.origem_arquivo === 'pluggy' && t.tipo !== 'transferencia')
        .toArray()

      addLog(`  📊 ${pluggyTransactions.length} transações Pluggy para verificar`)

      for (const tx of pluggyTransactions) {
        const newType = matchTypeReclassRule(tx.descricao)
        if (newType && newType !== tx.tipo) {
          await db.transacoes.update(tx.id, {
            tipo: newType,
            updated_at: new Date(),
          })
          stats.tiposReclassificados++
        }
      }

      addLog(`  ✓ ${stats.tiposReclassificados} transações reclassificadas como transferência`)
      setProgress(10)

      // =====================================================================
      // STEP 1: Criar Regras de Classificação
      // =====================================================================
      setStep('rules')
      addLog('📋 Criando regras de classificação...')

      // Carregar categorias existentes do seed (CATEGORIAS_PADRAO)
      const categoriasExistentes = await db.categorias.toArray()
      const categoriasMap = new Map(
        categoriasExistentes.filter((c) => c.ativa).map((c) => [c.nome, c.id]),
      )

      addLog(`  📁 ${categoriasMap.size} categorias disponíveis no banco`)

      // Verificar regras existentes (evitar duplicatas)
      const regrasExistentes = await db.regras_classificacao.toArray()
      const regrasSet = new Set(regrasExistentes.map((r) => r.padrao.toUpperCase()))

      // Criar regras com prioridades estratégicas
      const prioritizedRules = assignPriorities(CLASSIFICATION_RULES)

      for (const rule of prioritizedRules) {
        if (regrasSet.has(rule.pattern.toUpperCase())) continue

        const categoriaId = categoriasMap.get(rule.categoria)
        if (!categoriaId) {
          addLog(`  ⚠️ Categoria "${rule.categoria}" não encontrada — pulando "${rule.pattern}"`)
          continue
        }

        await db.regras_classificacao.add({
          id: crypto.randomUUID(),
          categoria_id: categoriaId,
          nome: `${rule.categoria} - ${rule.pattern}`,
          tipo_regra: rule.tipo_regra,
          padrao: rule.pattern,
          prioridade: rule.prioridade,
          ativa: true,
          total_aplicacoes: 0,
          total_confirmacoes: 0,
          total_rejeicoes: 0,
          usuario_id: usuarioId,
          created_at: new Date(),
          updated_at: new Date(),
        })

        regrasSet.add(rule.pattern.toUpperCase())
        stats.regrasCriadas++
      }

      addLog(`  ✓ ${stats.regrasCriadas} regras criadas`)
      setProgress(25)

      // =====================================================================
      // STEP 2: Aplicar Regras nas Transações
      // =====================================================================
      setStep('applying')
      addLog('🏷️ Aplicando regras nas transações...')

      const transacoesSemCategoria = await db.transacoes
        .filter((t) => !t.categoria_id && t.tipo !== 'transferencia')
        .toArray()

      addLog(`  📊 ${transacoesSemCategoria.length} transações para categorizar`)

      const regras = await db.regras_classificacao
        .filter((r) => r.ativa)
        .toArray()

      regras.sort((a, b) => a.prioridade - b.prioridade)

      let processed = 0
      for (const transacao of transacoesSemCategoria) {
        let matched = false

        for (const regra of regras) {
          const descricaoUpper = transacao.descricao.toUpperCase()
          const padraoUpper = regra.padrao.toUpperCase()

          let isMatch = false
          switch (regra.tipo_regra) {
            case 'contains':
              isMatch = descricaoUpper.includes(padraoUpper)
              break
            case 'starts_with':
              isMatch = descricaoUpper.startsWith(padraoUpper)
              break
            case 'ends_with':
              isMatch = descricaoUpper.endsWith(padraoUpper)
              break
            case 'regex':
              try {
                isMatch = new RegExp(regra.padrao, 'i').test(transacao.descricao)
              } catch {
                isMatch = false
              }
              break
          }

          if (isMatch) {
            await db.transacoes.update(transacao.id, {
              categoria_id: regra.categoria_id,
              classificacao_origem: 'regra',
              classificacao_confirmada: false,
              updated_at: new Date(),
            })

            await db.regras_classificacao.update(regra.id, {
              total_aplicacoes: (regra.total_aplicacoes || 0) + 1,
              ultima_aplicacao: new Date(),
              updated_at: new Date(),
            })

            stats.transacoesCategorizadas++
            matched = true
            break
          }
        }

        if (!matched) {
          stats.semCategoria++
        }

        processed++
        if (processed % 50 === 0) {
          setProgress(25 + Math.round((processed / transacoesSemCategoria.length) * 35))
          addLog(`  📝 ${processed}/${transacoesSemCategoria.length} processadas...`)
        }
      }

      addLog(`  ✓ ${stats.transacoesCategorizadas} categorizadas por regras`)
      addLog(`  ⚠️ ${stats.semCategoria} sem match`)
      setProgress(60)

      // =====================================================================
      // STEP 3: AI Classification para restantes
      // =====================================================================
      if (stats.semCategoria > 0) {
        setStep('ai')
        addLog('🤖 Classificando restantes com AI...')

        const semCategoria = await db.transacoes
          .filter((t) => !t.categoria_id && t.tipo !== 'transferencia')
          .toArray()

        const categorias = await db.categorias.filter((c) => c.ativa).toArray()
        const categoriasPayload = categorias.map((c) => ({ id: c.id, nome: c.nome }))

        const BATCH_SIZE = 5
        let aiProcessed = 0

        for (let i = 0; i < semCategoria.length; i += BATCH_SIZE) {
          const batch = semCategoria.slice(i, i + BATCH_SIZE)

          const promises = batch.map(async (tx) => {
            try {
              const res = await fetch('/api/ai/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  descricao: tx.descricao,
                  valor: tx.valor,
                  tipo: tx.tipo,
                  transacao_id: tx.id,
                  categorias: categoriasPayload,
                }),
              })

              if (!res.ok) return null
              const result = await res.json()

              if (result.categoria_sugerida_id && result.confianca >= 0.7) {
                await db.transacoes.update(tx.id, {
                  categoria_id: result.categoria_sugerida_id,
                  classificacao_origem: 'ia',
                  classificacao_confianca: result.confianca,
                  classificacao_confirmada: false,
                  updated_at: new Date(),
                })
                return true
              }
              return false
            } catch {
              return null
            }
          })

          const results = await Promise.all(promises)
          const classified = results.filter((r) => r === true).length
          stats.classificadasPorAI += classified
          aiProcessed += batch.length

          setProgress(60 + Math.round((aiProcessed / semCategoria.length) * 35))
          addLog(`  🤖 ${aiProcessed}/${semCategoria.length} — ${stats.classificadasPorAI} classificadas`)

          // Small delay between batches to avoid overwhelming the API
          if (i + BATCH_SIZE < semCategoria.length) {
            await new Promise((r) => setTimeout(r, 200))
          }
        }

        // Update remaining count
        stats.semCategoria = semCategoria.length - stats.classificadasPorAI
        addLog(`  ✓ ${stats.classificadasPorAI} classificadas por AI`)
      }

      setProgress(100)
      setStep('done')
      setStats(stats)

      addLog('')
      addLog('✅ Concluído!')

      logger.info('Auto-categorização concluída', { stats })
      onComplete?.()
    } catch (err) {
      setError(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      logger.error('Erro na auto-categorização', err instanceof Error ? err : undefined)
    } finally {
      setRunning(false)
    }
  }, [addLog, onComplete])

  const reset = useCallback(() => {
    setStep('idle')
    setProgress(0)
    setStats(null)
    setLogs([])
    setError(null)
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Auto-Categorização</h3>
          <p className="text-xs text-secondary mt-0.5">
            Reclassificar tipos, aplicar {CLASSIFICATION_RULES.length} regras e classificar com AI
          </p>
        </div>
        {stats && (
          <Button variant="outline" size="sm" onClick={reset}>
            Reiniciar
          </Button>
        )}
      </div>

      {/* Status/Action */}
      {step === 'idle' && (
        <Button onClick={handleRun} disabled={running} className="w-full">
          <Play className="mr-2 h-4 w-4" />
          Executar Auto-Categorização
        </Button>
      )}

      {running && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <div className="animate-spin rounded-full h-4 w-4 border border-primary border-t-transparent" />
            {step === 'reclassify' && 'Reclassificando tipos...'}
            {step === 'rules' && 'Criando regras...'}
            {step === 'applying' && 'Aplicando regras...'}
            {step === 'ai' && 'Classificando com AI...'}
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="max-h-48 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className="text-secondary">{log}</div>
          ))}
        </div>
      )}

      {/* Results */}
      {stats && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Auto-categorização concluída!</span>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-950">
              <p className="text-xl font-bold text-orange-600">{stats.tiposReclassificados}</p>
              <p className="text-xs text-orange-700 dark:text-orange-400">Tipos corrigidos</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-950">
              <p className="text-xl font-bold text-purple-600">{stats.regrasCriadas}</p>
              <p className="text-xs text-purple-700 dark:text-purple-400">Regras</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950">
              <p className="text-xl font-bold text-green-600">{stats.transacoesCategorizadas}</p>
              <p className="text-xs text-green-700 dark:text-green-400">Por regras</p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-950">
              <p className="text-xl font-bold text-indigo-600">{stats.classificadasPorAI}</p>
              <p className="text-xs text-indigo-700 dark:text-indigo-400">Por AI</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950">
              <p className="text-xl font-bold text-yellow-600">{stats.semCategoria}</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">Sem categoria</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  )
}
