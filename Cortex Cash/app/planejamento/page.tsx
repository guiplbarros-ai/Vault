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
          <Button
            onClick={() => setDialogOpen(true)}
            className="hover:bg-[#2E7D6B]"
            style={{
              backgroundColor: '#3A8F6E',
              color: '#F2F7F5',
              borderRadius: '12px',
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cenário
          </Button>
        </div>

        {/* Info Banner */}
        <Card
          style={{
            backgroundColor: '#18322C',
            borderColor: '#2A4942',
            borderWidth: '1px',
            borderRadius: '18px',
            boxShadow: '0 1px 0 rgba(0,0,0,.35), 0 6px 12px rgba(0,0,0,.25)',
          }}
        >
          <CardHeader>
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 mt-0.5" style={{ color: '#3A8F6E' }} />
              <div>
                <CardTitle className="text-base" style={{ color: '#F2F7F5' }}>Planeje seu futuro</CardTitle>
                <CardDescription className="mt-1" style={{ color: '#B2BDB9' }}>
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
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#3A8F6E' }} />
          </div>
        ) : cenarios.length === 0 ? (
          <Card
            style={{
              backgroundColor: '#18322C',
              borderColor: '#2A4942',
              borderWidth: '1px',
              borderRadius: '18px',
              boxShadow: '0 1px 0 rgba(0,0,0,.35), 0 6px 12px rgba(0,0,0,.25)',
            }}
          >
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Target className="h-16 w-16 mb-4" style={{ color: '#8CA39C' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#F2F7F5' }}>Nenhum cenário criado</h3>
              <p className="text-center max-w-md mb-6" style={{ color: '#B2BDB9' }}>
                Crie seu primeiro cenário de planejamento para começar a projetar seu futuro financeiro.
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="hover:bg-[#2E7D6B]"
                style={{
                  backgroundColor: '#3A8F6E',
                  color: '#F2F7F5',
                  borderRadius: '12px',
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
                  className="relative overflow-hidden"
                  style={{
                    backgroundColor: '#18322C',
                    borderColor: '#2A4942',
                    borderWidth: '1px',
                    borderRadius: '18px',
                    boxShadow: '0 1px 0 rgba(0,0,0,.35), 0 6px 12px rgba(0,0,0,.25)',
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg" style={{ color: '#F2F7F5' }}>{cenario.nome}</CardTitle>
                          {cenario.tipo === 'base' && (
                            <Badge variant="secondary" style={{ backgroundColor: '#213A34', color: '#F2F7F5', borderColor: '#2A4942' }}>
                              Base
                            </Badge>
                          )}
                        </div>
                        {cenario.descricao && (
                          <CardDescription className="text-xs line-clamp-2" style={{ color: '#B2BDB9' }}>
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
                            style={{ color: '#F2F7F5' }}
                            aria-label="Menu de opções do cenário"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          style={{
                            backgroundColor: '#142A25',
                            borderColor: '#2A4942'
                          }}
                        >
                          <DropdownMenuItem
                            onClick={() => router.push(`/planejamento/${cenario.id}`)}
                            style={{ color: '#F2F7F5' }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Cenário
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleViewDetails(cenario.id)}
                            style={{ color: '#F2F7F5' }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Projeção
                          </DropdownMenuItem>
                          <DropdownMenuSeparator style={{ backgroundColor: '#213A34' }} />
                          <DropdownMenuItem
                            onClick={() => handleDuplicateCenario(cenario.id)}
                            style={{ color: '#F2F7F5' }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator style={{ backgroundColor: '#213A34' }} />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(cenario.id)}
                            disabled={cenario.tipo === 'base'}
                            style={{ color: '#F07167' }}
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
                      <Calendar className="h-4 w-4" style={{ color: '#8CA39C' }} />
                      <span style={{ color: '#B2BDB9' }}>
                        Horizonte: {cenario.horizonte_anos} {cenario.horizonte_anos === 1 ? 'ano' : 'anos'}
                      </span>
                    </div>

                    {/* Métricas */}
                    {resumo && (
                      <div className="space-y-3 pt-3" style={{ borderTop: '1px solid #213A34' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: '#B2BDB9' }}>Patrimônio Final</span>
                          <span className="text-sm font-semibold" style={{ color: '#D4AF37' }}>
                            {formatCurrency(resumo.patrimonio_final)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: '#B2BDB9' }}>Saving Acumulado</span>
                          <span className="text-sm font-semibold" style={{ color: '#6CCB8C' }}>
                            {formatCurrency(resumo.saving_acumulado)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: '#B2BDB9' }}>Taxa de Saving</span>
                          <span className="text-sm font-semibold" style={{ color: '#F2F7F5' }}>
                            {(resumo.taxa_saving_media * 100).toFixed(1)}%
                          </span>
                        </div>

                        {/* Objetivos */}
                        {projecao && projecao.objetivos_analise?.length > 0 && (
                          <div className="pt-2" style={{ borderTop: '1px solid #213A34' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="h-3.5 w-3.5" style={{ color: '#8CA39C' }} />
                              <span className="text-xs font-medium" style={{ color: '#B2BDB9' }}>
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
                                    <span className="truncate flex-1" style={{ color: '#F2F7F5' }}>{analise.objetivo.nome}</span>
                                    <Badge
                                      variant={
                                        analise.status === 'no_caminho'
                                          ? 'default'
                                          : analise.status === 'precisa_ajustes'
                                          ? 'secondary'
                                          : 'destructive'
                                      }
                                      className="ml-2 text-[10px] h-5 flex items-center gap-1"
                                      style={{
                                        backgroundColor: analise.status === 'no_caminho' ? '#213A34' : analise.status === 'precisa_ajustes' ? '#3D3516' : '#3D1F1E',
                                        color: analise.status === 'no_caminho' ? '#6CCB8C' : analise.status === 'precisa_ajustes' ? '#E0B257' : '#F07167'
                                      }}
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
            style={{
              backgroundColor: '#18322C',
              borderColor: '#2A4942',
              borderWidth: '1px',
              borderRadius: '14px',
              boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 10px 18px rgba(0,0,0,.28)',
            }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: '#F2F7F5' }}>Novo Cenário de Planejamento</DialogTitle>
              <DialogDescription style={{ color: '#B2BDB9' }}>
                Crie um cenário personalizado para simular seu futuro financeiro.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome" style={{ color: '#F2F7F5' }}>Nome do Cenário *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Aposentadoria 2035, Compra de Casa"
                  value={novoCenario.nome}
                  onChange={(e) => setNovoCenario({ ...novoCenario, nome: e.target.value })}
                  style={{
                    backgroundColor: '#142A25',
                    borderColor: '#2A4942',
                    color: '#F2F7F5',
                    borderRadius: '10px',
                  }}
                  className="placeholder:text-[#8CA39C]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" style={{ color: '#F2F7F5' }}>Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva o objetivo deste cenário..."
                  value={novoCenario.descricao}
                  onChange={(e) => setNovoCenario({ ...novoCenario, descricao: e.target.value })}
                  rows={3}
                  style={{
                    backgroundColor: '#142A25',
                    borderColor: '#2A4942',
                    color: '#F2F7F5',
                    borderRadius: '10px',
                  }}
                  className="placeholder:text-[#8CA39C]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horizonte" style={{ color: '#F2F7F5' }}>Horizonte de Tempo (anos) *</Label>
                <Input
                  id="horizonte"
                  type="number"
                  min="1"
                  max="10"
                  value={novoCenario.horizonte_anos}
                  onChange={(e) =>
                    setNovoCenario({ ...novoCenario, horizonte_anos: parseInt(e.target.value) || 5 })
                  }
                  style={{
                    backgroundColor: '#142A25',
                    borderColor: '#2A4942',
                    color: '#F2F7F5',
                    borderRadius: '10px',
                  }}
                />
                <p className="text-xs" style={{ color: '#8CA39C' }}>
                  Entre 1 e 10 anos. Quanto maior o horizonte, mais tempo para seus objetivos.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="hover:bg-[#1D3A34]"
                style={{
                  backgroundColor: '#142A25',
                  borderColor: '#2A4942',
                  color: '#F2F7F5',
                  borderRadius: '12px',
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCenario}
                disabled={!novoCenario.nome.trim()}
                className="hover:bg-[#2E7D6B]"
                style={{
                  backgroundColor: '#3A8F6E',
                  color: '#F2F7F5',
                  borderRadius: '12px',
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
            style={{
              backgroundColor: '#18322C',
              borderColor: '#2A4942',
              borderWidth: '1px',
              borderRadius: '14px',
              boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 10px 18px rgba(0,0,0,.28)',
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle style={{ color: '#F2F7F5' }}>Excluir Cenário</AlertDialogTitle>
              <AlertDialogDescription style={{ color: '#B2BDB9' }}>
                Tem certeza que deseja excluir este cenário? Esta ação não pode ser desfeita.
                Todos os dados de configurações e objetivos serão perdidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="hover:bg-[#1D3A34]"
                style={{
                  backgroundColor: '#142A25',
                  borderColor: '#2A4942',
                  color: '#F2F7F5',
                  borderRadius: '12px',
                }}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="hover:bg-[#D85F57]"
                style={{
                  backgroundColor: '#F07167',
                  color: '#0E0E0E',
                  borderRadius: '12px',
                }}
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
            style={{
              backgroundColor: '#18322C',
              borderColor: '#2A4942',
              borderWidth: '1px',
              borderRadius: '14px',
              boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 10px 18px rgba(0,0,0,.28)',
            }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: '#F2F7F5' }}>Evolução Mensal do Cenário</DialogTitle>
              <DialogDescription style={{ color: '#B2BDB9' }}>
                Projeção mês a mês de receitas, despesas e patrimônio acumulado
              </DialogDescription>
            </DialogHeader>

            {cenarioToView && projecoes.get(cenarioToView) && (
              <div className="py-4">
                <div 
                  className="rounded-lg overflow-hidden"
                  style={{
                    border: '1px solid #2A4942',
                  }}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr 
                          style={{
                            backgroundColor: '#162B26',
                            borderBottom: '1px solid #213A34',
                          }}
                        >
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#B2BDB9' }}>
                            Mês
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#B2BDB9' }}>
                            Receitas
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#B2BDB9' }}>
                            Despesas
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#B2BDB9' }}>
                            Saving
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#B2BDB9' }}>
                            Rendimentos
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#B2BDB9' }}>
                            Patrimônio
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {projecoes.get(cenarioToView)!.projecoes.map((projecao, idx) => {
                          const mes = new Date(projecao.mes)
                          const mesAno = mes.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })

                          return (
                            <tr 
                              key={idx} 
                              className="hover:bg-[#1D3A34] transition-colors"
                              style={{
                                backgroundColor: '#18322C',
                                borderBottom: '1px solid #213A34',
                              }}
                            >
                              <td className="px-4 py-3 font-medium" style={{ color: '#F2F7F5' }}>
                                {mesAno}
                              </td>
                              <td className="px-4 py-3 text-right font-medium" style={{ color: '#6CCB8C' }}>
                                {formatCurrency(projecao.receitas.total)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium" style={{ color: '#F07167' }}>
                                {formatCurrency(projecao.despesas.total)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                <span style={{ color: projecao.saving >= 0 ? '#6CCB8C' : '#F07167' }}>
                                  {formatCurrency(projecao.saving)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right" style={{ color: '#D4AF37' }}>
                                {formatCurrency(projecao.rendimento_investimentos)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold" style={{ color: '#D4AF37' }}>
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
                className="hover:bg-[#1D3A34]"
                style={{
                  backgroundColor: '#142A25',
                  borderColor: '#2A4942',
                  color: '#F2F7F5',
                  borderRadius: '12px',
                }}
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
