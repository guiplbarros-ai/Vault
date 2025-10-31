'use client'

import * as React from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface MonthPickerProps {
  value?: Date
  onChange?: (date: Date) => void
  className?: string
}

const MONTHS = [
  'JAN', 'FEV', 'MAR', 'ABR',
  'MAI', 'JUN', 'JUL', 'AGO',
  'SET', 'OUT', 'NOV', 'DEZ'
]

export function MonthPicker({
  value = new Date(),
  onChange,
  className,
}: MonthPickerProps) {
  const [selectedDate, setSelectedDate] = React.useState(value)
  const [calendarYear, setCalendarYear] = React.useState(selectedDate.getFullYear())
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    setSelectedDate(value)
    setCalendarYear(value.getFullYear())
  }, [value])

  const handlePreviousMonth = () => {
    const newDate = subMonths(selectedDate, 1)
    setSelectedDate(newDate)
    onChange?.(newDate)
  }

  const handleNextMonth = () => {
    const newDate = addMonths(selectedDate, 1)
    setSelectedDate(newDate)
    onChange?.(newDate)
  }

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(calendarYear, monthIndex, 1)
    setSelectedDate(newDate)
    onChange?.(newDate)
    setIsOpen(false)
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    setSelectedDate(now)
    setCalendarYear(now.getFullYear())
    onChange?.(now)
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

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        size="icon"
        onClick={handlePreviousMonth}
        className="h-10 w-10 rounded-lg border-0 text-white transition-all"
        style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              "h-10 flex-1 justify-center font-medium capitalize",
              "rounded-lg border-0 text-white",
              "transition-all",
              "text-sm"
            )}
            style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
          >
            {format(selectedDate, 'MMMM', { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[340px] p-0 rounded-2xl border-white/20 bg-slate-800"
          align="center"
        >
          <div className="bg-gradient-to-br from-primary/30 to-primary/20 text-white p-4 rounded-t-2xl border-b border-white/20">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousYear}
                className="h-10 w-10 text-white hover:bg-white/10 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-2xl font-bold text-white">
                {calendarYear}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextYear}
                className="h-10 w-10 text-white hover:bg-white/10 rounded-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="p-6 bg-slate-800 rounded-b-2xl">
            <div className="grid grid-cols-4 gap-3 mb-6">
              {MONTHS.map((month, index) => (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(index)}
                  className={cn(
                    "h-12 rounded-lg font-medium text-sm transition-all",
                    "hover:bg-white/10",
                    isCurrentMonth(index)
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  {month}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/20 gap-3">
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="flex-1 text-white/70 hover:text-white hover:bg-white/10 font-semibold rounded-lg h-10"
              >
                CANCELAR
              </Button>
              <Button
                onClick={handleCurrentMonth}
                className="flex-1 bg-primary text-white hover:bg-primary/90 font-semibold rounded-lg h-10"
                style={{ backgroundColor: '#18B0A4', color: '#ffffff' }}
              >
                MÊS ATUAL
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        size="icon"
        onClick={handleNextMonth}
        className="h-10 w-10 rounded-lg border-0 text-white transition-all"
        style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

