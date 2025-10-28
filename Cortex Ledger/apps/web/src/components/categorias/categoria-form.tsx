'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X } from 'lucide-react'
import type { Categoria } from '@/lib/hooks/use-categorias'

interface CategoriaFormProps {
  categoria?: Categoria | null
  grupos: string[]
  onSubmit: (data: { nome: string; grupo: string; ativa: boolean }) => void
  onCancel: () => void
  isLoading?: boolean
}

export function CategoriaForm({
  categoria,
  grupos,
  onSubmit,
  onCancel,
  isLoading = false,
}: CategoriaFormProps) {
  const [nome, setNome] = useState('')
  const [grupo, setGrupo] = useState('')
  const [novoGrupo, setNovoGrupo] = useState('')
  const [ativa, setAtiva] = useState(true)
  const [usarNovoGrupo, setUsarNovoGrupo] = useState(false)

  useEffect(() => {
    if (categoria) {
      setNome(categoria.nome)
      setGrupo(categoria.grupo)
      setAtiva(categoria.ativa)
    }
  }, [categoria])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const grupoFinal = usarNovoGrupo ? novoGrupo : grupo
    if (!nome.trim() || !grupoFinal.trim()) return

    onSubmit({
      nome: nome.trim(),
      grupo: grupoFinal.trim(),
      ativa,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome da Categoria</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Alimentação, Transporte..."
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="grupo">Grupo</Label>
        {!usarNovoGrupo ? (
          <div className="flex gap-2">
            <Select value={grupo} onValueChange={setGrupo} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um grupo existente" />
              </SelectTrigger>
              <SelectContent>
                {grupos.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setUsarNovoGrupo(true)}
              disabled={isLoading}
            >
              Novo
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={novoGrupo}
              onChange={(e) => setNovoGrupo(e.target.value)}
              placeholder="Nome do novo grupo"
              required
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => {
                setUsarNovoGrupo(false)
                setNovoGrupo('')
              }}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="ativa"
          checked={ativa}
          onChange={(e) => setAtiva(e.target.checked)}
          className="h-4 w-4"
          disabled={isLoading}
        />
        <Label htmlFor="ativa" className="cursor-pointer">
          Categoria ativa
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : categoria ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
