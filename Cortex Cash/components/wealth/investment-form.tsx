'use client'

import * as React from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createInvestimentoSchema, tipoInvestimentoSchema } from '@/lib/validations/dtos'
import { Button } from '@/components/ui/button'
import { FormInput, FormSelect, FormColorPicker } from '@/components/forms'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { getDB } from '@/lib/db/client'
import type { Instituicao, Conta } from '@/lib/types'

// Form schema usando o schema de validação existente
const investmentFormSchema = createInvestimentoSchema.extend({
  // Override date fields para aceitar string no formulário
  data_aplicacao: z.string().min(1, 'Data de aplicação é obrigatória'),
  data_vencimento: z.string().optional(),
})

export type InvestmentFormData = z.infer<typeof investmentFormSchema>

export interface InvestmentFormProps {
  defaultValues?: Partial<InvestmentFormData>
  onSubmit: (data: InvestmentFormData) => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
}

const INVESTMENT_TYPE_OPTIONS = [
  { value: 'renda_fixa', label: 'Renda Fixa' },
  { value: 'renda_variavel', label: 'Renda Variável' },
  { value: 'fundo_investimento', label: 'Fundo de Investimento' },
  { value: 'previdencia', label: 'Previdência' },
  { value: 'criptomoeda', label: 'Criptomoeda' },
  { value: 'outro', label: 'Outro' },
]

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'resgatado', label: 'Resgatado' },
  { value: 'vencido', label: 'Vencido' },
]

export function InvestmentForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Salvar',
}: InvestmentFormProps) {
  const [institutions, setInstitutions] = React.useState<Instituicao[]>([])
  const [accounts, setAccounts] = React.useState<Conta[]>([])
  const [loadingData, setLoadingData] = React.useState(true)

  const methods = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: {
      nome: '',
      tipo: 'renda_fixa',
      ticker: '',
      valor_aplicado: 0,
      valor_atual: 0,
      quantidade: undefined,
      data_aplicacao: new Date().toISOString().split('T')[0],
      data_vencimento: '',
      taxa_juros: undefined,
      rentabilidade_contratada: undefined,
      indexador: '',
      observacoes: '',
      cor: '#18B0A4',
      ...defaultValues,
    },
  })

  // Load institutions and accounts
  React.useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true)
        const db = getDB()
        const [instData, contasData] = await Promise.all([
          db.instituicoes.toArray(),
          db.contas.toArray(),
        ])
        setInstitutions(instData)
        setAccounts(contasData)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [])

  const handleSubmit = methods.handleSubmit(
    async (data: InvestmentFormData) => {
      console.log('[InvestmentForm] Validação passou! Dados:', data)
      await onSubmit(data)
    },
    (errors) => {
      console.error('[InvestmentForm] Erros de validação:', JSON.stringify(errors, null, 2))
    }
  )

  const watchType = methods.watch('tipo')

  const institutionOptions = React.useMemo(
    () => institutions.map((inst) => ({ value: inst.id, label: inst.nome })),
    [institutions]
  )

  const accountOptions = React.useMemo(
    () => [
      { value: '', label: 'Nenhuma' },
      ...accounts.map((acc) => ({ value: acc.id, label: acc.nome })),
    ],
    [accounts]
  )

  if (loadingData) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white">Informações Básicas</h3>

          <FormInput
            name="nome"
            label="Nome do Investimento"
            placeholder="Ex: CDB Banco X 120% CDI"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              name="tipo"
              label="Tipo"
              options={INVESTMENT_TYPE_OPTIONS}
              required
            />

            <FormInput
              name="ticker"
              label="Ticker/Código"
              placeholder="Ex: PETR4, BTC"
              description="Opcional - código do ativo"
            />
          </div>

          <FormSelect
            name="instituicao_id"
            label="Instituição"
            options={institutionOptions}
            required
            description="Banco, corretora ou instituição financeira"
          />
        </div>

        <Separator className="bg-white/10" />

        {/* Valores */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white">Valores</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              name="valor_aplicado"
              label="Valor Aplicado"
              type="number"
              step="0.01"
              placeholder="0.00"
              required
              description="Valor inicial investido"
            />

            <FormInput
              name="valor_atual"
              label="Valor Atual"
              type="number"
              step="0.01"
              placeholder="0.00"
              required
              description="Valor atual do investimento"
            />
          </div>

          {(watchType === 'renda_variavel' || watchType === 'criptomoeda') && (
            <FormInput
              name="quantidade"
              label="Quantidade"
              type="number"
              step="0.00000001"
              placeholder="0"
              description="Número de ações, cotas ou unidades"
            />
          )}
        </div>

        <Separator className="bg-white/10" />

        {/* Datas */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white">Datas</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              name="data_aplicacao"
              label="Data de Aplicação"
              type="date"
              required
            />

            <FormInput
              name="data_vencimento"
              label="Data de Vencimento"
              type="date"
              description="Opcional"
            />
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* Rentabilidade */}
        {watchType === 'renda_fixa' && (
          <>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white">Rentabilidade</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  name="taxa_juros"
                  label="Taxa de Juros (% a.a.)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  description="Ex: 13.65"
                />

                <FormInput
                  name="rentabilidade_contratada"
                  label="% do Indexador"
                  type="number"
                  step="0.01"
                  placeholder="100.00"
                  description="Ex: 120 (120% do CDI)"
                />
              </div>

              <FormInput
                name="indexador"
                label="Indexador"
                placeholder="Ex: CDI, IPCA, PRÉ"
                description="Índice de referência"
              />
            </div>

            <Separator className="bg-white/10" />
          </>
        )}

        {/* Conta de Origem */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white">Conta de Origem</h3>

          <FormSelect
            name="conta_origem_id"
            label="Conta"
            options={accountOptions}
            description="Conta de onde saiu o dinheiro para investir"
          />
        </div>

        <Separator className="bg-white/10" />

        {/* Personalização */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-white">Personalização</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormColorPicker
              name="cor"
              label="Cor"
              description="Cor para identificação visual"
            />
          </div>

          <FormInput
            name="observacoes"
            label="Observações"
            placeholder="Informações adicionais sobre o investimento"
            description="Opcional"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              style={{
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
              }}
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="min-w-[120px]"
            style={{
              backgroundColor: '#18B0A4',
              color: '#ffffff',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
