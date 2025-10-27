'use client'

import { Building2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BankOption {
  id: string
  name: string
  icon: string
  color: string
}

const banks: BankOption[] = [
  { id: 'auto', name: 'Detecção Automática', icon: '🤖', color: 'from-blue-500 to-cyan-500' },
  { id: 'bradesco', name: 'Bradesco', icon: '🏦', color: 'from-red-600 to-red-700' },
  { id: 'itau', name: 'Itaú', icon: '🟠', color: 'from-orange-500 to-orange-600' },
  { id: 'nubank', name: 'Nubank', icon: '💜', color: 'from-purple-600 to-purple-700' },
  { id: 'c6', name: 'C6 Bank', icon: '⚫', color: 'from-gray-700 to-gray-800' },
  { id: 'inter', name: 'Inter', icon: '🟠', color: 'from-orange-600 to-orange-700' },
  { id: 'santander', name: 'Santander', icon: '🔴', color: 'from-red-500 to-red-600' },
]

interface BankSelectorProps {
  selected: string
  onSelect: (bankId: string) => void
}

export function BankSelector({ selected, onSelect }: BankSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted" />
        <label className="text-sm font-medium text-text">Banco (opcional)</label>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {banks.map((bank) => (
          <button
            key={bank.id}
            type="button"
            onClick={() => onSelect(bank.id)}
            className={cn(
              'relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all',
              selected === bank.id
                ? 'border-brand bg-surface shadow-card'
                : 'border-line/25 bg-surface hover:bg-elev hover:shadow-card'
            )}
          >
            {bank.id === 'auto' && selected === bank.id && (
              <div className="absolute right-2 top-2">
                <Sparkles className="h-4 w-4 text-brand" />
              </div>
            )}

            <div className="mb-2 text-2xl">{bank.icon}</div>
            <p className={cn(
              'text-sm font-medium',
              selected === bank.id
                ? 'text-brand'
                : 'text-text'
            )}>
              {bank.name}
            </p>
          </button>
        ))}
      </div>

      {selected === 'auto' && (
        <p className="flex items-start gap-2 rounded-xl border border-line/25 bg-surface p-3 text-xs text-info">
          <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0 text-info" />
          <span>
            O sistema analisará o arquivo e detectará automaticamente o formato e banco de origem.
          </span>
        </p>
      )}
    </div>
  )
}
