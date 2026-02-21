'use client'

import { BankLogo } from '@/components/ui/bank-logo'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { THEME_COLORS } from '@/lib/constants/colors'
import type { Instituicao } from '@/lib/types'
import { cn } from '@/lib/utils'
import * as React from 'react'
import { Controller, useFormContext } from 'react-hook-form'

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

export const FormInstitutionSelect = React.forwardRef<
  HTMLButtonElement,
  FormInstitutionSelectProps
>(({ name, label, description, placeholder, institutions, required, disabled, className }, ref) => {
  const {
    control,
    formState: { errors },
    watch,
  } = useFormContext()
  const error = errors[name]
  const selectedValue = watch(name)

  // Encontra a instituição selecionada
  const selectedInstitution = React.useMemo(() => {
    if (!selectedValue || selectedValue === 'other') return null
    return institutions.find((inst) => inst.id === selectedValue)
  }, [selectedValue, institutions])

  return (
    <div className="space-y-2">
      {label && (
        <Label
          htmlFor={name}
          className={cn(
            required && 'after:content-["*"] after:ml-0.5 after:text-red-400'
          )}
          style={{ color: THEME_COLORS.fgPrimary }}
        >
          {label}
        </Label>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
            <SelectTrigger
              ref={ref}
              id={name}
              className={cn(
                error && 'border-destructive',
                className
              )}
              style={{
                backgroundColor: THEME_COLORS.inputBg,
                color: THEME_COLORS.fgPrimary,
                borderColor: THEME_COLORS.inputBorder,
              }}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={
                error ? `${name}-error` : description ? `${name}-description` : undefined
              }
            >
              <SelectValue placeholder={placeholder}>
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
                  <span style={{ color: THEME_COLORS.fgMuted }}>{placeholder}</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              style={{
                backgroundColor: THEME_COLORS.bgCard,
                borderColor: THEME_COLORS.border,
              }}
            >
              {institutions.map((institution) => (
                <SelectItem
                  key={institution.id}
                  value={institution.id}
                  className="cursor-pointer"
                  style={{ color: THEME_COLORS.fgPrimary }}
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
                className="cursor-pointer"
                style={{ color: THEME_COLORS.fgPrimary }}
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
        <p
          id={`${name}-description`}
          className="text-sm"
          style={{ color: THEME_COLORS.fgMuted }}
        >
          {description}
        </p>
      )}
      {error && (
        <p
          id={`${name}-error`}
          className="text-sm font-medium"
          style={{ color: THEME_COLORS.error }}
        >
          {error.message as string}
        </p>
      )}
    </div>
  )
})

FormInstitutionSelect.displayName = 'FormInstitutionSelect'
