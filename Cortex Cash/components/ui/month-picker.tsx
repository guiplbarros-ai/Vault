'use client'

import * as React from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DateRange } from 'react-day-picker'

export interface MonthPickerProps {
  value?: Date
  onChange?: (date: Date) => void
  onRangeChange?: (range: DateRange | undefined) => void
  className?: string
  mode?: 'day' | 'month' | 'range'
}

const MONTHS = [
  'JAN', 'FEV', 'MAR', 'ABR',
  'MAI', 'JUN', 'JUL', 'AGO',
  'SET', 'OUT', 'NOV', 'DEZ'
]

export function MonthPicker({
  value = new Date(),
  onChange,
  onRangeChange,
  className,
  mode = 'month',
}: MonthPickerProps) {
  const [selectedDate, setSelectedDate] = React.useState(value)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined)
  const [calendarYear, setCalendarYear] = React.useState(selectedDate.getFullYear())
  const [isOpen, setIsOpen] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<'day' | 'month' | 'range'>(mode)

  React.useEffect(() => {
    setSelectedDate(value)
    setCalendarYear(value.getFullYear())
  }, [value])

  const handlePrevious = () => {
    const newDate = viewMode === 'day' ? subDays(selectedDate, 1) : subMonths(selectedDate, 1)
    setSelectedDate(newDate)
    onChange?.(newDate)
  }

  const handleNext = () => {
    const newDate = viewMode === 'day' ? addDays(selectedDate, 1) : addMonths(selectedDate, 1)
    setSelectedDate(newDate)
    onChange?.(newDate)
  }

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(calendarYear, monthIndex, 1)
    setSelectedDate(newDate)
    onChange?.(newDate)
    setIsOpen(false)
  }

  const handleDaySelect = (date: Date | undefined) => {
    if (!date) return
    setSelectedDate(date)
    onChange?.(date)
    setIsOpen(false)
  }

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    onRangeChange?.(range)
    // Só fecha quando ambas as datas estiverem selecionadas
    if (range?.from && range?.to) {
      setIsOpen(false)
    }
  }

  const handleToday = () => {
    const now = new Date()
    setSelectedDate(now)
    setCalendarYear(now.getFullYear())

    if (viewMode === 'range') {
      // Para range, define início do mês até hoje
      const range = { from: startOfMonth(now), to: now }
      setDateRange(range)
      onRangeChange?.(range)
    } else {
      onChange?.(now)
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  const handlePreviousYear = () => {
    setCalendarYear(prev => prev - 1)
  }

  const handleNextYear = () => {
    setCalendarYear(prev => prev + 1)
  }

  const currentMonth = selectedDate.getMonth()
  const isCurrentMonth = (monthIndex: number) =>
    monthIndex === currentMonth && calendarYear === selectedDate.getFullYear()

  const getDisplayText = () => {
    if (viewMode === 'range' && dateRange?.from) {
      if (!dateRange.to) {
        return format(dateRange.from, "dd 'de' MMM", { locale: ptBR })
      }
      return `${format(dateRange.from, 'dd/MM', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM', { locale: ptBR })}`
    }
    if (viewMode === 'day') {
      return format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
    }
    return format(selectedDate, 'MMMM', { locale: ptBR })
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        size="icon"
        onClick={handlePrevious}
        variant="outline"
        className="h-10 w-10 rounded-lg"
        aria-label={viewMode === 'day' ? 'Dia anterior' : 'Mês anterior'}
      >
        <ChevronLeft className="h-5 w-5 text-foreground" />
        <span className="sr-only">{viewMode === 'day' ? 'Dia anterior' : 'Mês anterior'}</span>
      </Button>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              "h-10 min-w-[180px] justify-center font-medium capitalize gap-2",
              "rounded-lg text-sm [&>svg]:stroke-white"
            )}
            variant="default"
          >
            <CalendarIcon className="h-4 w-4 stroke-white" style={{ strokeWidth: 2 }} />
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 rounded-2xl bg-popover text-popover-foreground border border-border"
          align="center"
        >
          <div className="bg-gradient-to-br from-primary/30 to-primary/20 text-foreground p-4 rounded-t-2xl border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'month' | 'range')}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="range">Período</SelectItem>
                  <SelectItem value="day">Dia Específico</SelectItem>
                  <SelectItem value="month">Mês Inteiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {viewMode === 'month' && (
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousYear}
                  className="h-10 w-10 rounded-lg"
                  aria-label="Ano anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="sr-only">Ano anterior</span>
                </Button>
                <div className="text-2xl font-bold">
                  {calendarYear}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextYear}
                  className="h-10 w-10 rounded-lg"
                  aria-label="Próximo ano"
                >
                  <ChevronRight className="h-5 w-5" />
                  <span className="sr-only">Próximo ano</span>
                </Button>
              </div>
            )}
          </div>

          <div className="p-6 bg-popover rounded-b-2xl">
            {viewMode === 'month' ? (
              <>
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {MONTHS.map((month, index) => (
                    <button
                      key={month}
                      onClick={() => handleMonthSelect(index)}
                      className={cn(
                        "h-12 rounded-lg font-medium text-sm transition-all",
                        "hover:bg-accent hover:text-accent-foreground",
                        isCurrentMonth(index)
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "text-muted-foreground"
                      )}
                    >
                      {month}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border gap-3">
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    className="flex-1 font-semibold rounded-lg h-10"
                  >
                    CANCELAR
                  </Button>
                  <Button
                    onClick={handleToday}
                    className="flex-1 font-semibold rounded-lg h-10"
                    variant="default"
                  >
                    HOJE
                  </Button>
                </div>
              </>
            ) : viewMode === 'range' ? (
              <>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleRangeSelect}
                  locale={ptBR}
                  defaultMonth={selectedDate}
                  initialFocus
                  numberOfMonths={2}
                />
                <div className="flex items-center justify-between pt-4 border-t border-border gap-3 mt-4">
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    className="flex-1 font-semibold rounded-lg h-10"
                  >
                    CANCELAR
                  </Button>
                  <Button
                    onClick={handleToday}
                    className="flex-1 font-semibold rounded-lg h-10"
                    variant="default"
                  >
                    MÊS ATÉ HOJE
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDaySelect}
                  locale={ptBR}
                  defaultMonth={selectedDate}
                  initialFocus
                />
                <div className="flex items-center justify-between pt-4 border-t border-border gap-3 mt-4">
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    className="flex-1 font-semibold rounded-lg h-10"
                  >
                    CANCELAR
                  </Button>
                  <Button
                    onClick={handleToday}
                    className="flex-1 font-semibold rounded-lg h-10"
                    variant="default"
                  >
                    HOJE
                  </Button>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        size="icon"
        onClick={handleNext}
        variant="outline"
        className="h-10 w-10 rounded-lg"
        aria-label={viewMode === 'day' ? 'Próximo dia' : 'Próximo mês'}
      >
        <ChevronRight className="h-5 w-5 text-foreground" />
        <span className="sr-only">{viewMode === 'day' ? 'Próximo dia' : 'Próximo mês'}</span>
      </Button>
    </div>
  )
}

