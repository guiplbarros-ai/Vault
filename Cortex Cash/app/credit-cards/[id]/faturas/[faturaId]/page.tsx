'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { FaturaLancamentoForm } from '@/components/forms'
import type { FaturaLancamentoFormData } from '@/lib/validations'
import { cartaoService } from '@/lib/services/cartao.service'
import { categoriaService } from '@/lib/services/categoria.service'
import type { CartaoConfig, Fatura, FaturaLancamento, Categoria } from '@/lib/types'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  CreditCard,
  Receipt,
  PieChart,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PageProps {
  params: {
    id: string
    faturaId: string
  }
}

export default function FaturaDetalhesPage({ params }: PageProps) {
  const router = useRouter()
  const [cartao, setCartao] = useState<CartaoConfig | null>(null)
  const [fatura, setFatura] = useState<Fatura | null>(null)
  const [lancamentos, setLancamentos] = useState<FaturaLancamento[]>([])
  const [categorias, setCategorias] = useState<Map<string, Categoria>>(new Map())
  const [loading, setLoading] = useState(true)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [lancamentoToDelete, setLancamentoToDelete] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [selectedLancamento, setSelectedLancamento] = useState<FaturaLancamento | null>(null)

  useEffect(() => {
    loadData()
  }, [params.id, params.faturaId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Carregar cartão, fatura e lançamentos em paralelo
      const [cartaoData, faturaData, lancamentosData, categoriasData] = await Promise.all([
        cartaoService.getCartaoById(params.id),
        cartaoService.getFaturaById(params.faturaId),
        cartaoService.listLancamentos(params.faturaId),
        categoriaService.listCategorias({ ativas: true }),
      ])

      if (!cartaoData) {
        toast.error('Cartão não encontrado')
        router.push('/credit-cards')
        return
      }

      if (!faturaData) {
        toast.error('Fatura não encontrada')
        router.push(`/credit-cards`)
        return
      }

      setCartao(cartaoData)
      setFatura(faturaData)
      setLancamentos(lancamentosData)

      // Criar map de categorias para lookup rápido
      const categoriasMap = new Map<string, Categoria>()
      categoriasData.forEach((cat) => categoriasMap.set(cat.id, cat))
      setCategorias(categoriasMap)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados', {
        description: 'Não foi possível carregar os dados da fatura.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: FaturaLancamentoFormData) => {
    setFormLoading(true)
    try {
      if (editMode && selectedLancamento) {
        await cartaoService.updateLancamento(selectedLancamento.id, data)
        toast.success('Lançamento atualizado', {
          description: 'O lançamento foi atualizado com sucesso.',
        })
      } else {
        await cartaoService.createLancamento(data)
        toast.success('Lançamento criado', {
          description: 'O lançamento foi adicionado à fatura.',
        })
      }
      await loadData()
      setFormDialogOpen(false)
      setEditMode(false)
      setSelectedLancamento(null)
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error)
      toast.error(editMode ? 'Erro ao atualizar' : 'Erro ao criar', {
        description: 'Não foi possível salvar o lançamento. Tente novamente.',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!lancamentoToDelete) return

    try {
      await cartaoService.deleteLancamento(lancamentoToDelete)
      await loadData()
      setDeleteDialogOpen(false)
      setLancamentoToDelete(null)
      toast.success('Lançamento excluído', {
        description: 'O lançamento foi removido da fatura.',
      })
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error)
      toast.error('Erro ao excluir', {
        description: 'Não foi possível excluir o lançamento.',
      })
    }
  }

  const handleEdit = (lancamento: FaturaLancamento) => {
    setSelectedLancamento(lancamento)
    setEditMode(true)
    setFormDialogOpen(true)
  }

  const handleNewLancamento = () => {
    setEditMode(false)
    setSelectedLancamento(null)
    setFormDialogOpen(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      aberta: { label: 'Aberta', color: '#3B82F6' },
      fechada: { label: 'Fechada', color: '#F59E0B' },
      paga: { label: 'Paga', color: '#10B981' },
      vencida: { label: 'Vencida', color: '#EF4444' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.aberta

    return (
      <Badge style={{ backgroundColor: config.color, color: '#ffffff' }}>
        {config.label}
      </Badge>
    )
  }

  // Calcular estatísticas
  const valorPendente = fatura ? fatura.valor_total - (fatura.valor_pago || 0) : 0
  const percentualPago = fatura && fatura.valor_total > 0
    ? ((fatura.valor_pago || 0) / fatura.valor_total) * 100
    : 0

  // Agrupar lançamentos por categoria
  const lancamentosPorCategoria = lancamentos.reduce((acc, lanc) => {
    const catId = lanc.categoria_id || 'sem-categoria'
    if (!acc[catId]) {
      acc[catId] = {
        categoria: categorias.get(lanc.categoria_id || ''),
        total: 0,
        count: 0,
      }
    }
    acc[catId].total += lanc.valor_brl
    acc[catId].count += 1
    return acc
  }, {} as Record<string, { categoria?: Categoria; total: number; count: number }>)

  const categoriasSorted = Object.entries(lancamentosPorCategoria).sort(
    ([, a], [, b]) => b.total - a.total
  )

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando fatura...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!fatura || !cartao) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-white/70">Fatura não encontrada</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/credit-cards')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <PageHeader
          title={`Fatura ${fatura.mes_referencia}`}
          description={`${cartao.nome} • Vence em ${formatDate(fatura.data_vencimento)}`}
          actions={
            <Button
              onClick={handleNewLancamento}
              className="text-white"
              style={{ backgroundColor: '#18B0A4', color: '#ffffff' }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Lançamento
            </Button>
          }
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563',
            }}
          >
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Status</CardDescription>
              <div className="mt-2">{getStatusBadge(fatura.status)}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-white/70">
                {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563',
            }}
          >
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Valor Total</CardDescription>
              <CardTitle className="text-3xl text-white">
                {formatCurrency(fatura.valor_total)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-white/70">Fatura completa</p>
            </CardContent>
          </Card>

          <Card
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563',
            }}
          >
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Valor Pago</CardDescription>
              <CardTitle className="text-3xl text-green-400">
                {formatCurrency(fatura.valor_pago || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-white/70">{percentualPago.toFixed(0)}% da fatura</p>
            </CardContent>
          </Card>

          <Card
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563',
            }}
          >
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Valor Pendente</CardDescription>
              <CardTitle className="text-3xl text-amber-400">
                {formatCurrency(valorPendente)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-white/70">A pagar</p>
            </CardContent>
          </Card>
        </div>

        {/* Categorias */}
        {categoriasSorted.length > 0 && (
          <Card
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563',
            }}
          >
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Gastos por Categoria
              </CardTitle>
              <CardDescription className="text-white/70">
                Distribuição dos lançamentos por categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoriasSorted.map(([catId, data]) => {
                  const percentual = (data.total / fatura.valor_total) * 100
                  return (
                    <div key={catId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white">
                          {data.categoria?.icone} {data.categoria?.nome || 'Sem categoria'}
                        </span>
                        <span className="text-white/70">
                          {formatCurrency(data.total)} ({data.count})
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${percentual}%`,
                            backgroundColor: data.categoria?.cor || '#18B0A4',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lançamentos */}
        <Card
          style={{
            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
            backgroundColor: '#3B5563',
          }}
        >
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Lançamentos
            </CardTitle>
            <CardDescription className="text-white/70">
              Todos os lançamentos desta fatura
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lancamentos.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/70 text-lg mb-2">Nenhum lançamento</p>
                <p className="text-white/50 text-sm mb-6">
                  Adicione lançamentos para rastrear os gastos desta fatura
                </p>
                <Button
                  onClick={handleNewLancamento}
                  className="text-white"
                  style={{ backgroundColor: '#18B0A4', color: '#ffffff' }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Primeiro Lançamento
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="text-white/70">Data</TableHead>
                    <TableHead className="text-white/70">Descrição</TableHead>
                    <TableHead className="text-white/70">Categoria</TableHead>
                    <TableHead className="text-white/70 text-right">Valor</TableHead>
                    <TableHead className="text-white/70 w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentos.map((lancamento) => {
                    const categoria = lancamento.categoria_id
                      ? categorias.get(lancamento.categoria_id)
                      : null

                    return (
                      <TableRow
                        key={lancamento.id}
                        className="border-white/10 hover:bg-white/5"
                      >
                        <TableCell className="text-white/90">
                          {format(
                            new Date(lancamento.data_compra),
                            'dd/MM/yyyy',
                            { locale: ptBR }
                          )}
                        </TableCell>
                        <TableCell className="text-white">
                          <div className="flex flex-col">
                            <span>{lancamento.descricao}</span>
                            {lancamento.parcela_numero && lancamento.parcela_total && (
                              <span className="text-xs text-white/50">
                                Parcela {lancamento.parcela_numero}/{lancamento.parcela_total}
                              </span>
                            )}
                            {lancamento.moeda_original && lancamento.moeda_original !== 'BRL' && (
                              <span className="text-xs text-white/50">
                                {lancamento.moeda_original} {lancamento.valor_original?.toFixed(2)} × {lancamento.taxa_cambio?.toFixed(4)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-white/90">
                          {categoria ? (
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: categoria.cor || '#18B0A4',
                                color: '#ffffff',
                              }}
                            >
                              {categoria.icone} {categoria.nome}
                            </Badge>
                          ) : (
                            <span className="text-white/50 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-white font-semibold">
                          {formatCurrency(lancamento.valor_brl)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-white hover:bg-white/10"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="!bg-gray-800 !border-gray-700"
                              style={{
                                backgroundColor: '#1f2937',
                                borderColor: '#374151',
                              }}
                            >
                              <DropdownMenuItem
                                onClick={() => handleEdit(lancamento)}
                                className="!text-white hover:!bg-gray-700 cursor-pointer"
                                style={{ color: '#ffffff' }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="!bg-gray-600" />
                              <DropdownMenuItem
                                className="!text-red-400 hover:!bg-gray-700 cursor-pointer"
                                style={{ color: '#f87171' }}
                                onClick={() => {
                                  setLancamentoToDelete(lancamento.id)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563',
              borderColor: '#374151',
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-white">
                {editMode ? 'Editar Lançamento' : 'Novo Lançamento'}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                {editMode
                  ? 'Atualize as informações do lançamento.'
                  : 'Adicione um novo lançamento a esta fatura.'}
              </DialogDescription>
            </DialogHeader>
            <FaturaLancamentoForm
              faturaId={params.faturaId}
              defaultValues={
                selectedLancamento
                  ? {
                      fatura_id: selectedLancamento.fatura_id,
                      descricao: selectedLancamento.descricao,
                      valor_brl: selectedLancamento.valor_brl,
                      data_compra: new Date(selectedLancamento.data_compra),
                      categoria_id: selectedLancamento.categoria_id,
                      parcela_numero: selectedLancamento.parcela_numero,
                      parcela_total: selectedLancamento.parcela_total,
                      moeda_original: selectedLancamento.moeda_original,
                      valor_original: selectedLancamento.valor_original,
                      taxa_cambio: selectedLancamento.taxa_cambio,
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
              onCancel={() => {
                setFormDialogOpen(false)
                setEditMode(false)
                setSelectedLancamento(null)
              }}
              isLoading={formLoading}
              submitLabel={editMode ? 'Atualizar' : 'Adicionar'}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Lançamento"
          description="Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          variant="destructive"
          onConfirm={handleDelete}
          isDark={true}
        />
      </div>
    </DashboardLayout>
  )
}
