'use client'

import * as React from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cartaoSchema, CartaoFormData } from '@/lib/validations'
import { BANDEIRA_OPTIONS, CARD_COLORS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect, FormCurrencyInput, FormColorPicker, FormCheckbox } from '@/components/forms'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { contaService } from '@/lib/services/conta.service'
import { instituicaoService } from '@/lib/services/instituicao.service'
import type { Conta, Instituicao } from '@/lib/types'

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
  const [contas, setContas] = React.useState<Conta[]>([])
  const [loadingContas, setLoadingContas] = React.useState(true)
  const [instituicoes, setInstituicoes] = React.useState<Instituicao[]>([])
  const [loadingInstituicoes, setLoadingInstituicoes] = React.useState(true)

  const methods = useForm<CartaoFormData>({
    resolver: zodResolver(cartaoSchema),
    defaultValues: {
      nome: '',
      instituicao_id: '',
      limite_total: 0, // Será mostrado vazio no campo (CurrencyInput mostra vazio quando valor é 0)
      dia_fechamento: 1,
      dia_vencimento: 10,
      ativo: true,
      cor: '#7c3aed', // Roxo Nubank (cor padrão)
      conta_pagamento_id: '',
      ...defaultValues,
    },
  })

  // Carregar instituições e contas
  React.useEffect(() => {
    async function loadData() {
      try {
        // Carregar instituições
        setLoadingInstituicoes(true)
        const instituicoesData = await instituicaoService.listInstituicoes()
        setInstituicoes(instituicoesData)
        setLoadingInstituicoes(false)

        // Carregar contas (apenas contas-corrente)
        setLoadingContas(true)
        const contasData = await contaService.listContas({ incluirInativas: false })
        const contasCorrente = contasData.filter(conta => conta.tipo === 'corrente')
        console.log('[CartaoForm] Contas-corrente carregadas:', contasCorrente.length, contasCorrente)
        setContas(contasCorrente)
        setLoadingContas(false)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        setLoadingInstituicoes(false)
        setLoadingContas(false)
      }
    }
    loadData()
  }, [])

  const handleSubmit = methods.handleSubmit(
    async (data: CartaoFormData) => {
      await onSubmit(data)
    },
    (errors) => {
      // Log apenas as mensagens de erro, não o objeto completo
      console.error('[CartaoForm] Erros de validação encontrados:')
      console.error('Total de erros:', Object.keys(errors).length)

      Object.keys(errors).forEach(key => {
        const error = errors[key as keyof typeof errors]
        console.error(`Campo: ${key}`)
        console.error(`  Tipo do erro:`, typeof error)

        if (error && typeof error === 'object' && 'message' in error) {
          console.error(`  ❌ Mensagem: ${error.message}`)
        } else if (error) {
          console.error(`  ⚠️ Valor do erro:`, error)
        }
      })
    }
  )

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
            <h3 className="text-sm font-medium text-foreground">Informações Básicas</h3>
            <Separator className="bg-border" />
          </div>

          <div className="form-dark-input">
            <FormInput
              name="nome"
              label="Nome do Cartão"
              placeholder="Ex: Nubank Visa Platinum, Inter Mastercard Gold..."
              required
              className="bg-card border-border text-foreground !text-white !placeholder:!text-white/50"
            />
          </div>

          <div className="form-dark-select">
            <FormSelect
              name="instituicao_id"
              label="Instituição Financeira"
              placeholder={loadingInstituicoes ? "Carregando..." : "Selecione o banco"}
              options={instituicoes.map(inst => ({
                value: inst.id,
                label: inst.nome,
              }))}
              disabled={loadingInstituicoes}
              required
            />
          </div>

          <div className="form-dark-input">
            <FormInput
              name="ultimos_digitos"
              label="Últimos 4 Dígitos"
              placeholder="1234"
              maxLength={4}
              className="bg-card border-border text-foreground"
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
            <h3 className="text-sm font-medium text-foreground">Limite</h3>
            <Separator className="bg-border" />
          </div>

          <div className="form-dark-input">
            <FormCurrencyInput
              name="limite_total"
              label="Limite Total"
              currency="BRL"
              required
            />
          </div>
        </div>

        {/* Billing Cycle */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Ciclo de Faturamento</h3>
            <Separator className="bg-border" />
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
                className="bg-card border-border text-foreground"
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
                className="bg-card border-border text-foreground"
              />
            </div>
          </div>

          <div className="text-xs p-3 rounded-md bg-muted text-foreground/90">
            <p className="font-medium mb-1 text-foreground">Como funciona?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Dia de Fechamento:</strong> Último dia para compras entrarem na fatura atual</li>
              <li><strong>Dia de Vencimento:</strong> Data limite para pagar a fatura</li>
            </ul>
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Aparência</h3>
            <Separator className="bg-border" />
          </div>

          <FormColorPicker
            name="cor"
            label="Cor"
            colors={CARD_COLORS}
            required
          />
        </div>

        {/* Payment Settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Pagamento de Fatura</h3>
            <Separator className="bg-border" />
          </div>

          <div className="form-dark-select">
            <FormSelect
              name="conta_pagamento_id"
              label="Conta para Pagamento"
              placeholder={loadingContas ? "Carregando contas..." : contas.length === 0 ? "Nenhuma conta-corrente encontrada" : "Selecione a conta (opcional)"}
              options={contas.map(conta => ({
                value: conta.id,
                label: conta.nome,
              }))}
              disabled={loadingContas}
            />
            <p className="text-xs mt-2 text-foreground/70">
              Ao selecionar uma conta-corrente, o pagamento da fatura será debitado automaticamente dessa conta
            </p>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Configurações</h3>
            <Separator className="bg-border" />
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
              className="border-border text-foreground"
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-primary text-foreground"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

