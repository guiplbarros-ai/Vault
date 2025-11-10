'use client'

import * as React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Building2 } from 'lucide-react'
import type { Conta } from '@/lib/types'
import { ACCOUNT_TYPE_LABELS } from '@/lib/constants'
import { mapDBAccountTypeToFormType } from '@/lib/adapters'

export interface FormParentAccountSelectProps {
  name: string
  label?: string
  description?: string
  placeholder?: string
  accounts: Conta[]
  disabled?: boolean
  className?: string
  currentAccountId?: string // ID da conta sendo editada (para não mostrar ela mesma)
}

export const FormParentAccountSelect = React.forwardRef<HTMLButtonElement, FormParentAccountSelectProps>(
  ({ name, label, description, placeholder, accounts, disabled, className, currentAccountId }, ref) => {
    const { control, formState: { errors }, watch } = useFormContext()
    const error = errors[name]
    const selectedValue = watch(name)

    // Filtra contas disponíveis: apenas corrente e que não seja a própria conta
    const availableAccounts = React.useMemo(() => {
      return accounts.filter(account =>
        account.tipo === 'corrente' &&
        account.id !== currentAccountId &&
        account.ativa
      )
    }, [accounts, currentAccountId])

    // Encontra a conta selecionada
    const selectedAccount = React.useMemo(() => {
      if (!selectedValue || selectedValue === 'none') return null
      return accounts.find(acc => acc.id === selectedValue)
    }, [selectedValue, accounts])

    return (
      <div className="space-y-2">
        {label && (
          <Label
            htmlFor={name}
            className="text-white"
            style={{ color: '#ffffff !important' } as React.CSSProperties}
          >
            {label}
          </Label>
        )}
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <Select
              value={field.value || 'none'}
              onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)}
              disabled={disabled || availableAccounts.length === 0}
            >
              <SelectTrigger
                ref={ref}
                id={name}
                className={cn('!bg-[#1e293b] !text-white !border-white/20', error && 'border-destructive', className)}
                style={{
                  backgroundColor: '#1e293b !important',
                  color: '#ffffff !important',
                  borderColor: 'rgba(255, 255, 255, 0.2) !important'
                } as React.CSSProperties}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
              >
                <SelectValue
                  placeholder={placeholder}
                  className="!text-white/70"
                  style={{ color: 'rgba(255, 255, 255, 0.7) !important' } as React.CSSProperties}
                >
                  {selectedValue === 'none' || !selectedAccount ? (
                    <span className="text-white/50">{placeholder || 'Nenhuma (conta independente)'}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: selectedAccount.cor || '#3B82F6' }}>
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                      <span>{selectedAccount.nome}</span>
                      <span className="text-xs text-white/50">
                        ({ACCOUNT_TYPE_LABELS[mapDBAccountTypeToFormType(selectedAccount.tipo)]})
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                className="!bg-gray-800 !border-gray-700"
                style={{
                  backgroundColor: '#1f2937 !important',
                  borderColor: '#374151 !important'
                } as React.CSSProperties}
              >
                <SelectItem
                  value="none"
                  className="!text-white hover:!bg-gray-700 cursor-pointer"
                  style={{ color: '#ffffff !important' } as React.CSSProperties}
                >
                  <div className="flex items-center gap-2">
                    <span>❌ Nenhuma (conta independente)</span>
                  </div>
                </SelectItem>
                {availableAccounts.length === 0 ? (
                  <SelectItem
                    value="no-accounts"
                    disabled
                    className="!text-white/50"
                    style={{ color: 'rgba(255, 255, 255, 0.5) !important' } as React.CSSProperties}
                  >
                    Nenhuma conta corrente disponível
                  </SelectItem>
                ) : (
                  availableAccounts.map((account) => (
                    <SelectItem
                      key={account.id}
                      value={account.id}
                      className="!text-white hover:!bg-gray-700 cursor-pointer"
                      style={{ color: '#ffffff !important' } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: account.cor || '#3B82F6' }}>
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <span>{account.nome}</span>
                        <span className="text-xs text-white/50">
                          ({ACCOUNT_TYPE_LABELS[mapDBAccountTypeToFormType(account.tipo)]})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        />
        {description && !error && (
          <p id={`${name}-description`} className="text-sm text-white/70" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {description}
          </p>
        )}
        {error && (
          <p id={`${name}-error`} className="text-sm font-medium text-red-400" style={{ color: '#f87171' }}>
            {error.message as string}
          </p>
        )}
      </div>
    )
  }
)

FormParentAccountSelect.displayName = 'FormParentAccountSelect'
