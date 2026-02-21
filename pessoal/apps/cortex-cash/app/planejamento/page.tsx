'use client'

import { useLocalizationSettings } from '@/app/providers/settings-provider'
import { DashboardLayout } from '@/components/dashboard-layout'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { Textarea } from '@/components/ui/textarea'
import { getPlanejamentoService } from '@/lib/services/planejamento.service'
import { getProjecaoService } from '@/lib/services/projecao.service'
import type { Cenario, ResultadoProjecao } from '@/lib/types'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Copy,
  Edit,
  Eye,
  Loader2,
  MoreVertical,
  Plus,
  Sparkles,
  Target,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

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

  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadCenarios()
  }, [])

  const loadCenarios = async () => {
    try {
      setLoading(true)
      const planejamentoService = getPlanejamentoService()
      const projecaoService = getProjecaoService()

      let data = await planejamentoService.listCenarios()

      // Auto-generate default scenario if none exist
      if (data.length === 0) {
        setGenerating(true)
        try {
          await planejamentoService.createDefaultScenario()
          data = await planejamentoService.listCenarios()
        } catch (e) {
          console.error('Erro ao criar cenário padrão:', e)
        } finally {
          setGenerating(false)
        }
      }

      setCenarios(data)

      // Calcular projeções em paralelo para melhor performance
      const projecaoPromises = data.map((cenario) =>
        projecaoService
          .calcularProjecao(cenario.id)
          .then((resultado) => ({ id: cenario.id, resultado, erro: null }))
          .catch((error) => {
            console.error(`Erro ao calcular projeção do cenário ${cenario.id}:`, error)
            return { id: cenario.id, resultado: null, erro: error.message }
          })
      )

      const resultados = await Promise.all(projecaoPromises)

      // Construir mapa de projeções (apenas as bem-sucedidas)
      const novasProjecoes = new Map<string, ResultadoProjecao>()
      resultados.forEach((r) => {
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

  const handleOptimize = async (cenarioId: string) => {
    try {
      const planejamentoService = getPlanejamentoService()
      await planejamentoService.createOptimizedScenario(cenarioId)
      toast.success('Cenário otimizado criado! Despesas não-essenciais reduzidas em 10%.')
      loadCenarios()
    } catch (error) {
      console.error('Erro ao criar cenário otimizado:', error)
      toast.error('Erro ao otimizar cenário.')
    }
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
          <Button
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cenário
          </Button>
        </div>

        {/* Info Banner */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <CardTitle className="text-base">
                  Planeje seu futuro
                </CardTitle>
                <CardDescription className="mt-1">
                  Crie cenários personalizados para simular mudanças de comportamento financeiro.
                  Compare diferentes estratégias e veja o impacto no seu patrimônio ao longo dos
                  anos.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Lista de Cenários */}
        {loading || generating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            {generating && (
              <p className="text-sm text-muted-foreground">
                Analisando seus dados e criando cenário inicial...
              </p>
            )}
          </div>
        ) : cenarios.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Target className="h-16 w-16 mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                Nenhum cenário criado
              </h3>
              <p className="text-center max-w-md mb-6 text-muted-foreground">
                Crie seu primeiro cenário de planejamento para começar a projetar seu futuro
                financeiro.
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
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
                  className="relative overflow-hidden"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">
                            {cenario.nome}
                          </CardTitle>
                          {cenario.tipo === 'base' && (
                            <Badge
                              variant="secondary"
                            >
                              Base
                            </Badge>
                          )}
                        </div>
                        {cenario.descricao && (
                          <CardDescription
                            className="text-xs line-clamp-2"
                          >
                            {cenario.descricao}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Menu de opções do cenário"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                        >
                          <DropdownMenuItem
                            onClick={() => router.push(`/planejamento/${cenario.id}`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Cenário
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleViewDetails(cenario.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Projeção
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDuplicateCenario(cenario.id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOptimize(cenario.id)}
                            className="text-success"
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Otimizar (-10%)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(cenario.id)}
                            disabled={cenario.tipo === 'base'}
                            className="text-destructive"
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
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Horizonte: {cenario.horizonte_anos}{' '}
                        {cenario.horizonte_anos === 1 ? 'ano' : 'anos'}
                      </span>
                    </div>

                    {/* Métricas */}
                    {resumo && (
                      <div className="space-y-3 pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Patrimônio Final
                          </span>
                          <span className="text-sm font-semibold text-gold">
                            {formatCurrency(resumo.patrimonio_final)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Saving Acumulado
                          </span>
                          <span className="text-sm font-semibold text-success">
                            {formatCurrency(resumo.saving_acumulado)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Taxa de Saving
                          </span>
                          <span className="text-sm font-semibold">
                            {(resumo.taxa_saving_media * 100).toFixed(1)}%
                          </span>
                        </div>

                        {/* Objetivos */}
                        {projecao && projecao.objetivos_analise?.length > 0 && (
                          <div className="pt-2 border-t">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">
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
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="truncate flex-1">
                                      {analise.objetivo.nome}
                                    </span>
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
                                      {analise.status === 'no_caminho'
                                        ? 'Ok'
                                        : analise.status === 'precisa_ajustes'
                                          ? 'Ajustar'
                                          : 'Risco'}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Cenário de Planejamento</DialogTitle>
              <DialogDescription>
                Crie um cenário personalizado para simular seu futuro financeiro.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">
                  Nome do Cenário *
                </Label>
                <Input
                  id="nome"
                  placeholder="Ex: Aposentadoria 2035, Compra de Casa"
                  value={novoCenario.nome}
                  onChange={(e) => setNovoCenario({ ...novoCenario, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">
                  Descrição
                </Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva o objetivo deste cenário..."
                  value={novoCenario.descricao}
                  onChange={(e) => setNovoCenario({ ...novoCenario, descricao: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horizonte">
                  Horizonte de Tempo (anos) *
                </Label>
                <Input
                  id="horizonte"
                  type="number"
                  min="1"
                  max="10"
                  value={novoCenario.horizonte_anos}
                  onChange={(e) =>
                    setNovoCenario({
                      ...novoCenario,
                      horizonte_anos: Number.parseInt(e.target.value) || 5,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Entre 1 e 10 anos. Quanto maior o horizonte, mais tempo para seus objetivos.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCenario}
                disabled={!novoCenario.nome.trim()}
              >
                Criar Cenário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Cenário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este cenário? Esta ação não pode ser desfeita. Todos
                os dados de configurações e objetivos serão perdidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Detalhes do Cenário */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent
            className="max-w-4xl max-h-[80vh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle>Evolução Mensal do Cenário</DialogTitle>
              <DialogDescription>
                Projeção mês a mês de receitas, despesas e patrimônio acumulado
              </DialogDescription>
            </DialogHeader>

            {cenarioToView && projecoes.get(cenarioToView) && (
              <div className="py-4">
                <div
                  className="rounded-lg overflow-hidden border"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th
                            className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                          >
                            Mês
                          </th>
                          <th
                            className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground"
                          >
                            Receitas
                          </th>
                          <th
                            className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground"
                          >
                            Despesas
                          </th>
                          <th
                            className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground"
                          >
                            Saving
                          </th>
                          <th
                            className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground"
                          >
                            Rendimentos
                          </th>
                          <th
                            className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground"
                          >
                            Patrimônio
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {projecoes.get(cenarioToView)!.projecoes.map((projecao, idx) => {
                          const mes = new Date(projecao.mes)
                          const mesAno = mes.toLocaleDateString('pt-BR', {
                            month: 'short',
                            year: 'numeric',
                          })

                          return (
                            <tr
                              key={idx}
                              className="hover:bg-accent transition-colors border-b"
                            >
                              <td className="px-4 py-3 font-medium">
                                {mesAno}
                              </td>
                              <td
                                className="px-4 py-3 text-right font-medium text-success"
                              >
                                {formatCurrency(projecao.receitas.total)}
                              </td>
                              <td
                                className="px-4 py-3 text-right font-medium text-destructive"
                              >
                                {formatCurrency(projecao.despesas.total)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                <span
                                  className={projecao.saving >= 0 ? 'text-success' : 'text-destructive'}
                                >
                                  {formatCurrency(projecao.saving)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-gold">
                                {formatCurrency(projecao.rendimento_investimentos)}
                              </td>
                              <td
                                className="px-4 py-3 text-right font-bold text-gold"
                              >
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
