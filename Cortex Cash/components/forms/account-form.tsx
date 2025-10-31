'use client'

import * as React from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { accountSchema, AccountFormData } from '@/lib/validations'
import { ACCOUNT_TYPE_OPTIONS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect, FormCurrencyInput, FormColorPicker, FormCheckbox } from '@/components/forms'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'

export interface AccountFormProps {
  defaultValues?: Partial<AccountFormData>
  onSubmit: (data: AccountFormData) => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
}

// Mock options - TODO: Replace with real data from DB
const mockInstitutionOptions = [
  { value: 'nubank', label: 'Nubank' },
  { value: 'inter', label: 'Banco Inter' },
  { value: 'itau', label: 'Itaú' },
  { value: 'bradesco', label: 'Bradesco' },
  { value: 'santander', label: 'Santander' },
  { value: 'banco-do-brasil', label: 'Banco do Brasil' },
  { value: 'caixa', label: 'Caixa Econômica Federal' },
  { value: 'xp', label: 'XP Investimentos' },
  { value: 'btg', label: 'BTG Pactual' },
  { value: 'other', label: 'Outro' },
]

export function AccountForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Salvar',
}: AccountFormProps) {
  const methods = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'checking',
      currency: 'BRL',
      balance: 0,
      isActive: true,
      color: '#3B82F6',
      ...defaultValues,
    },
  })

  const handleSubmit = methods.handleSubmit(
    async (data: AccountFormData) => {
      console.log('[AccountForm] Validação passou! Dados:', data)
      await onSubmit(data)
    },
    (errors) => {
      console.error('[AccountForm] Erros de validação:', JSON.stringify(errors, null, 2))
      console.error('[AccountForm] Errors object:', errors)

      // Log cada campo com erro
      Object.keys(errors).forEach(key => {
        console.error(`Campo "${key}":`, errors[key])
      })
    }
  )

  const watchType = methods.watch('type')

  // Debug: Log form values on change
  React.useEffect(() => {
    const subscription = methods.watch((value, { name, type }) => {
      console.log('[AccountForm] Campo alterado:', name, '=', value[name as keyof typeof value])
    })
    return () => subscription.unsubscribe()
  }, [methods])

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className="space-y-6" style={{
        // Force white labels and descriptions
        // @ts-ignore
        '--label-color': '#ffffff',
        '--description-color': 'rgba(255, 255, 255, 0.7)'
      } as React.CSSProperties}>
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Informações Básicas</h3>
            <Separator className="bg-white/20" />
          </div>

          <div className="form-dark-input">
            <FormInput
              name="name"
              label="Nome da Conta"
              placeholder="Ex: Conta Corrente Nubank, Cartão XP..."
              required
              className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
            />
          </div>

          <div className="form-dark-select">
            <FormSelect
              name="type"
              label="Tipo de Conta"
              placeholder="Selecione o tipo"
              options={ACCOUNT_TYPE_OPTIONS}
              required
            />
          </div>

          <div className="form-dark-select">
            <FormSelect
              name="institution"
              label="Instituição"
              placeholder="Selecione a instituição"
              options={mockInstitutionOptions}
            />
          </div>
        </div>

        {/* Balance and Currency */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Saldo e Moeda</h3>
            <Separator className="bg-white/20" />
          </div>

          <div className="form-dark-input">
            <FormCurrencyInput
              name="balance"
              label="Saldo Inicial"
              currency="BRL"
              required
              allowNegative={watchType === 'credit'}
              className="!bg-[#1e293b] !text-white !border-white/20"
            />
          </div>

          <div className="text-xs text-white/70">
            {watchType === 'credit'
              ? 'Para cartões de crédito, use valores negativos para representar dívidas'
              : 'Informe o saldo atual da conta'}
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Aparência</h3>
            <Separator className="bg-white/20" />
          </div>

          <FormColorPicker
            name="color"
            label="Cor"
            required
          />
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Configurações</h3>
            <Separator className="bg-white/20" />
          </div>

          <FormCheckbox
            name="isActive"
            label="Conta ativa"
            description="Contas inativas não aparecem em seleções, mas mantêm o histórico"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="text-white"
            style={{
              backgroundColor: '#18B0A4',
              color: '#ffffff'
            }}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
