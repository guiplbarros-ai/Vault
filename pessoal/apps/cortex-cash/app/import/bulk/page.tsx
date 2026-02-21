'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { getDB } from '@/lib/db/client'
import { getCurrentUserId } from '@/lib/db/seed-usuarios'
import { AlertCircle, AlertTriangle, CheckCircle, Loader2, Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

interface ImportData {
  generated_at: string
  stats: {
    total_transacoes: number
    duplicatas_removidas: number
    periodo: { inicio: string; fim: string }
    por_conta: Record<string, { count: number; receitas: number; despesas: number }>
  }
  institutions: Record<
    string,
    {
      nome: string
      codigo: string
      cor: string
    }
  >
  accounts: Record<
    string,
    {
      nome: string
      tipo: string
      instituicao: string
      agencia?: string
      numero?: string
    }
  >
  transactions: Array<{
    conta: string
    data: string
    descricao: string
    valor: number
    tipo: 'receita' | 'despesa'
    origem_arquivo: string
    origem_linha: number
  }>
}

type ImportStep = 'idle' | 'loading' | 'preview' | 'importing' | 'done' | 'error'

export default function BulkImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<ImportStep>('idle')
  const [data, setData] = useState<ImportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [replaceMode, setReplaceMode] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStep('loading')
    setError(null)

    try {
      const content = await file.text()
      const json = JSON.parse(content) as ImportData

      if (!json.transactions || !json.accounts || !json.institutions) {
        throw new Error('Arquivo JSON inválido. Faltam campos obrigatórios.')
      }

      setData(json)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ler arquivo')
      setStep('error')
    }
  }

  const handleImport = async () => {
    if (!data) return

    setStep('importing')
    setProgress(0)
    setImportedCount(0)
    setSkippedCount(0)

    try {
      const userId = getCurrentUserId()
      const now = new Date()
      const db = getDB()

      // 0. Se modo substituir, limpa dados existentes
      if (replaceMode) {
        console.log('Modo substituir: limpando dados existentes...')

        // Limpa transações
        await db.transacoes.clear()
        console.log('Transações limpas')

        // Limpa contas
        await db.contas.clear()
        console.log('Contas limpas')

        // Limpa instituições
        await db.instituicoes.clear()
        console.log('Instituições limpas')

        setProgress(5)
      }

      // 1. Create institutions
      const institutionIds: Record<string, string> = {}

      for (const [key, inst] of Object.entries(data.institutions)) {
        // Check if institution already exists (only if not in replace mode)
        let existing = null
        if (!replaceMode) {
          existing = await db.instituicoes.where('nome').equals(inst.nome).first()
        }

        if (existing) {
          institutionIds[key] = existing.id
        } else {
          const id = crypto.randomUUID()
          await db.instituicoes.add({
            id,
            nome: inst.nome,
            codigo: inst.codigo,
            cor: inst.cor,
            created_at: now,
            updated_at: now,
          })
          institutionIds[key] = id
        }
      }
      setProgress(10)

      // 2. Create accounts
      const accountIds: Record<string, string> = {}

      for (const [key, acc] of Object.entries(data.accounts)) {
        // Check if account already exists (only if not in replace mode)
        let existing = null
        if (!replaceMode) {
          existing = await db.contas.where('nome').equals(acc.nome).first()
        }

        if (existing) {
          accountIds[key] = existing.id
        } else {
          const id = crypto.randomUUID()
          await db.contas.add({
            id,
            instituicao_id: institutionIds[acc.instituicao]!,
            nome: acc.nome,
            tipo: acc.tipo as 'corrente' | 'poupanca' | 'investimento' | 'carteira',
            agencia: acc.agencia,
            numero: acc.numero,
            saldo_referencia: 0,
            data_referencia: new Date(0), // Epoch to count all historical transactions
            saldo_atual: 0,
            ativa: true,
            usuario_id: userId,
            created_at: now,
            updated_at: now,
          })
          accountIds[key] = id
        }
      }
      setProgress(15)

      // 3. Import transactions in batches
      const batchSize = 100
      const total = data.transactions.length
      let imported = 0
      let skipped = 0

      // Get existing transaction hashes for deduplication (only if not in replace mode)
      const existingHashes = new Set<string>()
      if (!replaceMode) {
        const allTransactions = await db.transacoes.toArray()
        allTransactions.forEach((t) => {
          if (t.hash) existingHashes.add(t.hash)
        })
      }

      for (let i = 0; i < total; i += batchSize) {
        const batch = data.transactions.slice(i, i + batchSize)
        const toAdd: Array<{
          id: string
          conta_id: string
          categoria_id: string | null
          data: Date
          descricao: string
          valor: number
          tipo: 'receita' | 'despesa' | 'transferencia'
          hash: string
          origem_arquivo: string
          origem_linha: number
          ignorada: boolean
          classificacao_confirmada: boolean
          usuario_id: string
          created_at: Date
          updated_at: Date
        }> = []

        for (const tx of batch) {
          const contaId = accountIds[tx.conta]
          if (!contaId) {
            skipped++
            continue
          }

          const txDate = new Date(tx.data)
          const hash = await generateTransactionHash(contaId, txDate, tx.descricao, tx.valor)

          if (existingHashes.has(hash)) {
            skipped++
            continue
          }

          existingHashes.add(hash)
          toAdd.push({
            id: crypto.randomUUID(),
            conta_id: contaId,
            categoria_id: null,
            data: txDate,
            descricao: tx.descricao,
            valor: tx.valor,
            tipo: tx.tipo,
            hash,
            origem_arquivo: tx.origem_arquivo,
            origem_linha: tx.origem_linha,
            ignorada: false,
            classificacao_confirmada: false,
            usuario_id: userId,
            created_at: now,
            updated_at: now,
          })
        }

        if (toAdd.length > 0) {
          // @ts-expect-error -- schema type mismatch (pre-existing)
          await db.transacoes.bulkAdd(toAdd)
          imported += toAdd.length
        }

        setProgress(15 + Math.round(((i + batch.length) / total) * 80))
        setImportedCount(imported)
        setSkippedCount(skipped)
      }

      // 4. Update account balances
      for (const contaId of Object.values(accountIds)) {
        await updateAccountBalance(contaId)
      }

      setProgress(100)
      setStep('done')
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Erro durante importação')
      setStep('error')
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Importação em Lote</CardTitle>
          <CardDescription>
            Importe o arquivo JSON gerado pelo script bulk-import.ts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'idle' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                size="lg"
              >
                <Upload className="mr-2 h-4 w-4" />
                Selecionar arquivo JSON
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Arquivo esperado: importacao_processada.json
              </p>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {step === 'preview' && data && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-medium">Resumo da Importação</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total de transações:</div>
                  <div className="font-mono">{data.stats.total_transacoes}</div>
                  <div>Período:</div>
                  <div className="font-mono">
                    {new Date(data.stats.periodo.inicio).toLocaleDateString('pt-BR')} -{' '}
                    {new Date(data.stats.periodo.fim).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div className="pt-2 border-t space-y-2">
                  <h4 className="text-sm font-medium">Por conta:</h4>
                  {Object.entries(data.stats.por_conta).map(([conta, stats]) => (
                    <div key={conta} className="text-sm pl-2">
                      <span className="capitalize font-medium">{conta}:</span>{' '}
                      {stats.count} transações
                      <div className="text-xs text-muted-foreground pl-2">
                        Receitas: R$ {stats.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <br />
                        Despesas: R$ {stats.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Replace Mode Toggle */}
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <h4 className="font-medium text-yellow-500">Modo de Importação</h4>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="replace-mode" className="text-sm font-medium">
                      Substituir todos os dados
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Apaga todas as transações, contas e instituições antes de importar
                    </p>
                  </div>
                  <Switch
                    id="replace-mode"
                    checked={replaceMode}
                    onCheckedChange={setReplaceMode}
                  />
                </div>
                {replaceMode && (
                  <div className="flex items-center gap-2 text-xs text-red-400 pt-2 border-t border-yellow-500/30">
                    <Trash2 className="h-4 w-4" />
                    <span>ATENÇÃO: Todos os dados existentes serão perdidos!</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('idle')} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleImport} className="flex-1">
                  {replaceMode ? (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Substituir e Importar
                    </>
                  ) : (
                    <>Importar {data.stats.total_transacoes} transações</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="space-y-4 py-4">
              <Progress value={progress} />
              <div className="text-center text-sm">
                <p>Importando transações... {progress}%</p>
                <p className="text-muted-foreground">
                  {importedCount} importadas, {skippedCount} puladas
                </p>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h3 className="font-medium text-lg">Importação concluída!</h3>
                <p className="text-sm text-muted-foreground">
                  {importedCount} transações importadas, {skippedCount} duplicadas puladas
                </p>
              </div>
              <Button onClick={() => router.push('/transactions')} className="w-full">
                Ver Transações
              </Button>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4 py-4 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <div>
                <h3 className="font-medium text-lg">Erro na importação</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <Button variant="outline" onClick={() => setStep('idle')} className="w-full">
                Tentar novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to generate transaction hash
// Usa apenas conta|data|descricao|valor para detectar duplicatas
// (duplicatas do banco como "Rendimentos" em múltiplos arquivos OFX)
async function generateTransactionHash(
  contaId: string,
  data: Date,
  descricao: string,
  valor: number
): Promise<string> {
  const dateStr = data.toISOString().split('T')[0]
  const descClean = descricao.toUpperCase().trim()
  const valorStr = valor.toFixed(2)
  const str = `${contaId}|${dateStr}|${descClean}|${valorStr}`

  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Helper to update account balance
async function updateAccountBalance(contaId: string): Promise<void> {
  const db = getDB()
  const conta = await db.contas.get(contaId)
  if (!conta) return

  const transacoes = await db.transacoes.where('conta_id').equals(contaId).toArray()

  let saldo = conta.saldo_referencia || 0
  const dataRef = conta.data_referencia || new Date(0)

  for (const tx of transacoes) {
    if ((tx as any).ignorada) continue
    const txDate = tx.data instanceof Date ? tx.data : new Date(tx.data)
    if (txDate > dataRef) {
      if (tx.tipo === 'receita') {
        saldo += tx.valor
      } else if (tx.tipo === 'despesa') {
        saldo -= tx.valor
      }
    }
  }

  await db.contas.update(contaId, {
    saldo_atual: Math.round(saldo * 100) / 100,
    updated_at: new Date(),
  })
}
