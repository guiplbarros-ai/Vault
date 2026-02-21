'use client'

import { Card } from '@/components/ui/card'
import { THEME_COLORS } from '@/lib/constants/colors'
import { orcamentoService } from '@/lib/services/orcamento.service'
import { patrimonioService } from '@/lib/services/patrimonio.service'
import { transacaoService } from '@/lib/services/transacao.service'
import { endOfMonth, startOfMonth, subMonths } from 'date-fns'
import { AlertTriangle, CheckCircle2, Loader2, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface HealthScore {
  total: number
  grade: string
  gradeColor: string
  components: {
    label: string
    score: number
    maxScore: number
    detail: string
  }[]
  recommendations: string[]
}

function calculateGrade(score: number): { grade: string; color: string } {
  if (score >= 85) return { grade: 'A', color: THEME_COLORS.success }
  if (score >= 70) return { grade: 'B', color: THEME_COLORS.link }
  if (score >= 55) return { grade: 'C', color: THEME_COLORS.warning }
  if (score >= 40) return { grade: 'D', color: THEME_COLORS.money }
  return { grade: 'F', color: THEME_COLORS.error }
}

export function FinancialHealthScore() {
  const [score, setScore] = useState<HealthScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function calculateScore() {
      try {
        setLoading(true)
        const now = new Date()
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)

        // Fetch all data in parallel
        const [
          currentTransactions,
          prevMonth1Transactions,
          prevMonth2Transactions,
          patrimonio,
          snapshots,
          orcamentoStats,
        ] = await Promise.all([
          transacaoService.listTransacoes({ dataInicio: monthStart, dataFim: monthEnd }),
          transacaoService.listTransacoes({
            dataInicio: startOfMonth(subMonths(now, 1)),
            dataFim: endOfMonth(subMonths(now, 1)),
          }),
          transacaoService.listTransacoes({
            dataInicio: startOfMonth(subMonths(now, 2)),
            dataFim: endOfMonth(subMonths(now, 2)),
          }),
          patrimonioService.getPatrimonioTotal(),
          patrimonioService.getSnapshots(),
          orcamentoService.getResumoMensal(
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
          ).catch(() => null),
        ])

        if (!mounted) return

        // 1. Savings Rate (30 pts) — >20% = 30pts, 0% = 15pts, <0% = 0pts
        const income = currentTransactions
          .filter((t) => t.tipo === 'receita')
          .reduce((s, t) => s + Math.abs(t.valor), 0)
        const expenses = currentTransactions
          .filter((t) => t.tipo === 'despesa')
          .reduce((s, t) => s + Math.abs(t.valor), 0)
        const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0

        let savingsScore = 0
        if (savingsRate >= 20) savingsScore = 30
        else if (savingsRate >= 10) savingsScore = 22
        else if (savingsRate >= 0) savingsScore = 15
        else savingsScore = Math.max(0, 15 + savingsRate * 0.5)

        // 2. Diversification (20 pts) — % invested of total patrimony
        const investmentPct =
          patrimonio.patrimonio_total > 0
            ? (patrimonio.saldo_investimentos / patrimonio.patrimonio_total) * 100
            : 0
        let diversScore = 0
        if (investmentPct >= 50) diversScore = 20
        else if (investmentPct >= 30) diversScore = 15
        else if (investmentPct >= 10) diversScore = 10
        else diversScore = Math.round(investmentPct / 2)

        // 3. Classification (15 pts) — % of transactions with category
        const allRecentTx = [...currentTransactions, ...prevMonth1Transactions, ...prevMonth2Transactions]
        const classified = allRecentTx.filter((t) => t.categoria_id).length
        const classificationPct = allRecentTx.length > 0 ? (classified / allRecentTx.length) * 100 : 0
        const classScore = Math.round((classificationPct / 100) * 15)

        // 4. Budget adherence (15 pts) — % of categories within budget
        let budgetScore = 0
        let budgetDetail = 'Sem orçamentos'
        if (orcamentoStats && orcamentoStats.total_planejado > 0) {
          const total = orcamentoStats.orcamentos_ok + orcamentoStats.orcamentos_atencao + orcamentoStats.orcamentos_excedidos
          if (total > 0) {
            const withinBudget = orcamentoStats.orcamentos_ok + orcamentoStats.orcamentos_atencao
            const adherencePct = (withinBudget / total) * 100
            budgetScore = Math.round((adherencePct / 100) * 15)
            budgetDetail = `${withinBudget}/${total} categorias no budget`
          }
        }

        // 5. Patrimony trend (20 pts) — growing vs declining over last 3 months
        let trendScore = 10 // Neutral default
        let trendDetail = 'Sem histórico'
        if (snapshots.length >= 2) {
          const recent = snapshots[snapshots.length - 1]!
          const older = snapshots[Math.max(0, snapshots.length - 3)]!
          const change = recent.patrimonio_total - older.patrimonio_total
          const changePct = older.patrimonio_total !== 0
            ? (change / Math.abs(older.patrimonio_total)) * 100
            : 0

          if (changePct >= 5) trendScore = 20
          else if (changePct >= 2) trendScore = 16
          else if (changePct >= 0) trendScore = 12
          else if (changePct >= -5) trendScore = 6
          else trendScore = 0

          trendDetail = changePct >= 0
            ? `+${changePct.toFixed(1)}% nos últimos meses`
            : `${changePct.toFixed(1)}% nos últimos meses`
        }

        const totalScore = Math.round(savingsScore + diversScore + classScore + budgetScore + trendScore)
        const { grade, color } = calculateGrade(totalScore)

        // Build recommendations (top 3 priorities)
        const recs: { priority: number; text: string }[] = []

        if (classificationPct < 80) {
          const uncategorized = allRecentTx.length - classified
          recs.push({ priority: 1, text: `Categorize ${uncategorized} transações pendentes` })
        }
        if (!orcamentoStats || orcamentoStats.total_planejado === 0) {
          recs.push({ priority: 2, text: 'Crie orçamentos para controlar seus gastos' })
        }
        if (orcamentoStats && orcamentoStats.orcamentos_excedidos > 0) {
          recs.push({ priority: 2, text: `${orcamentoStats.orcamentos_excedidos} categorias excederam o orçamento` })
        }
        if (savingsRate < 10) {
          recs.push({ priority: 3, text: 'Aumente sua taxa de economia para pelo menos 10%' })
        }
        if (savingsRate >= 20) {
          recs.push({ priority: 5, text: `Taxa de economia de ${savingsRate.toFixed(0)}% — continue assim!` })
        }
        if (investmentPct < 30) {
          recs.push({ priority: 4, text: 'Diversifique: aumente a parcela investida do patrimônio' })
        }
        if (snapshots.length >= 2) {
          const recent = snapshots[snapshots.length - 1]!
          const older = snapshots[Math.max(0, snapshots.length - 3)]!
          if (recent.patrimonio_total > older.patrimonio_total) {
            recs.push({ priority: 5, text: `Patrimônio crescendo — bom trabalho!` })
          }
        }

        recs.sort((a, b) => a.priority - b.priority)

        setScore({
          total: totalScore,
          grade,
          gradeColor: color,
          components: [
            { label: 'Economias', score: Math.round(savingsScore), maxScore: 30, detail: `${savingsRate.toFixed(0)}% do mês` },
            { label: 'Diversificação', score: diversScore, maxScore: 20, detail: `${investmentPct.toFixed(0)}% investido` },
            { label: 'Classificação', score: classScore, maxScore: 15, detail: `${classificationPct.toFixed(0)}% categorizado` },
            { label: 'Orçamento', score: budgetScore, maxScore: 15, detail: budgetDetail },
            { label: 'Tendência', score: trendScore, maxScore: 20, detail: trendDetail },
          ],
          recommendations: recs.slice(0, 3).map((r) => r.text),
        })
      } catch (error) {
        console.error('Erro ao calcular score financeiro:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    calculateScore()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <Card className="glass-card-3d p-6 flex items-center justify-center" style={{ minHeight: '300px' }}>
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </Card>
    )
  }

  if (!score) return null

  return (
    <Card className="glass-card-3d p-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Score gauge */}
        <div className="flex flex-col items-center justify-center min-w-[160px]">
          <div
            className="relative w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(${score.gradeColor} ${score.total * 3.6}deg, ${THEME_COLORS.border} 0deg)`,
            }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ backgroundColor: THEME_COLORS.bgCard }}
            >
              <div className="text-center">
                <span className="text-3xl font-bold" style={{ color: score.gradeColor }}>
                  {score.grade}
                </span>
                <p className="text-xs text-secondary">{score.total}/100</p>
              </div>
            </div>
          </div>
          <h3 className="text-lg font-bold text-foreground mt-3">Score Financeiro</h3>
        </div>

        {/* Components breakdown */}
        <div className="flex-1 space-y-3">
          {score.components.map((comp) => (
            <div key={comp.label} className="flex items-center gap-3">
              <span className="text-sm text-secondary w-28 shrink-0">{comp.label}</span>
              <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: THEME_COLORS.border }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(comp.score / comp.maxScore) * 100}%`,
                    backgroundColor: comp.score / comp.maxScore >= 0.7
                      ? '#22C55E'
                      : comp.score / comp.maxScore >= 0.4
                        ? '#EAB308'
                        : '#EF4444',
                  }}
                />
              </div>
              <span className="text-xs text-secondary w-20 text-right shrink-0">
                {comp.score}/{comp.maxScore}
              </span>
              <span className="text-xs text-muted-foreground w-32 text-right shrink-0 hidden lg:block">
                {comp.detail}
              </span>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div className="min-w-[220px] space-y-2">
          <h4 className="text-sm font-semibold text-foreground mb-2">Recomendações</h4>
          {score.recommendations.map((rec, i) => {
            const isPositive = rec.includes('continue') || rec.includes('bom trabalho')
            return (
              <div key={i} className="flex items-start gap-2">
                {isPositive ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                ) : rec.includes('excederam') ? (
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                )}
                <span className="text-xs text-secondary">{rec}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

export default FinancialHealthScore
