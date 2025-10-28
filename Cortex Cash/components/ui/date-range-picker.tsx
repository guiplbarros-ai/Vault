'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'
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
import {
  DATE_RANGES,
  DATE_RANGE_LABELS,
  getDateRangePeriod,
  type DateRange as DateRangeType,
} from '@/lib/constants'

export interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showPresets?: boolean
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Selecione um período',
  disabled = false,
  className,
  showPresets = true,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<DateRangeType | null>(null)

  const handlePresetChange = (preset: DateRangeType) => {
    if (preset === DATE_RANGES.CUSTOM) {
      setSelectedPreset(preset)
      return
    }

    const period = getDateRangePeriod(preset)
    setSelectedPreset(preset)
    onChange?.({
      from: period.startDate,
      to: period.endDate,
    })
  }

  const handleDateSelect = (range: DateRange | undefined) => {
    if (onChange) {
      onChange(range)
    }
    if (range?.from || range?.to) {
      setSelectedPreset(DATE_RANGES.CUSTOM)
    }
  }

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return placeholder

    if (!range.to) {
      return format(range.from, 'dd/MM/yyyy', { locale: ptBR })
    }

    return `${format(range.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(range.to, 'dd/MM/yyyy', { locale: ptBR })}`
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {showPresets && (
              <div className="border-r p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium mb-2">Períodos</p>
                  <Select value={selectedPreset || ''} onValueChange={(val) => handlePresetChange(val as DateRangeType)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DATE_RANGE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={value?.from}
                selected={value}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                locale={ptBR}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
