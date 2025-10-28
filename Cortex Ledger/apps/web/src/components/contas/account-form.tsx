'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadixSelect as Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import type { Account } from '@/lib/hooks/use-accounts'

interface AccountFormProps {
  account?: Account | null
  onClose: () => void
}

const TIPOS_CONTA = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
]

const MOEDAS = [
  { value: 'BRL', label: 'Real (BRL)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
]

export function AccountForm({ account, onClose }: AccountFormProps) {
  const [apelido, setApelido] = useState('')
  const [tipo, setTipo] = useState('corrente')
  const [moeda, setMoeda] = useState('BRL')
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  useEffect(() => {
    if (account) {
      setApelido(account.apelido)
      setTipo(account.tipo)
      setMoeda(account.moeda)
    }
  }, [account])

  const createMutation = useMutation({
    mutationFn: async (data: { apelido: string; tipo: string; moeda: string }) => {
      const { error } = await supabase.from('conta').insert([data])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      showToast({
        type: 'success',
        title: 'Conta criada!',
        message: 'Conta cadastrada com sucesso.',
      })
      onClose()
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Erro ao criar conta',
        message: error.message || 'Ocorreu um erro inesperado.',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: { apelido: string; tipo: string; moeda: string }) => {
      const { error } = await supabase
        .from('conta')
        .update(data)
        .eq('id', account!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      showToast({
        type: 'success',
        title: 'Conta atualizada!',
        message: 'Dados da conta atualizados com sucesso.',
      })
      onClose()
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: 'Erro ao atualizar conta',
        message: error.message || 'Ocorreu um erro inesperado.',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data = { apelido, tipo, moeda }

    if (account) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="apelido">Nome da Conta</Label>
        <Input
          id="apelido"
          type="text"
          placeholder="Ex: Nubank Conta"
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo de Conta</Label>
        <Select value={tipo} onValueChange={setTipo} disabled={isLoading}>
          <SelectTrigger id="tipo">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_CONTA.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="moeda">Moeda</Label>
        <Select value={moeda} onValueChange={setMoeda} disabled={isLoading}>
          <SelectTrigger id="moeda">
            <SelectValue placeholder="Selecione a moeda" />
          </SelectTrigger>
          <SelectContent>
            {MOEDAS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : account ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
