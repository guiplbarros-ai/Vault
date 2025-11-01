'use client'

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BudgetForm } from "@/components/forms/budget-form"
import { Plus, Calendar, Copy, TrendingUp, TrendingDown, AlertTriangle, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { orcamentoService, type OrcamentoComProgresso } from "@/lib/services/orcamento.service"
import { toast } from "sonner"
import { format, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { OrcamentoFormData } from "@/lib/validations/budget"

export default function BudgetsPage() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoComProgresso[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
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
      toast.error('Erro ao carregar orçamentos')
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
        toast.success('Orçamento atualizado com sucesso')
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
        toast.success('Orçamento criado com sucesso')
      }

      setDialogOpen(false)
      await loadOrcamentos()
    } catch (error: any) {
      console.error('Erro ao salvar orçamento:', error)
      toast.error(error?.message || 'Erro ao salvar orçamento')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyFromPreviousMonth = async () => {
    const mesAnterior = format(subMonths(mesReferencia, 1), 'yyyy-MM')

    try {
      const count = await orcamentoService.copiarOrcamentosParaMes(mesAnterior, mesReferenciaStr)

      if (count === 0) {
        toast.info(`Nenhum orçamento encontrado em ${format(subMonths(mesReferencia, 1), 'MMMM yyyy', { locale: ptBR })}`)
      } else {
        toast.success(`${count} orçamento(s) copiado(s) com sucesso`)
        await loadOrcamentos()
      }
    } catch (error) {
      console.error('Erro ao copiar orçamentos:', error)
      toast.error('Erro ao copiar orçamentos')
    }
  }

  const handleRecalcular = async () => {
    try {
      const count = await orcamentoService.recalcularTodosDoMes(mesReferenciaStr)
      toast.success(`${count} orçamento(s) recalculado(s)`)
      await loadOrcamentos()
    } catch (error) {
      console.error('Erro ao recalcular orçamentos:', error)
      toast.error('Erro ao recalcular orçamentos')
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
        return 'bg-green-500'
      case 'atencao':
        return 'bg-yellow-500'
      case 'excedido':
        return 'bg-red-500'
    }
  }

  const getStatusIcon = (status: 'ok' | 'atencao' | 'excedido') => {
    switch (status) {
      case 'ok':
        return <Check className="h-4 w-4 text-green-500" />
      case 'atencao':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'excedido':
        return <TrendingUp className="h-4 w-4 text-red-500" />
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Orçamentos"
          description="Planeje e acompanhe seus gastos mensais"
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
                <span className="text-lg font-medium text-white">Período:</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMesAnterior}
                  disabled={loading}
                  style={{
                    borderColor: 'rgb(51, 65, 85)',
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
                  style={{
                    borderColor: 'rgb(51, 65, 85)',
                    color: 'white',
                    minWidth: '150px',
                  }}
                >
                  {format(mesReferencia, 'MMMM yyyy', { locale: ptBR })}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleProximoMes}
                  disabled={loading || (mesReferencia.getMonth() === new Date().getMonth() &&
                            mesReferencia.getFullYear() === new Date().getFullYear())}
                  style={{
                    borderColor: 'rgb(51, 65, 85)',
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
                  style={{
                    borderColor: 'rgb(51, 65, 85)',
                    color: 'white',
                  }}
                >
                  Recalcular
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        {resumo && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card style={{ backgroundColor: 'rgb(15, 23, 42)', borderColor: 'rgb(30, 41, 59)' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Planejado</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(resumo.total_planejado)}</div>
              </CardContent>
            </Card>

            <Card style={{ backgroundColor: 'rgb(15, 23, 42)', borderColor: 'rgb(30, 41, 59)' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Realizado</CardTitle>
                <TrendingDown className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(resumo.total_realizado)}</div>
                <p className="text-xs text-white/70 mt-1">
                  {resumo.percentual_usado.toFixed(1)}% do planejado
                </p>
              </CardContent>
            </Card>

            <Card style={{ backgroundColor: 'rgb(15, 23, 42)', borderColor: 'rgb(30, 41, 59)' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Disponível</CardTitle>
                <Check className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(resumo.total_restante)}</div>
              </CardContent>
            </Card>

            <Card style={{ backgroundColor: 'rgb(15, 23, 42)', borderColor: 'rgb(30, 41, 59)' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Status</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-sm text-white">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span>{resumo.orcamentos_ok} OK</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                    <span>{resumo.orcamentos_atencao} Atenção</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <span>{resumo.orcamentos_excedidos} Excedido</span>
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
            <CardTitle className="text-white text-lg">Orçamentos do Mês</CardTitle>
            <CardDescription className="text-white/70">
              Acompanhe o progresso de cada orçamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : orcamentos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/70 text-lg mb-2">
                  Nenhum orçamento cadastrado para este mês
                </p>
                <p className="text-white/50 text-sm">
                  Crie seu primeiro orçamento ou copie do mês anterior
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orcamentos.map((orc) => (
                  <div
                    key={orc.id}
                    className="rounded-lg p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                    onClick={() => handleEdit(orc)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {orc.tipo === 'categoria' && orc.categoria_icone && (
                          <span className="text-2xl">{orc.categoria_icone}</span>
                        )}
                        <div>
                          <h3 className="text-white font-medium flex items-center gap-2">
                            {orc.nome}
                            {getStatusIcon(orc.status)}
                          </h3>
                          <p className="text-sm text-white/70">
                            {orc.tipo === 'categoria' && orc.categoria_nome}
                            {orc.tipo === 'centro_custo' && orc.centro_custo_nome}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-white font-medium">
                          {formatCurrency(orc.valor_realizado)} / {formatCurrency(orc.valor_planejado)}
                        </p>
                        <p className="text-sm text-white/70">
                          {orc.percentual_usado.toFixed(1)}% usado
                        </p>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getStatusColor(orc.status)} transition-all duration-300`}
                        style={{ width: `${Math.min(orc.percentual_usado, 100)}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                      <span>Restante: {formatCurrency(orc.valor_restante)}</span>
                      <span className="uppercase">{orc.status}</span>
                    </div>
                  </div>
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
            backgroundColor: 'rgb(15, 23, 42)',
            borderColor: 'rgb(30, 41, 59)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingOrcamento ? 'Editar Orçamento' : 'Novo Orçamento'}
            </DialogTitle>
            <DialogDescription style={{ color: 'rgb(148, 163, 184)' }}>
              {editingOrcamento
                ? 'Atualize as informações do orçamento'
                : 'Crie um novo orçamento mensal para controlar seus gastos'}
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
            onCancel={() => setDialogOpen(false)}
            isLoading={submitting}
            submitLabel={editingOrcamento ? 'Atualizar' : 'Criar'}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
