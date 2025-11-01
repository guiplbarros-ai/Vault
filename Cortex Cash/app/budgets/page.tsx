'use client'

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BudgetForm } from "@/components/forms/budget-form"
import {
  Plus,
  Calendar,
  Copy,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  PieChart,
} from "lucide-react"
import { orcamentoService, type OrcamentoComProgresso } from "@/lib/services/orcamento.service"
import { toast } from "sonner"
import { format, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { OrcamentoFormData } from "@/lib/validations/budget"

export default function BudgetsPage() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoComProgresso[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orcamentoToDelete, setOrcamentoToDelete] = useState<string | null>(null)
  const [editingOrcamento, setEditingOrcamento] = useState<OrcamentoComProgresso | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [mesReferencia, setMesReferencia] = useState<Date>(new Date())
  const [resumo, setResumo] = useState<{
    total_planejado: number
    total_realizado: number
    total_restante: number
    percentual_usado: number
    orcamentos_ok: number
    orcamentos_atencao: number
    orcamentos_excedidos: number
  } | null>(null)

  const mesReferenciaStr = format(mesReferencia, 'yyyy-MM')

  useEffect(() => {
    loadOrcamentos()
  }, [mesReferencia])

  const loadOrcamentos = async () => {
    try {
      setLoading(true)
      const [data, resumoData] = await Promise.all([
        orcamentoService.listOrcamentosComProgresso({ mesReferencia: mesReferenciaStr }),
        orcamentoService.getResumoMensal(mesReferenciaStr)
      ])
      setOrcamentos(data)
      setResumo(resumoData)
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error)
      toast.error('Erro ao carregar orçamentos', {
        description: 'Não foi possível carregar os dados. Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingOrcamento(null)
    setDialogOpen(true)
  }

  const handleEdit = (orcamento: OrcamentoComProgresso) => {
    setEditingOrcamento(orcamento)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!orcamentoToDelete) return

    try {
      await orcamentoService.deleteOrcamento(orcamentoToDelete)
      toast.success('Orçamento excluído', {
        description: 'O orçamento foi removido com sucesso.',
      })
      setDeleteDialogOpen(false)
      setOrcamentoToDelete(null)
      await loadOrcamentos()
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error)
      toast.error('Erro ao excluir orçamento', {
        description: 'Não foi possível excluir o orçamento.',
      })
    }
  }

  const handleSubmit = async (data: OrcamentoFormData) => {
    try {
      setSubmitting(true)

      if (editingOrcamento) {
        await orcamentoService.updateOrcamento(editingOrcamento.id, {
          nome: data.nome,
          valor_planejado: data.valor_planejado,
          alerta_80: data.alerta_80,
          alerta_100: data.alerta_100,
        })
        toast.success('Orçamento atualizado', {
          description: 'As alterações foram salvas com sucesso.',
        })
      } else {
        await orcamentoService.createOrcamento({
          nome: data.nome,
          tipo: data.tipo,
          categoria_id: data.categoria_id,
          centro_custo_id: data.centro_custo_id,
          mes_referencia: data.mes_referencia,
          valor_planejado: data.valor_planejado,
          alerta_80: data.alerta_80,
          alerta_100: data.alerta_100,
        })
        toast.success('Orçamento criado', {
          description: 'O novo orçamento foi adicionado com sucesso.',
        })
      }

      setDialogOpen(false)
      setEditingOrcamento(null)
      await loadOrcamentos()
    } catch (error: any) {
      console.error('Erro ao salvar orçamento:', error)
      toast.error(error?.message || 'Erro ao salvar orçamento', {
        description: 'Verifique os dados e tente novamente.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyFromPreviousMonth = async () => {
    const mesAnterior = format(subMonths(mesReferencia, 1), 'yyyy-MM')

    try {
      const count = await orcamentoService.copiarOrcamentosParaMes(mesAnterior, mesReferenciaStr)

      if (count === 0) {
        toast.info('Nenhum orçamento encontrado', {
          description: `Não há orçamentos em ${format(subMonths(mesReferencia, 1), 'MMMM yyyy', { locale: ptBR })}`,
        })
      } else {
        toast.success(`${count} orçamento(s) copiado(s)`, {
          description: 'Os orçamentos foram duplicados para este mês.',
        })
        await loadOrcamentos()
      }
    } catch (error) {
      console.error('Erro ao copiar orçamentos:', error)
      toast.error('Erro ao copiar orçamentos', {
        description: 'Não foi possível copiar os orçamentos.',
      })
    }
  }

  const handleRecalcular = async () => {
    try {
      const count = await orcamentoService.recalcularTodosDoMes(mesReferenciaStr)
      toast.success(`${count} orçamento(s) recalculado(s)`, {
        description: 'Os valores foram atualizados com base nas transações.',
      })
      await loadOrcamentos()
    } catch (error) {
      console.error('Erro ao recalcular orçamentos:', error)
      toast.error('Erro ao recalcular orçamentos', {
        description: 'Não foi possível recalcular os valores.',
      })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getStatusColor = (status: 'ok' | 'atencao' | 'excedido') => {
    switch (status) {
      case 'ok':
        return '#10B981' // green-500
      case 'atencao':
        return '#F59E0B' // amber-500
      case 'excedido':
        return '#EF4444' // red-500
    }
  }

  const getStatusIcon = (status: 'ok' | 'atencao' | 'excedido') => {
    switch (status) {
      case 'ok':
        return <Check className="h-4 w-4 text-green-400" />
      case 'atencao':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />
      case 'excedido':
        return <TrendingUp className="h-4 w-4 text-red-400" />
    }
  }

  const getStatusLabel = (status: 'ok' | 'atencao' | 'excedido') => {
    switch (status) {
      case 'ok':
        return 'No limite'
      case 'atencao':
        return 'Atenção'
      case 'excedido':
        return 'Excedido'
    }
  }

  const handleMesAnterior = () => {
    setMesReferencia(prev => subMonths(prev, 1))
  }

  const handleProximoMes = () => {
    const proximoMes = new Date(mesReferencia)
    proximoMes.setMonth(proximoMes.getMonth() + 1)

    const hoje = new Date()
    if (proximoMes <= hoje) {
      setMesReferencia(proximoMes)
    }
  }

  const handleMesAtual = () => {
    setMesReferencia(new Date())
  }

  const isProximoMesDisabled = () => {
    const hoje = new Date()
    return mesReferencia.getMonth() === hoje.getMonth() &&
           mesReferencia.getFullYear() === hoje.getFullYear()
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
            <p className="text-white/70">Carregando orçamentos...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Orçamentos"
          description="Planeje e acompanhe seus gastos mensais por categoria"
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCopyFromPreviousMonth}
                disabled={loading}
                style={{
                  borderColor: 'rgb(71, 85, 105)',
                  color: 'white',
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar Mês Anterior
              </Button>
              <Button
                onClick={handleCreate}
                className="text-white"
                style={{
                  backgroundColor: '#18B0A4',
                  color: '#ffffff'
                }}
              >
                <Plus className="mr-2 h-5 w-5" />
                Novo Orçamento
              </Button>
            </div>
          }
        />

        {/* Controles de Período */}
        <Card style={{
          background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
          backgroundColor: '#3B5563'
        }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-white" />
                <span className="text-lg font-semibold text-white">Período:</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMesAnterior}
                  disabled={loading}
                  className="text-white hover:bg-white/10"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMesAtual}
                  disabled={loading}
                  className="text-white hover:bg-white/10 capitalize"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    minWidth: '180px',
                  }}
                >
                  {format(mesReferencia, 'MMMM yyyy', { locale: ptBR })}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleProximoMes}
                  disabled={loading || isProximoMesDisabled()}
                  className="text-white hover:bg-white/10"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecalcular}
                  disabled={loading}
                  className="text-white hover:bg-white/10"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recalcular
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        {resumo && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563'
            }}>
              <CardHeader className="pb-3">
                <CardDescription className="text-white/70">Total Planejado</CardDescription>
                <CardTitle className="text-3xl text-white">{formatCurrency(resumo.total_planejado)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-white/70 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Orçamento mensal
                </p>
              </CardContent>
            </Card>

            <Card style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563'
            }}>
              <CardHeader className="pb-3">
                <CardDescription className="text-white/70">Total Realizado</CardDescription>
                <CardTitle className="text-3xl text-amber-400">{formatCurrency(resumo.total_realizado)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-white/70">
                  {resumo.percentual_usado.toFixed(1)}% do orçamento planejado
                </p>
              </CardContent>
            </Card>

            <Card style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563'
            }}>
              <CardHeader className="pb-3">
                <CardDescription className="text-white/70">Disponível</CardDescription>
                <CardTitle className="text-3xl text-green-400">{formatCurrency(resumo.total_restante)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-white/70 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Restante para gastar
                </p>
              </CardContent>
            </Card>

            <Card style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563'
            }}>
              <CardHeader className="pb-3">
                <CardDescription className="text-white/70">Status dos Orçamentos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-400"></div>
                      <span>No limite</span>
                    </div>
                    <span className="font-semibold">{resumo.orcamentos_ok}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-400"></div>
                      <span>Atenção</span>
                    </div>
                    <span className="font-semibold">{resumo.orcamentos_atencao}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-400"></div>
                      <span>Excedido</span>
                    </div>
                    <span className="font-semibold">{resumo.orcamentos_excedidos}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de Orçamentos */}
        <Card style={{
          background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
          backgroundColor: '#3B5563'
        }}>
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Orçamentos do Mês
            </CardTitle>
            <CardDescription className="text-white/70">
              Acompanhe o progresso de cada orçamento em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orcamentos.length === 0 ? (
              <div className="text-center py-16">
                <PieChart className="h-16 w-16 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-white">Nenhum orçamento cadastrado</h3>
                <p className="text-white/70 mb-6 max-w-md mx-auto">
                  Crie seu primeiro orçamento para este mês ou copie os orçamentos do mês anterior
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleCopyFromPreviousMonth}
                    style={{
                      borderColor: 'rgb(71, 85, 105)',
                      color: 'white',
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Mês Anterior
                  </Button>
                  <Button
                    onClick={handleCreate}
                    style={{
                      backgroundColor: '#18B0A4',
                      color: '#ffffff'
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeiro Orçamento
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {orcamentos.map((orc) => (
                  <Card
                    key={orc.id}
                    className="relative overflow-hidden border-l-4 transition-all hover:shadow-lg"
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderLeftColor: getStatusColor(orc.status),
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {orc.tipo === 'categoria' && orc.categoria_icone && (
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl"
                              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                            >
                              {orc.categoria_icone}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base text-white truncate">{orc.nome}</CardTitle>
                              {getStatusIcon(orc.status)}
                            </div>
                            <CardDescription className="text-xs text-white/70">
                              {orc.tipo === 'categoria' && orc.categoria_nome}
                              {orc.tipo === 'centro_custo' && orc.centro_custo_nome}
                            </CardDescription>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="!bg-gray-800 !border-gray-700"
                            style={{
                              backgroundColor: '#1f2937',
                              borderColor: '#374151'
                            }}
                          >
                            <DropdownMenuItem
                              onClick={() => handleEdit(orc)}
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
                                setOrcamentoToDelete(orc.id)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-white/70">Realizado</span>
                        <span className="text-lg font-bold text-white">{formatCurrency(orc.valor_realizado)}</span>
                      </div>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-white/70">Planejado</span>
                        <span className="font-semibold text-white/90">
                          {formatCurrency(orc.valor_planejado)}
                        </span>
                      </div>

                      {/* Barra de Progresso */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                          <span>{orc.percentual_usado.toFixed(1)}% usado</span>
                          <span className="font-medium">{getStatusLabel(orc.status)}</span>
                        </div>
                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${Math.min(orc.percentual_usado, 100)}%`,
                              backgroundColor: getStatusColor(orc.status),
                            }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs">
                        <span className="text-white/70">Restante</span>
                        <span className={`font-semibold ${orc.valor_restante >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(orc.valor_restante)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              {editingOrcamento ? 'Editar Orçamento' : 'Novo Orçamento'}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {editingOrcamento
                ? 'Atualize as informações do orçamento mensal.'
                : 'Crie um novo orçamento mensal para controlar seus gastos.'}
            </DialogDescription>
          </DialogHeader>

          <BudgetForm
            defaultValues={editingOrcamento ? {
              nome: editingOrcamento.nome,
              tipo: editingOrcamento.tipo,
              categoria_id: editingOrcamento.categoria_id,
              centro_custo_id: editingOrcamento.centro_custo_id,
              mes_referencia: editingOrcamento.mes_referencia,
              valor_planejado: editingOrcamento.valor_planejado,
              alerta_80: editingOrcamento.alerta_80,
              alerta_100: editingOrcamento.alerta_100,
            } : undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false)
              setEditingOrcamento(null)
            }}
            isLoading={submitting}
            submitLabel={editingOrcamento ? 'Atualizar Orçamento' : 'Criar Orçamento'}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Orçamento"
        description="Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
        isDark={true}
      />
    </DashboardLayout>
  )
}
