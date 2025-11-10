'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPlanejamentoService } from '@/lib/services/planejamento.service'
import { getProjecaoService } from '@/lib/services/projecao.service'
import { useLocalizationSettings } from '@/app/providers/settings-provider'
import type { Cenario, ResultadoProjecao } from '@/lib/types'
import { toast } from 'sonner'
import {
  Plus,
  TrendingUp,
  Calendar,
  Target,
  MoreVertical,
  Loader2,
  Sparkles,
  Copy,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Edit,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function PlanejamentoPage() {
  const router = useRouter()
  const [cenarios, setCenarios] = useState<Cenario[]>([])
  const [loading, setLoading] = useState(true)
  const [projecoes, setProjecoes] = useState<Map<string, ResultadoProjecao>>(new Map())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [cenarioToDelete, setCenarioToDelete] = useState<string | null>(null)
  const [cenarioToView, setCenarioToView] = useState<string | null>(null)
  const [novoCenario, setNovoCenario] = useState({ nome: '', descricao: '', horizonte_anos: 5 })
  const { formatCurrency } = useLocalizationSettings()

  useEffect(() => {
    loadCenarios()
  }, [])

  const loadCenarios = async () => {
    try {
      setLoading(true)
      const planejamentoService = getPlanejamentoService()
      const projecaoService = getProjecaoService()

      const data = await planejamentoService.listCenarios()
      setCenarios(data)

      // Calcular projeções em paralelo para melhor performance
      const projecaoPromises = data.map(cenario =>
        projecaoService.calcularProjecao(cenario.id)
          .then(resultado => ({ id: cenario.id, resultado, erro: null }))
          .catch(error => {
            console.error(`Erro ao calcular projeção do cenário ${cenario.id}:`, error)
            return { id: cenario.id, resultado: null, erro: error.message }
          })
      )

      const resultados = await Promise.all(projecaoPromises)

      // Construir mapa de projeções (apenas as bem-sucedidas)
      const novasProjecoes = new Map<string, ResultadoProjecao>()
      resultados.forEach(r => {
        if (r.resultado) {
          novasProjecoes.set(r.id, r.resultado)
        }
      })

      setProjecoes(novasProjecoes)
    } catch (error) {
      console.error('Erro ao carregar cenários:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCenario = async () => {
    try {
      const planejamentoService = getPlanejamentoService()
      await planejamentoService.createCenario({
        nome: novoCenario.nome,
        descricao: novoCenario.descricao,
        horizonte_anos: novoCenario.horizonte_anos,
      })
      setDialogOpen(false)
      setNovoCenario({ nome: '', descricao: '', horizonte_anos: 5 })
      toast.success('Cenário criado com sucesso!')
      loadCenarios()
    } catch (error) {
      console.error('Erro ao criar cenário:', error)
      toast.error('Erro ao criar cenário. Verifique os campos e tente novamente.')
    }
  }

  const handleDuplicateCenario = async (cenarioId: string) => {
    try {
      const planejamentoService = getPlanejamentoService()
      await planejamentoService.duplicarCenario(cenarioId)
      toast.success('Cenário duplicado com sucesso!')
      loadCenarios()
    } catch (error) {
      console.error('Erro ao duplicar cenário:', error)
      toast.error('Erro ao duplicar cenário.')
    }
  }

  const handleViewDetails = (cenarioId: string) => {
    setCenarioToView(cenarioId)
    setDetailsDialogOpen(true)
  }

  const handleDeleteClick = (cenarioId: string) => {
    setCenarioToDelete(cenarioId)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!cenarioToDelete) return
    try {
      const planejamentoService = getPlanejamentoService()
      await planejamentoService.deleteCenario(cenarioToDelete)
      toast.success('Cenário excluído com sucesso!')
      loadCenarios()
    } catch (error) {
      console.error('Erro ao deletar cenário:', error)
      toast.error('Erro ao deletar cenário. Não é possível deletar o cenário base.')
    } finally {
      setDeleteDialogOpen(false)
      setCenarioToDelete(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <PageHeader
            title="Planejamento Financeiro"
            description="Projete seu futuro financeiro e simule diferentes cenários"
          />
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cenário
          </Button>
        </div>

        {/* Info Banner */}
        <Card
          style={{
            background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
            backgroundColor: '#2C3E50',
          }}
          className="border-white/20"
        >
          <CardHeader>
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 mt-0.5" style={{ color: '#18B0A4' }} />
              <div>
                <CardTitle className="text-base text-white">Planeje seu futuro</CardTitle>
                <CardDescription className="mt-1 text-white/70">
                  Crie cenários personalizados para simular mudanças de comportamento financeiro.
                  Compare diferentes estratégias e veja o impacto no seu patrimônio ao longo dos anos.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Lista de Cenários */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cenarios.length === 0 ? (
          <Card
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563'
            }}
          >
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Target className="h-16 w-16 text-white/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Nenhum cenário criado</h3>
              <p className="text-white/70 text-center max-w-md mb-6">
                Crie seu primeiro cenário de planejamento para começar a projetar seu futuro financeiro.
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="text-white"
                style={{
                  backgroundColor: '#18B0A4',
                  color: '#ffffff'
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Cenário
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cenarios.map((cenario) => {
              const projecao = projecoes.get(cenario.id)
              const resumo = projecao?.resumo

              return (
                <Card
                  key={cenario.id}
                  className="relative overflow-hidden border-white/20"
                  style={{
                    background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                    backgroundColor: '#3B5563',
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg text-white">{cenario.nome}</CardTitle>
                          {cenario.tipo === 'base' && (
                            <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                              Base
                            </Badge>
                          )}
                        </div>
                        {cenario.descricao && (
                          <CardDescription className="text-xs line-clamp-2 text-white/70">
                            {cenario.descricao}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white hover:bg-white/10"
                            aria-label="Menu de opções do cenário"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#2C3E50] border-white/20"
                        >
                          <DropdownMenuItem
                            onClick={() => router.push(`/planejamento/${cenario.id}`)}
                            className="text-white hover:bg-white/10 focus:bg-white/10"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Cenário
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleViewDetails(cenario.id)}
                            className="text-white hover:bg-white/10 focus:bg-white/10"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Projeção
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => handleDuplicateCenario(cenario.id)}
                            className="text-white hover:bg-white/10 focus:bg-white/10"
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(cenario.id)}
                            disabled={cenario.tipo === 'base'}
                            className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 disabled:opacity-50"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Horizonte */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-white/60" />
                      <span className="text-white/70">
                        Horizonte: {cenario.horizonte_anos} {cenario.horizonte_anos === 1 ? 'ano' : 'anos'}
                      </span>
                    </div>

                    {/* Métricas */}
                    {resumo && (
                      <div className="space-y-3 pt-3 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/70">Patrimônio Final</span>
                          <span className="text-sm font-semibold text-white">
                            {formatCurrency(resumo.patrimonio_final)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/70">Saving Acumulado</span>
                          <span className="text-sm font-semibold text-[#18B0A4]">
                            {formatCurrency(resumo.saving_acumulado)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/70">Taxa de Saving</span>
                          <span className="text-sm font-semibold text-white">
                            {(resumo.taxa_saving_media * 100).toFixed(1)}%
                          </span>
                        </div>

                        {/* Objetivos */}
                        {projecao && projecao.objetivos_analise?.length > 0 && (
                          <div className="pt-2 border-t border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="h-3.5 w-3.5 text-white/60" />
                              <span className="text-xs font-medium text-white/70">
                                Objetivos ({projecao.objetivos_analise.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {projecao.objetivos_analise.slice(0, 2).map((analise, idx) => {
                                const StatusIcon =
                                  analise.status === 'no_caminho'
                                    ? CheckCircle
                                    : analise.status === 'precisa_ajustes'
                                    ? AlertTriangle
                                    : XCircle

                                return (
                                  <div key={idx} className="flex items-center justify-between text-xs">
                                    <span className="truncate flex-1 text-white/80">{analise.objetivo.nome}</span>
                                    <Badge
                                      variant={
                                        analise.status === 'no_caminho'
                                          ? 'default'
                                          : analise.status === 'precisa_ajustes'
                                          ? 'secondary'
                                          : 'destructive'
                                      }
                                      className="ml-2 text-[10px] h-5 flex items-center gap-1"
                                    >
                                      <StatusIcon className="h-2.5 w-2.5" />
                                      {analise.status === 'no_caminho' ? 'Ok' : analise.status === 'precisa_ajustes' ? 'Ajustar' : 'Risco'}
                                    </Badge>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Dialog de Novo Cenário */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent
            className="border-white/20"
            style={{
              background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              backgroundColor: '#2C3E50',
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-white">Novo Cenário de Planejamento</DialogTitle>
              <DialogDescription className="text-white/70">
                Crie um cenário personalizado para simular seu futuro financeiro.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-white">Nome do Cenário *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Aposentadoria 2035, Compra de Casa"
                  value={novoCenario.nome}
                  onChange={(e) => setNovoCenario({ ...novoCenario, nome: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-white">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva o objetivo deste cenário..."
                  value={novoCenario.descricao}
                  onChange={(e) => setNovoCenario({ ...novoCenario, descricao: e.target.value })}
                  rows={3}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horizonte" className="text-white">Horizonte de Tempo (anos) *</Label>
                <Input
                  id="horizonte"
                  type="number"
                  min="1"
                  max="10"
                  value={novoCenario.horizonte_anos}
                  onChange={(e) =>
                    setNovoCenario({ ...novoCenario, horizonte_anos: parseInt(e.target.value) || 5 })
                  }
                  className="bg-white/10 border-white/20 text-white"
                />
                <p className="text-xs text-white/60">
                  Entre 1 e 10 anos. Quanto maior o horizonte, mais tempo para seus objetivos.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCenario}
                disabled={!novoCenario.nome.trim()}
                className="text-white"
                style={{
                  backgroundColor: '#18B0A4',
                  color: '#ffffff'
                }}
              >
                Criar Cenário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent
            className="border-white/20"
            style={{
              background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              backgroundColor: '#2C3E50',
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Excluir Cenário</AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">
                Tem certeza que deseja excluir este cenário? Esta ação não pode ser desfeita.
                Todos os dados de configurações e objetivos serão perdidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Detalhes do Cenário */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent
            className="border-white/20 max-w-4xl max-h-[80vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(135deg, #2C3E50 0%, #1a252f 100%)',
              backgroundColor: '#2C3E50',
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-white">Evolução Mensal do Cenário</DialogTitle>
              <DialogDescription className="text-white/70">
                Projeção mês a mês de receitas, despesas e patrimônio acumulado
              </DialogDescription>
            </DialogHeader>

            {cenarioToView && projecoes.get(cenarioToView) && (
              <div className="py-4">
                <div className="rounded-lg border border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                          <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                            Mês
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                            Receitas
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                            Despesas
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                            Saving
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                            Rendimentos
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                            Patrimônio
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {projecoes.get(cenarioToView)!.projecoes.map((projecao, idx) => {
                          const mes = new Date(projecao.mes)
                          const mesAno = mes.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })

                          return (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 text-white/90 font-medium">
                                {mesAno}
                              </td>
                              <td className="px-4 py-3 text-right text-green-400 font-medium">
                                {formatCurrency(projecao.receitas.total)}
                              </td>
                              <td className="px-4 py-3 text-right text-red-400 font-medium">
                                {formatCurrency(projecao.despesas.total)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                <span className={projecao.saving >= 0 ? 'text-[#18B0A4]' : 'text-red-400'}>
                                  {formatCurrency(projecao.saving)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-blue-400">
                                {formatCurrency(projecao.rendimento_investimentos)}
                              </td>
                              <td className="px-4 py-3 text-right text-white font-bold">
                                {formatCurrency(projecao.patrimonio_acumulado)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDetailsDialogOpen(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
