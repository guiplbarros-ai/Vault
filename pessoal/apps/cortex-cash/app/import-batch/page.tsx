'use client'

/**
 * Importação em Batch
 *
 * Página para importar dados processados do script import-extratos.ts
 */

import { useCallback, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { getDB } from '@/lib/db/client'
import { generateTransactionHash } from '@/lib/import/dedupe'
import { logger } from '@/lib/utils/logger'

// Tipos do JSON processado
interface ProcessedTransaction {
  data: string // ISO date
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa' | 'transferencia'
  titular?: string
  parcela?: { numero: number; total: number }
}

interface ProcessedAccount {
  nome: string
  tipo: 'corrente' | 'cartao'
  instituicao: string
  transacoes: ProcessedTransaction[]
}

interface ProcessedData {
  generated_at: string
  accounts: Record<string, ProcessedAccount>
}

interface ImportStats {
  contasCriadas: number
  transacoesImportadas: number
  transacoesDuplicadas: number
  erros: string[]
}

export default function ImportBatchPage() {
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<ProcessedData | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState<ImportStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setStats(null)

    try {
      const text = await selectedFile.text()
      const parsed = JSON.parse(text) as ProcessedData
      setData(parsed)
    } catch (err) {
      setError('Erro ao ler arquivo JSON')
      logger.error('Erro ao ler JSON', err instanceof Error ? err : undefined)
    }
  }, [])

  const handleImport = useCallback(async () => {
    if (!data) return

    setImporting(true)
    setProgress(0)
    setError(null)

    const stats: ImportStats = {
      contasCriadas: 0,
      transacoesImportadas: 0,
      transacoesDuplicadas: 0,
      erros: [],
    }

    try {
      const db = getDB()

      // Buscar/criar instituições
      const instituicoes = await db.instituicoes.toArray()
      const instituicoesMap = new Map(instituicoes.map((i) => [i.nome, i.id]))

      // Mapear contas existentes
      const contasExistentes = await db.contas.toArray()
      const contasMap = new Map(contasExistentes.map((c) => [c.nome, c.id]))

      // Mapear cartões existentes
      const cartoesExistentes = await db.cartoes_config.toArray()
      const cartoesMap = new Map(cartoesExistentes.map((c) => [c.nome, c.id]))

      const accountIds = Object.keys(data.accounts)
      let processed = 0

      for (const accountKey of accountIds) {
        const account = data.accounts[accountKey]
        if (!account) continue

        let contaId: string | null = null
        let cartaoId: string | null = null

        // Criar/buscar instituição
        let instituicaoId = instituicoesMap.get(account.instituicao)
        if (!instituicaoId) {
          instituicaoId = crypto.randomUUID()
          await db.instituicoes.add({
            id: instituicaoId,
            nome: account.instituicao,
            codigo: account.instituicao.toLowerCase().replace(/\s+/g, '-'),
            cor: '#3B82F6',
            created_at: new Date(),
            updated_at: new Date(),
          })
          instituicoesMap.set(account.instituicao, instituicaoId)
        }

        if (account.tipo === 'corrente') {
          // Criar/buscar conta bancária
          contaId = contasMap.get(account.nome) ?? null
          if (!contaId) {
            contaId = crypto.randomUUID()
            await db.contas.add({
              id: contaId,
              instituicao_id: instituicaoId,
              nome: account.nome,
              tipo: 'corrente',
              saldo_referencia: 0,
              data_referencia: new Date(),
              saldo_atual: 0,
              ativa: true,
              usuario_id: 'usuario-producao',
              created_at: new Date(),
              updated_at: new Date(),
            })
            contasMap.set(account.nome, contaId)
            stats.contasCriadas++
          }
        } else {
          // Criar/buscar cartão de crédito
          cartaoId = cartoesMap.get(account.nome) ?? null
          if (!cartaoId) {
            cartaoId = crypto.randomUUID()
            await db.cartoes_config.add({
              id: cartaoId,
              instituicao_id: instituicaoId,
              nome: account.nome,
              bandeira: 'amex',
              limite_total: 50000,
              dia_fechamento: 20,
              dia_vencimento: 10,
              ativo: true,
              usuario_id: 'usuario-producao',
              created_at: new Date(),
              updated_at: new Date(),
            })
            cartoesMap.set(account.nome, cartaoId)
            stats.contasCriadas++

            // Também criar uma conta virtual para o cartão (para transações)
            contaId = crypto.randomUUID()
            await db.contas.add({
              id: contaId,
              instituicao_id: instituicaoId,
              nome: `${account.nome} (Cartão)`,
              tipo: 'corrente', // Usando 'corrente' pois TipoConta não tem 'cartao_credito'
              saldo_referencia: 0,
              data_referencia: new Date(),
              saldo_atual: 0,
              ativa: true,
              usuario_id: 'usuario-producao',
              created_at: new Date(),
              updated_at: new Date(),
            })
            contasMap.set(`${account.nome} (Cartão)`, contaId)
          } else {
            // Buscar conta associada ao cartão
            const contaCartao = contasExistentes.find(
              (c) => c.nome === `${account.nome} (Cartão)` || c.nome === account.nome
            )
            contaId = contaCartao?.id ?? null
          }
        }

        if (!contaId) {
          stats.erros.push(`Não foi possível criar/encontrar conta para ${account.nome}`)
          continue
        }

        // Buscar hashes existentes para deduplicação
        const transacoesExistentes = await db.transacoes.where('conta_id').equals(contaId).toArray()
        const hashesExistentes = new Set(transacoesExistentes.filter((t) => t.hash).map((t) => t.hash!))

        // Importar transações
        for (const tx of account.transacoes) {
          try {
            const data = new Date(tx.data)
            const valor = tx.tipo === 'despesa' ? -Math.abs(tx.valor) : Math.abs(tx.valor)

            // Gerar hash para deduplicação
            const hash = await generateTransactionHash(
              { data, descricao: tx.descricao, valor: Math.abs(tx.valor) },
              contaId
            )

            // Verificar duplicata
            if (hashesExistentes.has(hash)) {
              stats.transacoesDuplicadas++
              continue
            }

            // Criar transação
            await db.transacoes.add({
              id: crypto.randomUUID(),
              conta_id: contaId,
              categoria_id: undefined,
              data,
              descricao: tx.descricao,
              valor,
              tipo: tx.tipo,
              parcelado: !!tx.parcela,
              parcela_numero: tx.parcela?.numero,
              parcela_total: tx.parcela?.total,
              classificacao_confirmada: false,
              classificacao_origem: undefined,
              hash,
              observacoes: tx.titular ? `Titular: ${tx.titular}` : undefined,
              usuario_id: 'usuario-producao',
              created_at: new Date(),
              updated_at: new Date(),
            })

            hashesExistentes.add(hash)
            stats.transacoesImportadas++
          } catch (err) {
            stats.erros.push(`Erro na transação: ${tx.descricao} - ${err}`)
          }
        }

        processed++
        setProgress(Math.round((processed / accountIds.length) * 100))
      }

      setStats(stats)
      logger.info('Importação concluída', { stats })
    } catch (err) {
      setError(`Erro na importação: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      logger.error('Erro na importação', err instanceof Error ? err : undefined)
    } finally {
      setImporting(false)
    }
  }, [data])

  // Calcular resumo dos dados carregados
  const dataSummary = data
    ? Object.entries(data.accounts).map(([key, account]) => ({
        key,
        nome: account.nome,
        tipo: account.tipo,
        transacoes: account.transacoes.length,
      }))
    : []

  const totalTransacoes = dataSummary.reduce((sum, a) => sum + a.transacoes, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Importação em Batch</h1>
          <p className="text-muted-foreground">
            Importar dados processados do script import-extratos.ts
          </p>
        </div>

        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle>1. Selecionar Arquivo</CardTitle>
            <CardDescription>
              Selecione o arquivo importacao_processada.json gerado pelo script
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {file && (
              <p className="mt-2 text-sm text-muted-foreground">
                Arquivo selecionado: {file.name}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {data && (
          <Card>
            <CardHeader>
              <CardTitle>2. Resumo dos Dados</CardTitle>
              <CardDescription>
                Gerado em: {new Date(data.generated_at).toLocaleString('pt-BR')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataSummary.map((account) => (
                  <div
                    key={account.key}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{account.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.tipo === 'corrente' ? 'Conta Corrente' : 'Cartão de Crédito'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{account.transacoes}</p>
                      <p className="text-sm text-muted-foreground">transações</p>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <p className="text-lg font-semibold">
                    Total: {totalTransacoes.toLocaleString('pt-BR')} transações
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Button */}
        {data && !stats && (
          <Card>
            <CardHeader>
              <CardTitle>3. Importar</CardTitle>
              <CardDescription>
                Clique para iniciar a importação. Transações duplicadas serão ignoradas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleImport} disabled={importing} size="lg" className="w-full">
                {importing ? 'Importando...' : 'Iniciar Importação'}
              </Button>
              {importing && <Progress value={progress} className="w-full" />}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Resultado da Importação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950">
                  <p className="text-3xl font-bold text-green-600">
                    {stats.transacoesImportadas}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">Importadas</p>
                </div>
                <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950">
                  <p className="text-3xl font-bold text-yellow-600">
                    {stats.transacoesDuplicadas}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">Duplicadas</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                  <p className="text-3xl font-bold text-blue-600">{stats.contasCriadas}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">Contas criadas</p>
                </div>
              </div>
              {stats.erros.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium text-destructive">Erros ({stats.erros.length}):</p>
                  <ul className="mt-2 max-h-40 overflow-auto text-sm text-muted-foreground">
                    {stats.erros.slice(0, 10).map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                    {stats.erros.length > 10 && (
                      <li>... e mais {stats.erros.length - 10} erros</li>
                    )}
                  </ul>
                </div>
              )}
              <div className="mt-6">
                <Button asChild>
                  <a href="/transactions">Ver Transações</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
