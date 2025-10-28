'use client'

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
      type: 'checking',
      currency: 'BRL',
      balance: 0,
      isActive: true,
      color: '#3B82F6',
      ...defaultValues,
    },
  })

  const handleSubmit = methods.handleSubmit(async (data: AccountFormData) => {
    await onSubmit(data)
  })

  const watchType = methods.watch('type')

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Informações Básicas</h3>
            <Separator />
          </div>

          <FormInput
            name="name"
            label="Nome da Conta"
            placeholder="Ex: Conta Corrente Nubank, Cartão XP..."
            required
          />

          <FormSelect
            name="type"
            label="Tipo de Conta"
            placeholder="Selecione o tipo"
            options={ACCOUNT_TYPE_OPTIONS}
            required
          />

          <FormSelect
            name="institution"
            label="Instituição"
            placeholder="Selecione a instituição"
            options={mockInstitutionOptions}
          />
        </div>

        {/* Balance and Currency */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Saldo e Moeda</h3>
            <Separator />
          </div>

          <FormCurrencyInput
            name="balance"
            label="Saldo Inicial"
            currency="BRL"
            required
            allowNegative={watchType === 'credit'}
          />

          <div className="text-xs text-muted-foreground">
            {watchType === 'credit'
              ? 'Para cartões de crédito, use valores negativos para representar dívidas'
              : 'Informe o saldo atual da conta'}
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Aparência</h3>
            <Separator />
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
            <h3 className="text-sm font-medium">Configurações</h3>
            <Separator />
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
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
