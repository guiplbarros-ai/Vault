'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TimelineNavigatorProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  mode: 'month' | '3-months' | '6-months' | '12-months'
  onModeChange: (mode: 'month' | '3-months' | '6-months' | '12-months') => void
}

export function TimelineNavigator({
  currentDate,
  onDateChange,
  mode,
  onModeChange,
}: TimelineNavigatorProps) {
  const isCurrentMonth = isSameMonth(currentDate, new Date())

  const handlePrevious = () => {
    if (mode === 'month') {
      onDateChange(subMonths(currentDate, 1))
    } else if (mode === '3-months') {
      onDateChange(subMonths(currentDate, 3))
    } else if (mode === '6-months') {
      onDateChange(subMonths(currentDate, 6))
    } else if (mode === '12-months') {
      onDateChange(subMonths(currentDate, 12))
    }
  }

  const handleNext = () => {
    const nextDate =
      mode === 'month'
        ? addMonths(currentDate, 1)
        : mode === '3-months'
          ? addMonths(currentDate, 3)
          : mode === '6-months'
            ? addMonths(currentDate, 6)
            : addMonths(currentDate, 12)

    // Não permitir avançar além do mês atual
    if (isSameMonth(nextDate, new Date()) || nextDate < new Date()) {
      onDateChange(nextDate)
    }
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  const getDateRangeLabel = () => {
    if (mode === 'month') {
      return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
    }

    const endDate =
      mode === '3-months'
        ? addMonths(currentDate, 2)
        : mode === '6-months'
          ? addMonths(currentDate, 5)
          : addMonths(currentDate, 11)

    return `${format(currentDate, 'MMM/yy', { locale: ptBR })} - ${format(endDate, 'MMM/yy', { locale: ptBR })}`
  }

  const modeLabels = {
    month: 'Mensal',
    '3-months': '3 Meses',
    '6-months': '6 Meses',
    '12-months': '12 Meses',
  }

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {(Object.keys(modeLabels) as Array<keyof typeof modeLabels>).map((modeKey) => (
          <button
            key={modeKey}
            onClick={() => onModeChange(modeKey)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              mode === modeKey
                ? 'bg-brand text-brand-contrast shadow-card'
                : 'bg-slate-100 dark:bg-graphite-700 text-slate-900 dark:text-graphite-100 hover:bg-white dark:bg-graphite-800'
            }`}
          >
            {modeLabels[modeKey]}
          </button>
        ))}
      </div>

      {/* Timeline Navigator */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-graphite-700/25 bg-white dark:bg-graphite-800 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevious}
          className="h-10 w-10 p-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-1 items-center justify-center gap-3">
          <div className="text-center">
            <p className="text-lg font-semibold capitalize text-slate-900 dark:text-graphite-100">{getDateRangeLabel()}</p>
            <p className="text-xs text-slate-600 dark:text-graphite-300">
              {mode === 'month' && 'Visualização mensal'}
              {mode === '3-months' && 'Últimos 3 meses'}
              {mode === '6-months' && 'Últimos 6 meses'}
              {mode === '12-months' && 'Últimos 12 meses'}
            </p>
          </div>

          {!isCurrentMonth && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToday}
              className="ml-4"
            >
              Hoje
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={isCurrentMonth}
          className="h-10 w-10 p-0 disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
