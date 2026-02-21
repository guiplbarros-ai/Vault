'use client'

/**
 * Reports Page
 * Agent FINANCE: Owner
 *
 * Relatórios de gastos por categoria com comparação mensal
 */

import { DashboardLayout } from '@/components/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthPicker } from '@/components/ui/month-picker'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { logAIUsage } from '@/lib/services/ai-usage.service'
import { relatorioService } from '@/lib/services/relatorio.service'
import type {
  GastoRecorrente,
  PadraoDiaSemana,
  PrevisaoProximoMes,
  RelatorioComparativo,
} from '@/lib/services/relatorio.service'
import { cn } from '@/lib/utils'
import { format, subMonths } from 'date-fns'
import {
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  Minus,
  Repeat,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// Lazy charts (sem SSR)
const CashFlowChart = dynamic(() => import('@/components/cash-flow-chart'), { ssr: false })
const ExpenseTrendsChart = dynamic(() => import('@/components/expense-trends-chart'), {
  ssr: false,
})

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())

  const [relatorio, setRelatorio] = useState<RelatorioComparativo | null>(null)
  const [recorrentes, setRecorrentes] = useState<GastoRecorrente[]>([])
  const [padraoDia, setPadraoDia] = useState<PadraoDiaSemana[]>([])
  const [previsao, setPrevisao] = useState<PrevisaoProximoMes | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{
    resumo: string
    recomendacoes: string[]
    oportunidades: string[]
    alertas: string[]
  } | null>(null)

  useEffect(() => {
    loadRelatorio()
    setAiResult(null)
  }, [selectedMonth])

  const loadRelatorio = async () => {
    try {
      setLoading(true)
      const mesRef = format(selectedMonth, 'yyyy-MM')
      const [data, rec, dia, prev] = await Promise.all([
        relatorioService.gerarRelatorioComparativo(mesRef),
        relatorioService.getGastosRecorrentes(mesRef),
        relatorioService.getPadraoPorDiaDaSemana(mesRef),
        relatorioService.getPrevisaoProximoMes(mesRef),
      ])
      setRelatorio(data)
      setRecorrentes(rec)
      setPadraoDia(dia)
      setPrevisao(prev)
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
      toast.error('Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  const handleMonthChange = (date: Date) => {
    const today = new Date()
    if (date > today) {
      setSelectedMonth(today)
      return
    }
    setSelectedMonth(date)
  }

  const handleExportPDF = () => {
    if (!relatorio) return

    try {
      const monthTitle = relatorio.mes_atual.mes_formatado
      const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Relatório - ${monthTitle}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 24px; color: #0b2230; }
      h1 { margin: 0 0 8px; font-size: 20px; }
      h2 { margin: 24px 0 8px; font-size: 16px; }
      p, li, td, th { font-size: 12px; line-height: 1.5; }
      .muted { color: #5b7083; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
      .value { font-size: 18px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
      .section { page-break-inside: avoid; }
    </style>
  </head>
  <body>
    <h1>Relatório Financeiro</h1>
    <p class="muted">${monthTitle}</p>

    <div class="section">
      <div class="grid">
        <div class="card">
          <div class="muted">Receitas</div>
          <div class="value">R$ ${relatorio.mes_atual.total_receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div class="muted">${relatorio.variacao_total_receitas >= 0 ? '+' : ''}R$ ${relatorio.variacao_total_receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs mês anterior</div>
        </div>
        <div class="card">
          <div class="muted">Despesas</div>
          <div class="value">R$ ${relatorio.mes_atual.total_despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div class="muted">${relatorio.variacao_total_despesas >= 0 ? '+' : ''}R$ ${relatorio.variacao_total_despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs mês anterior</div>
        </div>
        <div class="card">
          <div class="muted">Saldo Líquido</div>
          <div class="value">R$ ${relatorio.mes_atual.saldo_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div class="muted">${relatorio.variacao_saldo_liquido >= 0 ? '+' : ''}R$ ${relatorio.variacao_saldo_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs mês anterior</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Gastos por Categoria</h2>
      <table>
        <thead>
          <tr><th>Categoria</th><th>Valor</th><th>% do total</th></tr>
        </thead>
        <tbody>
          ${relatorio.mes_atual.gastos_por_categoria
            .map(
              (g) =>
                `<tr><td>${g.categoria_nome}</td><td>R$ ${g.valor_total.toFixed(2)}</td><td>${g.percentual.toFixed(1)}%</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    ${
      aiResult
        ? `
    <div class="section">
      <h2>Análise por IA (3 meses)</h2>
      <p>${aiResult.resumo}</p>
      ${aiResult.recomendacoes?.length ? `<h3>Recomendações</h3><ul>${aiResult.recomendacoes.map((r) => `<li>${r}</li>`).join('')}</ul>` : ''}
      ${aiResult.oportunidades?.length ? `<h3>Oportunidades</h3><ul>${aiResult.oportunidades.map((r) => `<li>${r}</li>`).join('')}</ul>` : ''}
      ${aiResult.alertas?.length ? `<h3>Alertas</h3><ul>${aiResult.alertas.map((r) => `<li>${r}</li>`).join('')}</ul>` : ''}
    </div>`
        : ''
    }

  </body>
</html>
      `
      const w = window.open('', '_blank')
      if (!w) throw new Error('Popup bloqueado')
      w.document.open()
      w.document.write(html)
      w.document.close()
      w.focus()
      setTimeout(() => {
        try {
          w.print()
        } catch {}
      }, 250)
      toast.success('PDF gerado. Use salvar como PDF no diálogo de impressão.')
    } catch {
      toast.error('Falha ao gerar PDF')
    }
  }

  // Lê configurações de IA do localStorage
  function getAISettings() {
    if (typeof window === 'undefined') return null
    try {
      const settings = localStorage.getItem('cortex_settings')
      if (!settings) return null
      const parsed = JSON.parse(settings)
      return parsed.aiCosts || null
    } catch {
      return null
    }
  }

  const generateAIAnalysis = async () => {
    try {
      setAiLoading(true)
      setAiResult(null)

      // Define os 3 últimos meses com base no mês de referência selecionado
      const baseDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
      const m1 = subMonths(baseDate, 2)
      const m2 = subMonths(baseDate, 1)
      const m3 = baseDate

      const meses = [m1, m2, m3]
      // Gera relatórios mensais para cada mês
      const monthlyReports = await Promise.all(
        meses.map(async (d) => {
          const ref = format(d, 'yyyy-MM')
          const r = await relatorioService.gerarRelatorioMensal(ref)
          // Top 5 categorias por valor de despesa
          const top = [...r.gastos_por_categoria]
            .sort((a, b) => b.valor_total - a.valor_total)
            .slice(0, 5)
            .map((c) => ({ nome: c.categoria_nome, valor: c.valor_total }))
          return {
            month: ref,
            total_receitas: r.total_receitas,
            total_despesas: r.total_despesas,
            saldo_liquido: r.saldo_liquido,
            top_categorias: top,
          }
        })
      )

      // Monta config de IA
      const aiSettings = getAISettings()
      const config = aiSettings
        ? {
            defaultModel: aiSettings.defaultModel,
            monthlyCostLimit: aiSettings.monthlyCostLimit,
            allowOverride: aiSettings.allowOverride,
            strategy: aiSettings.strategy,
          }
        : undefined

      const resp = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: monthlyReports, config }),
      })

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error('Limite de IA excedido', {
            description: 'Você atingiu o limite mensal de gastos com IA. Ajuste nas configurações.',
          })
          return
        }
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.message || 'Erro ao gerar análise por IA')
      }

      const data: {
        resumo: string
        recomendacoes: string[]
        oportunidades: string[]
        alertas: string[]
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
        metadata?: { modelo: string; prompt: string; resposta: string }
      } = await resp.json()

      setAiResult({
        resumo: data.resumo,
        recomendacoes: data.recomendacoes || [],
        oportunidades: data.oportunidades || [],
        alertas: data.alertas || [],
      })

      // Registra uso de IA no cliente para metering persistente
      if (data.usage && data.metadata) {
        try {
          await logAIUsage({
            prompt: data.metadata.prompt,
            resposta: data.metadata.resposta,
            modelo: data.metadata.modelo as 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo',
            tokens_prompt: data.usage.prompt_tokens,
            tokens_resposta: data.usage.completion_tokens,
          })
        } catch (e) {
          // Não interrompe o fluxo principal
          console.error('Erro ao registrar uso de IA (report):', e)
        }
      }
    } catch (error) {
      console.error('Erro na análise por IA:', error)
      toast.error('Erro ao gerar análise por IA')
    } finally {
      setAiLoading(false)
    }
  }

  const getTendenciaIcon = (tendencia: 'aumento' | 'reducao' | 'estavel') => {
    if (tendencia === 'aumento') return <TrendingUp className="h-4 w-4 text-red-600" />
    if (tendencia === 'reducao') return <TrendingDown className="h-4 w-4 text-green-600" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getTendenciaColor = (tendencia: 'aumento' | 'reducao' | 'estavel') => {
    if (tendencia === 'aumento') return 'text-red-600'
    if (tendencia === 'reducao') return 'text-green-600'
    return 'text-muted-foreground'
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    )
  }

  if (!relatorio) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <PageHeader title="Relatórios" description="Gastos por categoria e comparação mensal" />
            <div className="flex items-center gap-2 sm:ml-auto">
              <MonthPicker value={selectedMonth} onChange={handleMonthChange} />
              <Button onClick={handleExportPDF} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: 'hsl(var(--bg-card-2))' }}>
                <BarChart3 className="h-12 w-12 text-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Nenhum dado para este período</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Não há transações suficientes para gerar o relatório deste mês.
                Selecione outro mês ou importe transações.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Análise por IA (3 meses)</CardTitle>
                <CardDescription>
                  Recomendações personalizadas com base nos últimos três meses
                </CardDescription>
              </div>
              <Button onClick={generateAIAnalysis} disabled={aiLoading}>
                {aiLoading ? 'Gerando...' : 'Gerar análise'}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Clique em &quot;Gerar análise&quot; para obter recomendações financeiras
                automáticas.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader title="Relatórios" description="Gastos por categoria e comparação mensal" />
          <div className="flex items-center gap-2 sm:ml-auto">
            <MonthPicker value={selectedMonth} onChange={handleMonthChange} />
            <Button onClick={handleExportPDF} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Cards consolidados */}

        {/* Mês selecionado: */}
        <div className="text-sm text-muted-foreground">
          <span className="sr-only">Mês selecionado:</span>
          <span className="hidden">{relatorio.mes_atual.mes_formatado}</span>
        </div>

        {/* Resumo consolidado (StatCards) */}
        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            title="Receitas"
            value={`R$ ${relatorio.mes_atual.total_receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            description={`${relatorio.variacao_total_receitas >= 0 ? '+' : ''}R$ ${relatorio.variacao_total_receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs mês anterior`}
            variant="success"
          />
          <StatCard
            title="Despesas"
            value={`R$ ${relatorio.mes_atual.total_despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={TrendingDown}
            description={`${relatorio.variacao_total_despesas >= 0 ? '+' : ''}R$ ${relatorio.variacao_total_despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs mês anterior`}
            variant="error"
          />
          <StatCard
            title="Saldo Líquido"
            value={`R$ ${relatorio.mes_atual.saldo_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            description={`${relatorio.variacao_saldo_liquido >= 0 ? '+' : ''}R$ ${relatorio.variacao_saldo_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs mês anterior`}
            variant={relatorio.mes_atual.saldo_liquido >= 0 ? 'success' : 'error'}
          />
        </div>

        {/* Gastos por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoria</CardTitle>
            <CardDescription>
              {relatorio.mes_atual.gastos_por_categoria.length} categorias ·{' '}
              {relatorio.mes_atual.transacoes_despesa} transações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {relatorio.mes_atual.gastos_por_categoria.map((gasto) => {
                const comparacao = relatorio.comparacoes.find(
                  (c) => c.categoria_id === gasto.categoria_id
                )

                return (
                  <div
                    key={gasto.categoria_id}
                    className="flex items-center justify-between p-3 border rounded-lg transition-colors bg-card"
                  >
                    {/* Categoria */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {gasto.categoria_icone && (
                          <span className="text-lg">{gasto.categoria_icone}</span>
                        )}
                        <span className="font-medium text-white">{gasto.categoria_nome}</span>
                        <Badge variant="outline" className="text-xs">
                          {gasto.quantidade_transacoes}
                        </Badge>
                      </div>

                      {/* Barra de progresso */}
                      <div className="mt-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/90 transition-all"
                            style={{ width: `${gasto.percentual}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Valor e variação */}
                    <div className="ml-4 text-right">
                      <div className="text-lg font-semibold">
                        R$ {gasto.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>{gasto.percentual.toFixed(1)}%</span>
                        {comparacao && (
                          <div
                            className={cn(
                              'flex items-center gap-1',
                              getTendenciaColor(comparacao.tendencia)
                            )}
                          >
                            {getTendenciaIcon(comparacao.tendencia)}
                            <span className="text-xs">
                              {comparacao.variacao_percentual >= 0 ? '+' : ''}
                              {comparacao.variacao_percentual.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Destaques */}
        {(relatorio.maiores_aumentos.length > 0 || relatorio.maiores_reducoes.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Maiores Aumentos */}
            {relatorio.maiores_aumentos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Maiores Aumentos</CardTitle>
                  <CardDescription>Top 3 categorias com maior aumento</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {relatorio.maiores_aumentos.map((comp, index) => (
                      <div key={comp.categoria_id} className="flex items-center gap-3">
                        <Badge
                          variant="destructive"
                          className="w-6 h-6 flex items-center justify-center p-0"
                        >
                          {index + 1}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium">{comp.categoria_nome}</p>
                          <p className="text-sm text-muted-foreground">
                            R$ {comp.mes_anterior.toFixed(2)} → R$ {comp.mes_atual.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">
                            +R$ {comp.variacao_absoluta.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            +{comp.variacao_percentual.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Maiores Reduções */}
            {relatorio.maiores_reducoes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Maiores Reduções</CardTitle>
                  <CardDescription>Top 3 categorias com maior economia</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {relatorio.maiores_reducoes.map((comp, index) => (
                      <div key={comp.categoria_id} className="flex items-center gap-3">
                        <Badge className="w-6 h-6 flex items-center justify-center p-0 bg-green-600 text-white">
                          {index + 1}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium">{comp.categoria_nome}</p>
                          <p className="text-sm text-muted-foreground">
                            R$ {comp.mes_anterior.toFixed(2)} → R$ {comp.mes_atual.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            R$ {comp.variacao_absoluta.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {comp.variacao_percentual.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Gastos Recorrentes */}
        {recorrentes.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-gold" />
                <div>
                  <CardTitle>Gastos Recorrentes</CardTitle>
                  <CardDescription>
                    {recorrentes.length} despesas que se repetem mensalmente
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recorrentes.slice(0, 10).map((rec) => (
                  <div
                    key={rec.descricao}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {rec.categoria_icone && (
                        <span className="text-lg shrink-0">{rec.categoria_icone}</span>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{rec.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {rec.categoria_nome} · Presente em {rec.meses_presente}/{rec.total_meses} meses
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-semibold text-foreground">
                        R$ {rec.valor_medio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">média/mês</p>
                    </div>
                  </div>
                ))}
              </div>
              {recorrentes.length > 10 && (
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  +{recorrentes.length - 10} outros gastos recorrentes
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Padrão por Dia da Semana + Previsão Próximo Mês */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Padrão por Dia da Semana */}
          {padraoDia.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Padrão por Dia da Semana</CardTitle>
                    <CardDescription>Quando você mais gasta</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const maxVal = Math.max(...padraoDia.map((d) => d.total_despesas))
                  return (
                    <div className="space-y-3">
                      {padraoDia.map((dia) => (
                        <div key={dia.dia} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-8 shrink-0 text-foreground">
                            {dia.dia}
                          </span>
                          <div className="flex-1">
                            <div
                              className="h-6 rounded bg-primary"
                              style={{
                                width: `${maxVal > 0 ? (dia.total_despesas / maxVal) * 100 : 0}%`,
                                minWidth: dia.total_despesas > 0 ? '4px' : '0',
                              }}
                            />
                          </div>
                          <div className="text-right shrink-0 w-28">
                            <span className="text-sm font-medium text-foreground">
                              R$ {dia.total_despesas.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({dia.quantidade_transacoes})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}

          {/* Previsão Próximo Mês */}
          {previsao && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-gold" />
                  <div>
                    <CardTitle>Previsão Próximo Mês</CardTitle>
                    <CardDescription>
                      Estimativa baseada nos últimos 3 meses · Confiança:{' '}
                      <span
                        className={cn(
                          'font-medium',
                          previsao.confianca === 'alta'
                            ? 'text-success'
                            : previsao.confianca === 'media'
                              ? 'text-gold'
                              : 'text-destructive'
                        )}
                      >
                        {previsao.confianca}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded border">
                      <p className="text-xs text-muted-foreground">Receitas</p>
                      <p className="text-sm font-semibold text-success">
                        R$ {previsao.total_receitas_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="text-center p-2 rounded border">
                      <p className="text-xs text-muted-foreground">Despesas</p>
                      <p className="text-sm font-semibold text-destructive">
                        R$ {previsao.total_despesas_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="text-center p-2 rounded border">
                      <p className="text-xs text-muted-foreground">Resultado</p>
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          previsao.total_previsto >= 0 ? 'text-success' : 'text-destructive'
                        )}
                      >
                        R$ {previsao.total_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  {/* Per-category forecast */}
                  <div className="space-y-2">
                    {previsao.categorias.map((cat) => (
                      <div
                        key={cat.categoria_nome}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {cat.categoria_icone && <span>{cat.categoria_icone}</span>}
                          <span className="text-foreground">{cat.categoria_nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-medium">
                            R$ {cat.valor_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          {cat.tendencia === 'aumento' && (
                            <TrendingUp className="h-3 w-3 text-red-500" />
                          )}
                          {cat.tendencia === 'reducao' && (
                            <TrendingDown className="h-3 w-3 text-green-500" />
                          )}
                          {cat.tendencia === 'estavel' && (
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quadro final: Relatório por IA (3 meses) + gráficos (somente após gerar) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Relatório por IA (3 meses)</CardTitle>
              <CardDescription>
                Gere recomendações personalizadas e visualize os gráficos relacionados
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={generateAIAnalysis} disabled={aiLoading}>
                {aiLoading ? 'Gerando...' : 'Gerar análise'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!aiResult && !aiLoading && (
              <p className="text-sm text-muted-foreground">
                Clique em &quot;Gerar análise&quot; para obter recomendações e gráficos.
              </p>
            )}
            {aiResult && (
              <>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Resumo</h3>
                    <p className="text-sm text-muted-foreground">{aiResult.resumo}</p>
                  </div>
                  {aiResult.recomendacoes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Recomendações</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {aiResult.recomendacoes.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiResult.oportunidades.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Oportunidades</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {aiResult.oportunidades.map((op, idx) => (
                          <li key={idx}>{op}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiResult.alertas.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Alertas</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {aiResult.alertas.map((al, idx) => (
                          <li key={idx}>{al}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <CashFlowChart />
                  <ExpenseTrendsChart />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
