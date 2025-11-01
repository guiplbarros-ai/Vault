'use client'

import * as React from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cartaoSchema, CartaoFormData } from '@/lib/validations'
import { BANDEIRA_OPTIONS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect, FormCurrencyInput, FormColorPicker, FormCheckbox } from '@/components/forms'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'

export interface CartaoFormProps {
  defaultValues?: Partial<CartaoFormData>
  onSubmit: (data: CartaoFormData) => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
}

export function CartaoForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Salvar',
}: CartaoFormProps) {
  const methods = useForm<CartaoFormData>({
    resolver: zodResolver(cartaoSchema),
    defaultValues: {
      nome: '',
      instituicao_id: '',
      limite_total: 0,
      dia_fechamento: 1,
      dia_vencimento: 10,
      ativo: true,
      cor: '#1A1F71',
      ...defaultValues,
    },
  })

  const handleSubmit = methods.handleSubmit(
    async (data: CartaoFormData) => {
      console.log('[CartaoForm] Validação passou! Dados:', data)
      await onSubmit(data)
    },
    (errors) => {
      console.error('[CartaoForm] Erros de validação:', JSON.stringify(errors, null, 2))
      
      // Log cada campo com erro
      Object.keys(errors).forEach(key => {
        console.error(`Campo "${key}":`, errors[key as keyof typeof errors])
      })
    }
  )

  // Debug: Log form values on change
  React.useEffect(() => {
    const subscription = methods.watch((value, { name, type }) => {
      console.log('[CartaoForm] Campo alterado:', name, '=', value[name as keyof typeof value])
    })
    return () => subscription.unsubscribe()
  }, [methods])

  // Gerar opções de dias (1-31)
  const diaOptions = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }))

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Informações Básicas</h3>
            <Separator className="!bg-white/20" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          </div>

          <div className="form-dark-input">
            <FormInput
              name="nome"
              label="Nome do Cartão"
              placeholder="Ex: Nubank Visa Platinum, Inter Mastercard Gold..."
              required
              className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
            />
          </div>

          <div className="form-dark-input">
            <FormInput
              name="ultimos_digitos"
              label="Últimos 4 Dígitos"
              placeholder="1234"
              maxLength={4}
              className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
            />
          </div>

          <div className="form-dark-select">
            <FormSelect
              name="bandeira"
              label="Bandeira"
              placeholder="Selecione a bandeira"
              options={BANDEIRA_OPTIONS as any}
            />
          </div>
        </div>

        {/* Credit Limit */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Limite</h3>
            <Separator className="!bg-white/20" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          </div>

          <div className="form-dark-input">
            <FormCurrencyInput
              name="limite_total"
              label="Limite Total"
              currency="BRL"
              required
              className="!bg-[#1e293b] !text-white !border-white/20"
            />
          </div>
        </div>

        {/* Billing Cycle */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Ciclo de Faturamento</h3>
            <Separator className="!bg-white/20" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-dark-input">
              <FormInput
                name="dia_fechamento"
                label="Dia de Fechamento"
                type="number"
                min="1"
                max="31"
                placeholder="1-31"
                required
                className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
              />
            </div>

            <div className="form-dark-input">
              <FormInput
                name="dia_vencimento"
                label="Dia de Vencimento"
                type="number"
                min="1"
                max="31"
                placeholder="1-31"
                required
                className="!bg-[#1e293b] !text-white !border-white/20 placeholder:!text-white/50"
              />
            </div>
          </div>

          <div className="text-xs text-white/70 bg-white/10 p-3 rounded-md">
            <p className="font-medium mb-1 text-white">Como funciona?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Dia de Fechamento:</strong> Último dia para compras entrarem na fatura atual</li>
              <li><strong>Dia de Vencimento:</strong> Data limite para pagar a fatura</li>
            </ul>
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Aparência</h3>
            <Separator className="!bg-white/20" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          </div>

          <FormColorPicker
            name="cor"
            label="Cor"
            required
          />
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-white">Configurações</h3>
            <Separator className="!bg-white/20" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          </div>

          <FormCheckbox
            name="ativo"
            label="Cartão ativo"
            description="Cartões inativos não aparecem em seleções, mas mantêm o histórico"
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

