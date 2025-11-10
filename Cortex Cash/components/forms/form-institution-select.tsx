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
import { BankLogo } from '@/components/ui/bank-logo'
import type { Instituicao } from '@/lib/types'

export interface FormInstitutionSelectProps {
  name: string
  label?: string
  description?: string
  placeholder?: string
  institutions: Instituicao[]
  required?: boolean
  disabled?: boolean
  className?: string
}

export const FormInstitutionSelect = React.forwardRef<HTMLButtonElement, FormInstitutionSelectProps>(
  ({ name, label, description, placeholder, institutions, required, disabled, className }, ref) => {
    const { control, formState: { errors }, watch } = useFormContext()
    const error = errors[name]
    const selectedValue = watch(name)

    // Encontra a instituição selecionada
    const selectedInstitution = React.useMemo(() => {
      if (!selectedValue || selectedValue === 'other') return null
      return institutions.find(inst => inst.id === selectedValue)
    }, [selectedValue, institutions])

    return (
      <div className="space-y-2">
        {label && (
          <Label
            htmlFor={name}
            className={cn('text-white', required && 'after:content-["*"] after:ml-0.5 after:text-red-400')}
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
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
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
                  {selectedValue === 'other' ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center text-lg">🏢</div>
                      <span>Outro</span>
                    </div>
                  ) : selectedInstitution ? (
                    <div className="flex items-center gap-2">
                      <BankLogo
                        logoUrl={selectedInstitution.logo_url}
                        bankName={selectedInstitution.nome}
                        size={24}
                      />
                      <span>{selectedInstitution.nome}</span>
                    </div>
                  ) : (
                    <span className="text-white/50">{placeholder}</span>
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
                {institutions.map((institution) => (
                  <SelectItem
                    key={institution.id}
                    value={institution.id}
                    className="!text-white hover:!bg-gray-700 cursor-pointer"
                    style={{ color: '#ffffff !important' } as React.CSSProperties}
                  >
                    <div className="flex items-center gap-2">
                      <BankLogo
                        logoUrl={institution.logo_url}
                        bankName={institution.nome}
                        size={24}
                      />
                      <span>{institution.nome}</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectItem
                  value="other"
                  className="!text-white hover:!bg-gray-700 cursor-pointer"
                  style={{ color: '#ffffff !important' } as React.CSSProperties}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center text-lg">🏢</div>
                    <span>Outro</span>
                  </div>
                </SelectItem>
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

FormInstitutionSelect.displayName = 'FormInstitutionSelect'
