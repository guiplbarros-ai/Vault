'use client'

import {
  FormCheckbox,
  FormColorPicker,
  FormCurrencyInput,
  FormInput,
  FormSelect,
} from '@/components/forms'
import { FormInstitutionSelect } from '@/components/forms/form-institution-select'
import { FormParentAccountSelect } from '@/components/forms/form-parent-account-select'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ACCOUNT_TYPE_OPTIONS } from '@/lib/constants'
import { contaService } from '@/lib/services/conta.service'
import { instituicaoService } from '@/lib/services/instituicao.service'
import type { Conta, Instituicao } from '@/lib/types'
import { type AccountFormData, accountSchema } from '@/lib/validations'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { FormProvider, useForm } from 'react-hook-form'

export interface AccountFormProps {
  defaultValues?: Partial<AccountFormData>
  onSubmit: (data: AccountFormData) => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
  currentAccountId?: string // ID da conta sendo editada
}

export function AccountForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Salvar',
  currentAccountId,
}: AccountFormProps) {
  const [instituicoes, setInstituicoes] = React.useState<Instituicao[]>([])
  const [loadingInstitucoes, setLoadingInstitucoes] = React.useState(true)
  const [contas, setContas] = React.useState<Conta[]>([])
  const [loadingContas, setLoadingContas] = React.useState(true)

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

  // Carrega instituições e contas do banco
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [instituicoesData, contasData] = await Promise.all([
          instituicaoService.listInstituicoes({ sortBy: 'nome' }),
          contaService.listContas({ incluirInativas: false }),
        ])
        setInstituicoes(instituicoesData)
        setContas(contasData)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoadingInstitucoes(false)
        setLoadingContas(false)
      }
    }
    loadData()
  }, [])

  const handleSubmit = methods.handleSubmit(
    async (data: AccountFormData) => {
      console.log('[AccountForm] Validação passou! Dados:', data)
      await onSubmit(data)
    },
    (errors) => {
      console.error('[AccountForm] Erros de validação:', JSON.stringify(errors, null, 2))
      console.error('[AccountForm] Errors object:', errors)

      // Log cada campo com erro
      Object.keys(errors).forEach((key) => {
        console.error(`Campo "${key}":`, (errors as any)[key])
      })
    }
  )

  const watchType = methods.watch('type')
  const watchParentAccount = methods.watch('parentAccount')

  // Debug: Log form values on change
  React.useEffect(() => {
    const subscription = methods.watch((value, { name, type }) => {
      console.log('[AccountForm] Campo alterado:', name, '=', value[name as keyof typeof value])
    })
    return () => subscription.unsubscribe()
  }, [methods])

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Informações Básicas</h3>
            <Separator />
          </div>

          <div className="form-dark-input">
            <FormInput
              name="name"
              label="Nome da Conta"
              placeholder="Ex: Conta Corrente Nubank, Cartão XP..."
              required
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
            <FormInstitutionSelect
              name="institution"
              label="Instituição"
              placeholder={loadingInstitucoes ? 'Carregando...' : 'Selecione a instituição'}
              institutions={instituicoes}
              disabled={loadingInstitucoes}
            />
          </div>

          <div className="form-dark-select">
            <FormParentAccountSelect
              name="parentAccount"
              label="Conta Vinculada"
              placeholder={loadingContas ? 'Carregando...' : 'Nenhuma (conta independente)'}
              description="Para poupanças, investimentos ou cartões vinculados a uma conta corrente"
              accounts={contas}
              disabled={loadingContas}
              currentAccountId={currentAccountId}
            />
          </div>
        </div>

        {/* Balance and Currency */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Saldo e Moeda</h3>
            <Separator />
          </div>

          <div className="form-dark-input">
            <FormCurrencyInput
              name="balance"
              label="Saldo de Referência"
              currency="BRL"
              required
              allowNegative={watchType === 'credit'}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            {watchType === 'credit'
              ? 'Para cartões de crédito, use valores negativos para representar dívidas'
              : 'Informe o saldo atual verificado (usado como referência)'}
          </div>
        </div>

        {/* Appearance - Only show if no parent account */}
        {!watchParentAccount && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Aparência</h3>
              <Separator />
            </div>

            <FormColorPicker name="color" label="Cor" required />
          </div>
        )}

        {/* Show message when linked to parent account */}
        {watchParentAccount && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Aparência</h3>
              <Separator />
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                🎨 A cor será automaticamente definida com base na conta vinculada (tom mais claro)
              </p>
            </div>
          </div>
        )}

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
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isLoading} variant="default">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
