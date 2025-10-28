'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

interface AddCardDialogProps {
  isOpen: boolean
  onClose: () => void
}

const BANDEIRAS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'amex', label: 'American Express' },
  { value: 'elo', label: 'Elo' },
  { value: 'hipercard', label: 'Hipercard' },
  { value: 'outros', label: 'Outros' },
]

export function AddCardDialog({ isOpen, onClose }: AddCardDialogProps) {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nome: '',
    bandeira: 'visa',
    ultimos_digitos: '',
    limite_total: '',
    dia_fechamento: '1',
    dia_vencimento: '10',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validações
      if (!formData.nome.trim()) {
        throw new Error('Nome do cartão é obrigatório')
      }
      if (formData.ultimos_digitos.length !== 4) {
        throw new Error('Últimos dígitos devem ter exatamente 4 números')
      }
      const limiteTotal = parseFloat(formData.limite_total)
      if (isNaN(limiteTotal) || limiteTotal < 0) {
        throw new Error('Limite total deve ser um valor válido')
      }

      const diaFechamento = parseInt(formData.dia_fechamento)
      const diaVencimento = parseInt(formData.dia_vencimento)
      if (diaFechamento < 1 || diaFechamento > 31) {
        throw new Error('Dia de fechamento deve estar entre 1 e 31')
      }
      if (diaVencimento < 1 || diaVencimento > 31) {
        throw new Error('Dia de vencimento deve estar entre 1 e 31')
      }

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      // Inserir cartão
      const { error: insertError } = await supabase
        .from('cartao_credito')
        .insert({
          user_id: user.id,
          nome: formData.nome.trim(),
          bandeira: formData.bandeira,
          ultimos_digitos: formData.ultimos_digitos,
          limite_total: limiteTotal,
          dia_fechamento: diaFechamento,
          dia_vencimento: diaVencimento,
          ativo: true,
        })

      if (insertError) {
        throw insertError
      }

      // Invalidar queries para recarregar dados
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
      queryClient.invalidateQueries({ queryKey: ['credit-card-summary'] })

      // Resetar formulário e fechar
      setFormData({
        nome: '',
        bandeira: 'visa',
        ultimos_digitos: '',
        limite_total: '',
        dia_fechamento: '1',
        dia_vencimento: '10',
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar cartão')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-graphite-800 rounded-xl2 shadow-cardDark max-w-md w-full max-h-[90vh] overflow-y-auto border border-graphite-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-graphite-700">
          <h2 className="text-xl font-semibold text-graphite-100">
            Adicionar Cartão de Crédito
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="p-2 hover:bg-graphite-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <X className="h-5 w-5 text-graphite-300" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-error-100 border border-error-600 rounded-lg">
              <p className="text-sm text-error-600 font-medium">{error}</p>
            </div>
          )}

          {/* Nome do Cartão */}
          <div>
            <label className="block text-sm font-medium text-graphite-200 mb-2">
              Nome do Cartão *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Nubank Mastercard"
              className="w-full h-10 px-3 rounded-lg bg-graphite-700 border border-graphite-600 text-graphite-100 placeholder:text-graphite-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-600"
              required
            />
          </div>

          {/* Bandeira */}
          <div>
            <label className="block text-sm font-medium text-graphite-200 mb-2">
              Bandeira *
            </label>
            <select
              value={formData.bandeira}
              onChange={(e) => setFormData({ ...formData, bandeira: e.target.value })}
              className="w-full h-10 px-3 rounded-lg bg-graphite-700 border border-graphite-600 text-graphite-100 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-600"
              required
            >
              {BANDEIRAS.map((bandeira) => (
                <option key={bandeira.value} value={bandeira.value}>
                  {bandeira.label}
                </option>
              ))}
            </select>
          </div>

          {/* Últimos Dígitos */}
          <div>
            <label className="block text-sm font-medium text-graphite-200 mb-2">
              Últimos 4 Dígitos *
            </label>
            <input
              type="text"
              value={formData.ultimos_digitos}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                setFormData({ ...formData, ultimos_digitos: value })
              }}
              placeholder="1234"
              maxLength={4}
              className="w-full h-10 px-3 rounded-lg bg-graphite-700 border border-graphite-600 text-graphite-100 placeholder:text-graphite-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-600"
              required
            />
          </div>

          {/* Limite Total */}
          <div>
            <label className="block text-sm font-medium text-graphite-200 mb-2">
              Limite Total *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite-400 text-sm">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.limite_total}
                onChange={(e) => setFormData({ ...formData, limite_total: e.target.value })}
                placeholder="0,00"
                className="w-full h-10 pl-10 pr-3 rounded-lg bg-graphite-700 border border-graphite-600 text-graphite-100 placeholder:text-graphite-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-600"
                required
              />
            </div>
          </div>

          {/* Dias de Fechamento e Vencimento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-graphite-200 mb-2">
                Dia Fechamento *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dia_fechamento}
                onChange={(e) => setFormData({ ...formData, dia_fechamento: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-graphite-700 border border-graphite-600 text-graphite-100 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-graphite-200 mb-2">
                Dia Vencimento *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dia_vencimento}
                onChange={(e) => setFormData({ ...formData, dia_vencimento: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-graphite-700 border border-graphite-600 text-graphite-100 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-600"
                required
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="h-10 px-4 rounded-lg bg-graphite-700 border border-graphite-600 text-graphite-100 hover:bg-graphite-600 focus:outline-none focus:ring-2 focus:ring-brand-400 transition-colors disabled:opacity-45 disabled:cursor-not-allowed flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-brand-400 transition-colors disabled:opacity-45 disabled:cursor-not-allowed flex-1"
            >
              {isLoading ? 'Salvando...' : 'Adicionar Cartão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
