'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface CartaoFormProps {
  onSubmit: (data: CartaoFormData) => void
  onCancel: () => void
  initialData?: Partial<CartaoFormData>
}

export interface CartaoFormData {
  nome: string
  instituicao: string
  bandeira: 'visa' | 'master' | 'amex' | 'elo' | 'outro'
  ultimosDigitos: string
  limiteTotal: number
  diaFechamento: number
  diaVencimento: number
  tipoCartao: 'nacional' | 'internacional'
  anuidade?: number
  taxaJuros?: number
}

export function CartaoForm({ onSubmit, onCancel, initialData }: CartaoFormProps) {
  const [formData, setFormData] = useState<CartaoFormData>({
    nome: initialData?.nome || '',
    instituicao: initialData?.instituicao || '',
    bandeira: initialData?.bandeira || 'visa',
    ultimosDigitos: initialData?.ultimosDigitos || '',
    limiteTotal: initialData?.limiteTotal || 0,
    diaFechamento: initialData?.diaFechamento || 1,
    diaVencimento: initialData?.diaVencimento || 10,
    tipoCartao: initialData?.tipoCartao || 'nacional',
    anuidade: initialData?.anuidade,
    taxaJuros: initialData?.taxaJuros,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const melhorDiaCompra = (formData.diaFechamento % 31) + 1

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-graphite-50 mb-6">
            {initialData ? 'Editar Cartão' : 'Adicionar Cartão'}
          </h2>
        </div>

        {/* Informações Básicas */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-graphite-50 uppercase">
            Informações Básicas
          </h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-graphite-300 mb-2">
              Nome/Apelido do Cartão *
            </label>
            <Input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Amex Platinum, Nubank, Inter Gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-graphite-300 mb-2">
              Instituição Emissora *
            </label>
            <Input
              type="text"
              value={formData.instituicao}
              onChange={(e) => setFormData({ ...formData, instituicao: e.target.value })}
              placeholder="Ex: American Express, Nubank, Banco Inter"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-graphite-300 mb-2">
                Bandeira *
              </label>
              <select
                value={formData.bandeira}
                onChange={(e) => setFormData({ ...formData, bandeira: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 dark:border-graphite-600 bg-white dark:bg-graphite-800 px-4 py-2 text-sm text-slate-900 dark:text-graphite-50"
                required
              >
                <option value="visa">Visa</option>
                <option value="master">Mastercard</option>
                <option value="amex">American Express</option>
                <option value="elo">Elo</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-graphite-300 mb-2">
                Últimos 4 Dígitos *
              </label>
              <Input
                type="text"
                value={formData.ultimosDigitos}
                onChange={(e) => setFormData({ ...formData, ultimosDigitos: e.target.value.slice(0, 4) })}
                placeholder="1234"
                maxLength={4}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-graphite-300 mb-2">
              Tipo de Cartão *
            </label>
            <select
              value={formData.tipoCartao}
              onChange={(e) => setFormData({ ...formData, tipoCartao: e.target.value as any })}
              className="w-full rounded-xl border border-slate-300 dark:border-graphite-600 bg-white dark:bg-graphite-800 px-4 py-2 text-sm text-slate-900 dark:text-graphite-50"
              required
            >
              <option value="nacional">Nacional</option>
              <option value="internacional">Internacional</option>
            </select>
          </div>
        </div>

        {/* Configurações Financeiras */}
        <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-graphite-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-graphite-50 uppercase">
            Configurações Financeiras
          </h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-graphite-300 mb-2">
              Limite Total *
            </label>
            <Input
              type="number"
              value={formData.limiteTotal}
              onChange={(e) => setFormData({ ...formData, limiteTotal: parseFloat(e.target.value) })}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-graphite-300 mb-2">
                Dia de Fechamento *
              </label>
              <Input
                type="number"
                value={formData.diaFechamento}
                onChange={(e) => setFormData({ ...formData, diaFechamento: parseInt(e.target.value) })}
                min="1"
                max="31"
                required
              />
              <p className="text-xs text-slate-500 dark:text-graphite-500 mt-1">
                Dia do mês em que a fatura fecha
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-graphite-300 mb-2">
                Dia de Vencimento *
              </label>
              <Input
                type="number"
                value={formData.diaVencimento}
                onChange={(e) => setFormData({ ...formData, diaVencimento: parseInt(e.target.value) })}
                min="1"
                max="31"
                required
              />
              <p className="text-xs text-slate-500 dark:text-graphite-500 mt-1">
                Dia do mês em que a fatura vence
              </p>
            </div>
          </div>

          {/* Melhor Dia de Compra (calculado) */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              💡 Melhor dia para comprar: Dia {melhorDiaCompra}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              Comprando neste dia, você maximiza o prazo de pagamento (~{formData.diaVencimento - formData.diaFechamento + 30} dias)
            </p>
          </div>
        </div>

        {/* Custos Opcionais */}
        <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-graphite-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-graphite-50 uppercase">
            Custos (Opcional)
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-graphite-300 mb-2">
                Anuidade (R$/ano)
              </label>
              <Input
                type="number"
                value={formData.anuidade || ''}
                onChange={(e) => setFormData({ ...formData, anuidade: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-graphite-300 mb-2">
                Taxa de Juros (% a.m.)
              </label>
              <Input
                type="number"
                value={formData.taxaJuros || ''}
                onChange={(e) => setFormData({ ...formData, taxaJuros: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-3 pt-6 border-t border-slate-200 dark:border-graphite-700">
          <Button
            type="submit"
            className="flex-1 bg-brand-600 hover:bg-brand-700"
          >
            {initialData ? 'Salvar Alterações' : 'Adicionar Cartão'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
