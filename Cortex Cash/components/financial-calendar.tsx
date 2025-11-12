'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLocalizationSettings } from '@/app/providers/settings-provider'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { transacaoService } from '@/lib/services/transacao.service'
import { categoriaService } from '@/lib/services/categoria.service'
import type { Transacao, Categoria } from '@/lib/types'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DayData {
  date: Date
  receita: number
  despesa: number
  resultado: number
  transacoes: Transacao[]
  isCurrentMonth: boolean
}

export function FinancialCalendar() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transacao[]>([])
  const [categorias, setCategorias] = useState<Record<string, Categoria>>({})
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const { formatCurrency } = useLocalizationSettings()

  useEffect(() => {
    loadData()
  }, [selectedMonth])

  const loadData = async () => {
    try {
      setLoading(true)
      const monthStart = startOfMonth(selectedMonth)
      const monthEnd = endOfMonth(selectedMonth)

      const [transacoesData, categoriasData] = await Promise.all([
        transacaoService.listTransacoes({
          dataInicio: monthStart,
          dataFim: monthEnd,
          sortBy: 'data',
          sortOrder: 'asc'
        }),
        categoriaService.listCategorias()
      ])

      // Cria mapa de categorias para lookup rápido
      const categoriasMap = categoriasData.reduce((acc, cat) => {
        acc[cat.id] = cat
        return acc
      }, {} as Record<string, Categoria>)

      setTransactions(transacoesData)
      setCategorias(categoriasMap)
    } catch (error) {
      console.error('Erro ao carregar transações do calendário:', error)
    } finally {
      setLoading(false)
    }
  }

  // Gera dias do calendário (incluindo dias de preenchimento do mês anterior/posterior)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth)
    const monthEnd = endOfMonth(selectedMonth)

    // Pega o primeiro dia da semana (domingo = 0, segunda = 1, etc)
    const startDay = monthStart.getDay()

    // Calcula dias para preencher antes do primeiro dia do mês
    const daysToAdd = startDay // Se começar em domingo (0), adiciona 0 dias
    const calendarStart = new Date(monthStart)
    calendarStart.setDate(calendarStart.getDate() - daysToAdd)

    // Gera array de 42 dias (6 semanas completas)
    const days: DayData[] = []
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(calendarStart)
      currentDate.setDate(calendarStart.getDate() + i)

      const isCurrentMonth = isSameMonth(currentDate, selectedMonth)

      // Filtra transações deste dia
      const dayTransactions = transactions.filter(t =>
        isSameDay(new Date(t.data), currentDate)
      )

      // Calcula totais
      const receita = dayTransactions
        .filter(t => t.tipo === 'receita')
        .reduce((sum, t) => sum + Number(t.valor), 0)

      const despesa = dayTransactions
        .filter(t => t.tipo === 'despesa')
        .reduce((sum, t) => sum + Math.abs(Number(t.valor)), 0)

      const resultado = receita - despesa

      days.push({
        date: currentDate,
        receita,
        despesa,
        resultado,
        transacoes: dayTransactions,
        isCurrentMonth
      })
    }

    return days
  }, [selectedMonth, transactions])

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1))
  }

  const handleToday = () => {
    setSelectedMonth(new Date())
  }

  const formatCompactCurrency = (value: number) => {
    const abs = Math.abs(value)
    if (abs >= 10000) {
      return `${(value / 1000).toFixed(0)}k`
    } else if (abs >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toFixed(0)
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <Card className="glass-card-3d overflow-hidden">
      {/* Header */}
      <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/40">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-primary/10">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-card-foreground">
                Calendário Financeiro
              </h3>
              <p className="text-sm text-muted-foreground">
                Receitas e despesas por dia
              </p>
            </div>
          </div>

          {/* Navegação de mês */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousMonth}
              className="h-12 w-12 p-0 rounded-2xl bg-card/50 hover:bg-card/80 border border-border/40 transition-all duration-200"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Button
              onClick={handleToday}
              variant="default"
              className="h-12 min-w-[200px] rounded-2xl font-semibold text-base shadow-lg shadow-primary/20 transition-all duration-200 capitalize [&>svg]:stroke-white"
            >
              <CalendarIcon className="h-4 w-4 mr-2 stroke-white" style={{ strokeWidth: 2 }} />
              {format(selectedMonth, 'MMMM', { locale: ptBR })}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="h-12 w-12 p-0 rounded-2xl bg-card/50 hover:bg-card/80 border border-border/40 transition-all duration-200"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo do calendário */}
      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Carregando calendário...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map(day => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grade do calendário - 6 semanas */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const hasTransactions = day.transacoes.length > 0
                const isToday = isSameDay(day.date, new Date())
                const isHovered = hoveredDay === index

                return (
                  <div
                    key={index}
                    onMouseEnter={() => setHoveredDay(index)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`
                      relative rounded-lg border p-2.5 min-h-[110px] transition-all duration-200 cursor-pointer
                      ${day.isCurrentMonth
                        ? 'border-border hover:shadow-lg'
                        : 'bg-muted/20 border-border/20 opacity-30'
                      }
                      ${isToday ? 'ring-2 ring-primary shadow-xl' : ''}
                    `}
                    style={day.isCurrentMonth ? {
                      backgroundColor: isHovered
                        ? '#2d5f52'
                        : isToday
                          ? '#2a5649'
                          : '#265045',
                      borderColor: isHovered ? '#3a6456' : undefined
                    } : undefined}
                  >
                    {/* Número do dia */}
                    <div className={`
                      text-sm font-bold mb-2
                      ${isToday
                        ? 'text-primary'
                        : day.isCurrentMonth
                          ? 'text-card-foreground'
                          : 'text-muted-foreground'
                      }
                    `}>
                      {format(day.date, 'd')}
                    </div>

                    {/* Valores financeiros */}
                    {hasTransactions && day.isCurrentMonth && (
                      <div className="space-y-1.5">
                        {/* Receita */}
                        {day.receita > 0 && (
                          <div className="flex items-center justify-between text-[11px] gap-1">
                            <span className="font-medium" style={{ color: '#6CCB8C' }}>+</span>
                            <span className="font-bold tabular-nums" style={{ color: '#6CCB8C' }}>
                              {formatCompactCurrency(day.receita)}
                            </span>
                          </div>
                        )}

                        {/* Despesa */}
                        {day.despesa > 0 && (
                          <div className="flex items-center justify-between text-[11px] gap-1">
                            <span className="font-medium" style={{ color: '#F07167' }}>-</span>
                            <span className="font-bold tabular-nums" style={{ color: '#F07167' }}>
                              {formatCompactCurrency(day.despesa)}
                            </span>
                          </div>
                        )}

                        {/* Indicador de quantidade de transações */}
                        <div className="absolute bottom-1.5 right-1.5">
                          <div className="text-[10px] font-medium text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded">
                            {day.transacoes.length}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dia sem transações mas no mês atual */}
                    {!hasTransactions && day.isCurrentMonth && (
                      <div className="text-center pt-2">
                        <span className="text-xs text-muted-foreground/40">—</span>
                      </div>
                    )}

                    {/* Tooltip com detalhes das transações */}
                    {isHovered && hasTransactions && day.isCurrentMonth && (
                      <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 pointer-events-none">
                        <div
                          className="rounded-xl shadow-2xl p-4 border-2 border-primary/60"
                          style={{
                            background: 'rgba(18, 50, 44, 0.98)',
                            backdropFilter: 'blur(24px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          {/* Header do tooltip */}
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-primary/30">
                            <span className="text-sm font-bold text-white">
                              {format(day.date, "d 'de' MMMM", { locale: ptBR })}
                            </span>
                            <span className="text-xs font-medium text-white/70">
                              {day.transacoes.length} {day.transacoes.length === 1 ? 'transação' : 'transações'}
                            </span>
                          </div>

                          {/* Lista de transações */}
                          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {day.transacoes.map((transacao, idx) => {
                              const categoria = transacao.categoria_id ? categorias[transacao.categoria_id] : null
                              return (
                                <div
                                  key={idx}
                                  className="flex items-start justify-between gap-2 p-2.5 rounded-lg transition-colors"
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                  }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-white truncate">
                                      {transacao.descricao}
                                    </p>
                                    {categoria && (
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-[10px]">{categoria.icone}</span>
                                        <p className="text-[10px] text-white/60 truncate">
                                          {categoria.nome}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <span
                                    className="text-xs font-bold tabular-nums flex-shrink-0"
                                    style={{
                                      color: transacao.tipo === 'receita' ? '#6CCB8C' : '#F07167'
                                    }}
                                  >
                                    {transacao.tipo === 'receita' ? '+' : '-'}{formatCurrency(Math.abs(Number(transacao.valor)))}
                                  </span>
                                </div>
                              )
                            })}
                          </div>

                          {/* Footer com totais */}
                          <div className="mt-3 pt-3 border-t border-primary/30 space-y-2">
                            {day.receita > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-white/70 font-medium">Total Receitas:</span>
                                <span className="font-bold" style={{ color: '#6CCB8C' }}>+{formatCurrency(day.receita)}</span>
                              </div>
                            )}
                            {day.despesa > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-white/70 font-medium">Total Despesas:</span>
                                <span className="font-bold" style={{ color: '#F07167' }}>-{formatCurrency(day.despesa)}</span>
                              </div>
                            )}
                          </div>

                          {/* Seta do tooltip */}
                          <div
                            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent"
                            style={{
                              borderTopColor: 'rgba(18, 50, 44, 0.98)',
                              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legenda */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: '#6CCB8C' }}>+</span>
                <span className="text-xs font-medium text-muted-foreground">Receitas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: '#F07167' }}>−</span>
                <span className="text-xs font-medium text-muted-foreground">Despesas</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default FinancialCalendar
