'use client'

/**
 * Budgets Page
 * Agent FINANCE: Owner
 *
 * Painel de orçamentos com visão "planejado vs. realizado"
 */

import { DashboardLayout } from '@/components/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format'
import { orcamentoService } from '@/lib/services/orcamento.service'
import type { OrcamentoComProgresso } from '@/lib/services/orcamento.service'
import { addMonths, format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

// Lazy load budget components
const BudgetComparisonCard = dynamic(() => import('@/components/budget/budget-comparison-card'), {
  loading: () => <div className="h-[400px] bg-secondary rounded-lg animate-pulse" />,
})
const BudgetProjectionChart = dynamic(() => import('@/components/budget/budget-projection-chart'), {
  loading: () => <div className="h-[350px] bg-secondary rounded-lg animate-pulse" />,
})
const BudgetHistoryTable = dynamic(() => import('@/components/budget/budget-history-table'), {
  loading: () => <div className="h-[400px] bg-secondary rounded-lg animate-pulse" />,
})
const SmartSuggestions = dynamic(() => import('@/components/budget/smart-suggestions'), {
  loading: () => <div className="h-[300px] bg-secondary rounded-lg animate-pulse" />,
})

export default function BudgetsPage() {
  const [mesReferencia, setMesReferencia] = useState(() => {
    const hoje = new Date()
    return format(hoje, 'yyyy-MM')
  })

  const [orcamentos, setOrcamentos] = useState<OrcamentoComProgresso[]>([])
  const [resumo, setResumo] = useState<{
    total_planejado: number
    total_realizado: number
    total_restante: number
    percentual_usado: number
    orcamentos_ok: number
    orcamentos_atencao: number
    orcamentos_excedidos: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculando, setRecalculando] = useState(false)

  // Auto-budget dialog state
  const [showAutoDialog, setShowAutoDialog] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [sugestoes, setSugestoes] = useState<
    Array<{
      categoria_id: string
      categoria_nome: string
      categoria_icone?: string
      media_mensal: number
      valor_sugerido: number
      total_transacoes: number
      meses_com_gasto: number
      enabled: boolean
    }>
  >([])

  useEffect(() => {
    loadOrcamentos()
  }, [mesReferencia])

  const loadOrcamentos = async () => {
    try {
      setLoading(true)
      const [orcamentosData, resumoData] = await Promise.all([
        orcamentoService.listOrcamentosComProgresso({ mesReferencia }),
        orcamentoService.getResumoMensal(mesReferencia),
      ])

      setOrcamentos(orcamentosData)
      setResumo(resumoData)
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error)
      toast.error('Erro ao carregar orçamentos')
    } finally {
      setLoading(false)
    }
  }

  const handleRecalcular = async () => {
    try {
      setRecalculando(true)
      const count = await orcamentoService.recalcularTodosDoMes(mesReferencia)
      toast.success(`${count} orçamentos recalculados`)
      await loadOrcamentos()
    } catch (error) {
      console.error('Erro ao recalcular:', error)
      toast.error('Erro ao recalcular orçamentos')
    } finally {
      setRecalculando(false)
    }
  }

  const handleAutoGenerate = useCallback(async () => {
    setAutoLoading(true)
    setShowAutoDialog(true)
    try {
      const result = await orcamentoService.gerarSugestoesOrcamento(mesReferencia)
      setSugestoes(result.map((s) => ({ ...s, enabled: true })))
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error)
      toast.error('Erro ao analisar transações')
      setShowAutoDialog(false)
    } finally {
      setAutoLoading(false)
    }
  }, [mesReferencia])

  const handleSaveSugestoes = useCallback(async () => {
    const ativas = sugestoes.filter((s) => s.enabled)
    if (ativas.length === 0) {
      toast.error('Selecione ao menos uma categoria')
      return
    }

    setAutoSaving(true)
    try {
      const count = await orcamentoService.criarOrcamentosEmLote(
        ativas.map((s) => ({
          categoria_id: s.categoria_id,
          categoria_nome: s.categoria_nome,
          valor_planejado: s.valor_sugerido,
        })),
        mesReferencia
      )
      toast.success(`${count} orçamentos criados com sucesso!`)
      setShowAutoDialog(false)
      setSugestoes([])
      await loadOrcamentos()
    } catch (error) {
      console.error('Erro ao salvar orçamentos:', error)
      toast.error('Erro ao salvar orçamentos')
    } finally {
      setAutoSaving(false)
    }
  }, [sugestoes, mesReferencia])

  const handleMesAnterior = () => {
    const [ano = 0, mes = 0] = mesReferencia.split('-').map(Number)
    const nova = subMonths(new Date(ano, mes - 1), 1)
    setMesReferencia(format(nova, 'yyyy-MM'))
  }

  const handleProximoMes = () => {
    const [ano = 0, mes = 0] = mesReferencia.split('-').map(Number)
    const nova = addMonths(new Date(ano, mes - 1), 1)
    const hoje = new Date()

    if (nova > hoje) {
      toast.info('Não há dados futuros')
      return
    }

    setMesReferencia(format(nova, 'yyyy-MM'))
  }

  const getStatusIcon = (status: 'ok' | 'atencao' | 'excedido') => {
    if (status === 'ok') return <CheckCircle className="h-5 w-5 text-success" />
    if (status === 'atencao') return <AlertTriangle className="h-5 w-5 text-warning" />
    return <XCircle className="h-5 w-5 text-destructive" />
  }

  const getStatusText = (status: 'ok' | 'atencao' | 'excedido') => {
    if (status === 'ok') return 'No limite'
    if (status === 'atencao') return 'Atenção'
    return 'Excedido'
  }

  const mesFormatado = (() => {
    const [a = 0, m = 0] = mesReferencia.split('-').map(Number)
    return format(new Date(a, m - 1), "MMMM 'de' yyyy", { locale: ptBR })
  })()

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Orçamentos"
          description="Acompanhe seu planejamento vs. realizado"
          actions={
            <div className="flex gap-2">
              {orcamentos.length > 0 && (
                <Button onClick={handleRecalcular} variant="outline" disabled={recalculando}>
                  {recalculando ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Recalculando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Recalcular
                    </>
                  )}
                </Button>
              )}
              <Button onClick={handleAutoGenerate}>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Orçamentos
              </Button>
            </div>
          }
        />

        {/* TEMA.md: Month selector - solid bg-card, shadow-1 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMesAnterior}
                className="hover:bg-accent"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="sr-only">Mês anterior</span>
              </Button>

              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-semibold capitalize">
                  {mesFormatado}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleProximoMes}
                className="hover:bg-accent"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-5 w-5" />
                <span className="sr-only">Próximo mês</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* TEMA.md: Summary stats - KPI cards with shadow-2 and icon pills 36px */}
        {resumo && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-muted border border-border">
                    <Calendar className="h-4 w-4 text-gold" />
                  </div>
                  <CardDescription className="text-sm text-muted-foreground">
                    Planejado
                  </CardDescription>
                </div>
                <CardTitle className="text-3xl font-bold text-gold">
                  R$ {resumo.total_planejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-muted border border-border">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <CardDescription className="text-sm text-muted-foreground">
                    Realizado
                  </CardDescription>
                </div>
                <CardTitle className="text-3xl font-bold">
                  R$ {resumo.total_realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Progress value={resumo.percentual_usado} className="mb-2" />
                <p className="text-xs text-muted-foreground">
                  {resumo.percentual_usado.toFixed(1)}% usado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-muted border border-border">
                    <AlertTriangle
                      className={`h-4 w-4 ${resumo.total_restante >= 0 ? 'text-success' : 'text-destructive'}`}
                    />
                  </div>
                  <CardDescription className="text-sm text-muted-foreground">
                    Restante
                  </CardDescription>
                </div>
                <CardTitle
                  className={`text-3xl font-bold ${resumo.total_restante >= 0 ? 'text-success' : 'text-destructive'}`}
                >
                  R${' '}
                  {Math.abs(resumo.total_restante).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-sm mb-3 text-muted-foreground">
                  Status Geral
                </CardDescription>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="font-semibold">
                      {resumo.orcamentos_ok}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="font-semibold">
                      {resumo.orcamentos_atencao}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="font-semibold">
                      {resumo.orcamentos_excedidos}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* TEMA.md: Main budgets list - solid bg-card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Orçamentos do Mês</CardTitle>
            <CardDescription className="text-muted-foreground">
              {orcamentos.length} orçamento{orcamentos.length !== 1 ? 's' : ''} cadastrado
              {orcamentos.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orcamentos.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhum orçamento cadastrado
                </p>
                <p className="text-sm max-w-md mx-auto text-muted-foreground">
                  Gere orçamentos automaticamente com base nos seus gastos dos últimos 3 meses
                </p>
                <Button onClick={handleAutoGenerate} size="lg" className="mt-2">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Orçamentos Automáticos
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orcamentos.map((orcamento) => (
                  <div
                    key={orcamento.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted border border-border hover:bg-accent transition-all"
                  >
                    <div className="flex-shrink-0">{getStatusIcon(orcamento.status)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {orcamento.categoria_icone && (
                          <span className="text-lg">{orcamento.categoria_icone}</span>
                        )}
                        <h4 className="font-semibold truncate">
                          {orcamento.nome}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-xs text-muted-foreground"
                        >
                          {orcamento.categoria_nome || orcamento.centro_custo_nome}
                        </Badge>
                      </div>

                      <div className="mt-2">
                        <div
                          className="flex items-center justify-between text-sm mb-1 text-muted-foreground"
                        >
                          <span>
                            R${' '}
                            {orcamento.valor_realizado.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}{' '}
                            de R${' '}
                            {orcamento.valor_planejado.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <span>{orcamento.percentual_usado.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden bg-muted">
                          <div
                            className={`h-full transition-all ${
                              orcamento.status === 'ok'
                                ? 'bg-success'
                                : orcamento.status === 'atencao'
                                  ? 'bg-warning'
                                  : 'bg-destructive'
                            }`}
                            style={{
                              width: `${Math.min(orcamento.percentual_usado, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p
                        className={`text-lg font-bold ${orcamento.valor_restante >= 0 ? 'text-success' : 'text-destructive'}`}
                      >
                        {orcamento.valor_restante >= 0 ? '+' : '-'}R${' '}
                        {Math.abs(orcamento.valor_restante).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getStatusText(orcamento.status)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Budget Analytics Components */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 md:items-stretch">
          <BudgetComparisonCard mesReferencia={mesReferencia} />
          <BudgetProjectionChart mesReferencia={mesReferencia} />
        </div>

        {/* Smart Suggestions */}
        <SmartSuggestions mesReferencia={mesReferencia} />

        {/* Budget History */}
        <BudgetHistoryTable mesReferencia={mesReferencia} />
      </div>

      {/* Auto-Budget Dialog */}
      <Dialog open={showAutoDialog} onOpenChange={setShowAutoDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Orçamentos Automáticos</DialogTitle>
            <DialogDescription>
              Baseado nos seus gastos dos últimos 3 meses. Ajuste os valores antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          {autoLoading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Analisando transações...</p>
            </div>
          ) : sugestoes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma categoria com transações suficientes (mín. 3) nos últimos 3 meses.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>{sugestoes.filter((s) => s.enabled).length} de {sugestoes.length} selecionados</span>
                <span>
                  Total: {formatCurrency(
                    sugestoes.filter((s) => s.enabled).reduce((sum, s) => sum + s.valor_sugerido, 0)
                  )}
                </span>
              </div>

              {sugestoes.map((s, idx) => (
                <div
                  key={s.categoria_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    s.enabled
                      ? 'border-border bg-card'
                      : 'border-border/50 bg-muted/30 opacity-60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSugestoes((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, enabled: !item.enabled } : item
                        )
                      )
                    }}
                    className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                      s.enabled
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground'
                    }`}
                  >
                    {s.enabled && <CheckCircle className="h-3 w-3" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {s.categoria_icone && <span className="text-base">{s.categoria_icone}</span>}
                      <span className="font-medium text-sm truncate">{s.categoria_nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.total_transacoes} tx / {s.meses_com_gasto} {s.meses_com_gasto === 1 ? 'mês' : 'meses'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Média: {formatCurrency(s.media_mensal)}/mês
                    </p>
                  </div>

                  <div className="flex-shrink-0 w-28">
                    <Input
                      type="number"
                      value={s.valor_sugerido}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        if (val >= 0) {
                          setSugestoes((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, valor_sugerido: val } : item
                            )
                          )
                        }
                      }}
                      className="text-right text-sm h-8"
                      disabled={!s.enabled}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSugestoes}
              disabled={autoSaving || autoLoading || sugestoes.filter((s) => s.enabled).length === 0}
            >
              {autoSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Criar {sugestoes.filter((s) => s.enabled).length} Orçamentos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
