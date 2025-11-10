'use client'

/**
 * Página de Edição de Cenário
 * Agent PLANEJAMENTO: Owner
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getPlanejamentoService } from '@/lib/services/planejamento.service'
import { getProjecaoService } from '@/lib/services/projecao.service'
import { categoriaService } from '@/lib/services/categoria.service'
import { useLocalizationSettings } from '@/app/providers/settings-provider'
import type {
  Cenario,
  ConfiguracaoComportamento,
  ObjetivoFinanceiro,
  Categoria,
  TipoConfiguracao,
  ModoBehavior,
  CategoriaObjetivo,
  PrioridadeObjetivo,
  ProjecaoMensal,
} from '@/lib/types'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Zap,
  Save,
  Settings,
  Loader2,
} from 'lucide-react'

export default function EditCenarioPage() {
  const params = useParams()
  const router = useRouter()
  const cenarioId = params.id as string
  const { formatCurrency } = useLocalizationSettings()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cenario, setCenario] = useState<Cenario | null>(null)
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoComportamento[]>([])
  const [objetivos, setObjetivos] = useState<ObjetivoFinanceiro[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [projecaoMensal, setProjecaoMensal] = useState<ProjecaoMensal[]>([])
  const [loadingProjecao, setLoadingProjecao] = useState(false)

  // Formulários
  const [novaConfig, setNovaConfig] = useState<Partial<ConfiguracaoComportamento>>({
    tipo: 'receita',
    modo: 'percentual',
  })
  const [novoObjetivo, setNovoObjetivo] = useState<Partial<ObjetivoFinanceiro>>({
    categoria: 'casa',
    prioridade: 'media',
  })

  useEffect(() => {
    loadData()
  }, [cenarioId])

  useEffect(() => {
    if (cenario) {
      loadProjecao()
    }
  }, [configuracoes, cenario])

  const loadData = async () => {
    try {
      setLoading(true)
      const planejamentoService = getPlanejamentoService()

      const [cenarioData, configsData, objetivosData, categoriasData] = await Promise.all([
        planejamentoService.getCenario(cenarioId),
        planejamentoService.listConfiguracoes(cenarioId),
        planejamentoService.listObjetivos(cenarioId),
        categoriaService.listCategorias(),
      ])

      setCenario(cenarioData)
      setConfiguracoes(configsData)
      setObjetivos(objetivosData)
      setCategorias(categoriasData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar cenário')
    } finally {
      setLoading(false)
    }
  }

  const loadProjecao = async () => {
    try {
      setLoadingProjecao(true)
      const projecaoService = getProjecaoService()
      const projecao = await projecaoService.calcularProjecao(cenarioId)

      // Pegar os próximos 12 meses de projeção
      const projecaoRecente = projecao.projecoes.slice(0, 12)
      setProjecaoMensal(projecaoRecente)
    } catch (error) {
      console.error('Erro ao carregar projeção:', error)
    } finally {
      setLoadingProjecao(false)
    }
  }

  const handleAddConfiguracao = async () => {
    try {
      setSaving(true)
      const planejamentoService = getPlanejamentoService()

      await planejamentoService.addConfiguracao(cenarioId, {
        cenario_id: cenarioId,
        tipo: novaConfig.tipo as TipoConfiguracao,
        modo: novaConfig.modo as ModoBehavior,
        categoria_id: novaConfig.categoria_id,
        percentual_mudanca: novaConfig.percentual_mudanca,
        valor_fixo: novaConfig.valor_fixo,
        percentual_saving: novaConfig.percentual_saving,
        taxa_retorno_mensal: novaConfig.taxa_retorno_mensal,
        evento_descricao: novaConfig.evento_descricao,
        evento_valor: novaConfig.evento_valor,
        evento_data: novaConfig.evento_data,
        evento_tipo: novaConfig.evento_tipo,
      })

      toast.success('Configuração adicionada!')
      setNovaConfig({ tipo: 'receita', modo: 'percentual' })
      await loadData()
    } catch (error) {
      console.error('Erro ao adicionar configuração:', error)
      toast.error('Erro ao adicionar configuração')
    } finally {
      setSaving(false)
    }
  }

  const handleAddObjetivo = async () => {
    try {
      setSaving(true)
      const planejamentoService = getPlanejamentoService()

      await planejamentoService.addObjetivo(cenarioId, {
        cenario_id: cenarioId,
        nome: novoObjetivo.nome!,
        valor_alvo: novoObjetivo.valor_alvo!,
        data_alvo: novoObjetivo.data_alvo!,
        categoria: novoObjetivo.categoria as CategoriaObjetivo,
        prioridade: novoObjetivo.prioridade as PrioridadeObjetivo,
      })

      toast.success('Objetivo adicionado!')
      setNovoObjetivo({ categoria: 'casa', prioridade: 'media' })
      await loadData()
    } catch (error) {
      console.error('Erro ao adicionar objetivo:', error)
      toast.error('Erro ao adicionar objetivo')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfig = async (configId: string) => {
    try {
      const planejamentoService = getPlanejamentoService()
      await planejamentoService.removeConfiguracao(configId)
      toast.success('Configuração removida!')
      await loadData()
    } catch (error) {
      console.error('Erro ao deletar configuração:', error)
      toast.error('Erro ao deletar configuração')
    }
  }

  const handleDeleteObjetivo = async (objetivoId: string) => {
    try {
      const planejamentoService = getPlanejamentoService()
      await planejamentoService.removeObjetivo(objetivoId)
      toast.success('Objetivo removido!')
      await loadData()
    } catch (error) {
      console.error('Erro ao deletar objetivo:', error)
      toast.error('Erro ao deletar objetivo')
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (!cenario) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cenário não encontrado</p>
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
            size="icon"
            onClick={() => router.push('/planejamento')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <PageHeader
              title={cenario.nome}
              description={cenario.descricao || 'Configure intervenções e objetivos para este cenário'}
            />
          </div>
          {cenario.tipo === 'base' && (
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Cenário Base
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="comportamento" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            <TabsTrigger value="comportamento" className="data-[state=active]:bg-[#18B0A4] data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" />
              Comportamento
            </TabsTrigger>
            <TabsTrigger value="objetivos" className="data-[state=active]:bg-[#18B0A4] data-[state=active]:text-white">
              <Target className="h-4 w-4 mr-2" />
              Objetivos
            </TabsTrigger>
            <TabsTrigger value="eventos" className="data-[state=active]:bg-[#18B0A4] data-[state=active]:text-white">
              <Zap className="h-4 w-4 mr-2" />
              Eventos
            </TabsTrigger>
          </TabsList>

          {/* Tab: Comportamento */}
          <TabsContent value="comportamento" className="mt-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Coluna Esquerda: Formulário */}
              <div className="space-y-6">
                <Card
                  className="border-white/20"
                  style={{
                    background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                    backgroundColor: '#3B5563',
                  }}
                >
                  <CardHeader>
                    <CardTitle className="text-white">Nova Configuração</CardTitle>
                    <CardDescription className="text-white/70">
                      Configure mudanças no comportamento financeiro
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Tipo</Label>
                        <Select
                          value={novaConfig.tipo}
                          onValueChange={(value) => setNovaConfig({ ...novaConfig, tipo: value as TipoConfiguracao })}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#2C3E50] border-white/20">
                            <SelectItem value="receita" className="text-white">Receita</SelectItem>
                            <SelectItem value="despesa" className="text-white">Despesa</SelectItem>
                            <SelectItem value="investimento" className="text-white">Investimento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(novaConfig.tipo === 'receita' || novaConfig.tipo === 'despesa') && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-white">Categoria</Label>
                            <Select
                              value={novaConfig.categoria_id}
                              onValueChange={(value) => setNovaConfig({ ...novaConfig, categoria_id: value })}
                            >
                              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#2C3E50] border-white/20">
                                {categorias
                                  .filter((c) => c.tipo === novaConfig.tipo)
                                  .map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id} className="text-white">
                                      {cat.icone} {cat.nome}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-white">Modo de Alteração</Label>
                            <Select
                              value={novaConfig.modo}
                              onValueChange={(value) => setNovaConfig({ ...novaConfig, modo: value as ModoBehavior })}
                            >
                              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#2C3E50] border-white/20">
                                <SelectItem value="percentual" className="text-white">Percentual (%)</SelectItem>
                                <SelectItem value="valor_fixo" className="text-white">Valor Fixo</SelectItem>
                                <SelectItem value="zerar" className="text-white">Zerar</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {novaConfig.modo === 'percentual' && (
                            <div className="space-y-2">
                              <Label className="text-white">Percentual de Mudança (%)</Label>
                              <Input
                                type="number"
                                placeholder="Ex: -20 (reduz 20%) ou +30 (aumenta 30%)"
                                value={novaConfig.percentual_mudanca || ''}
                                onChange={(e) =>
                                  setNovaConfig({ ...novaConfig, percentual_mudanca: parseFloat(e.target.value) || 0 })
                                }
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                              />
                            </div>
                          )}

                          {novaConfig.modo === 'valor_fixo' && (
                            <div className="space-y-2">
                              <Label className="text-white">Novo Valor Fixo</Label>
                              <Input
                                type="number"
                                placeholder="Ex: 5000"
                                value={novaConfig.valor_fixo || ''}
                                onChange={(e) =>
                                  setNovaConfig({ ...novaConfig, valor_fixo: parseFloat(e.target.value) || 0 })
                                }
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {novaConfig.tipo === 'investimento' && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-white">% do Saving para Investir</Label>
                            <Input
                              type="number"
                              placeholder="Ex: 30"
                              value={novaConfig.percentual_saving || ''}
                              onChange={(e) =>
                                setNovaConfig({ ...novaConfig, percentual_saving: parseFloat(e.target.value) || 0 })
                              }
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white">Taxa de Retorno Mensal (%)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 0.8"
                              value={novaConfig.taxa_retorno_mensal ? (novaConfig.taxa_retorno_mensal * 100).toFixed(2) : ''}
                              onChange={(e) =>
                                setNovaConfig({
                                  ...novaConfig,
                                  taxa_retorno_mensal: (parseFloat(e.target.value) || 0) / 100,
                                })
                              }
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <Button
                      onClick={handleAddConfiguracao}
                      disabled={saving || !novaConfig.tipo}
                      className="w-full bg-[#18B0A4] text-white hover:bg-[#159890]"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Adicionar Configuração
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Coluna Direita: Preview */}
              <div className="space-y-6">
                {/* Configurações Ativas */}
                {configuracoes.length > 0 && (
                  <Card
                    className="border-white/20"
                    style={{
                      background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                      backgroundColor: '#3B5563',
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Configurações Ativas ({configuracoes.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                        {configuracoes.map((config) => (
                          <div
                            key={config.id}
                            className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {config.tipo === 'receita' && <TrendingUp className="h-3 w-3 text-green-400" />}
                              {config.tipo === 'despesa' && <TrendingDown className="h-3 w-3 text-red-400" />}
                              {config.tipo === 'investimento' && <TrendingUp className="h-3 w-3 text-blue-400" />}
                              <span className="text-white/80">
                                {config.categoria_id
                                  ? categorias.find((c) => c.id === config.categoria_id)?.nome
                                  : config.tipo}
                              </span>
                              <span className="text-white/60">
                                {config.modo === 'percentual' && `${config.percentual_mudanca! > 0 ? '+' : ''}${config.percentual_mudanca}%`}
                                {config.modo === 'valor_fixo' && formatCurrency(config.valor_fixo || 0)}
                                {config.modo === 'zerar' && 'Zerar'}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteConfig(config.id)}
                              className="text-red-400 hover:bg-red-500/10 h-6 w-6"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Projeção Mensal */}
                <Card
                  className="border-white/20"
                  style={{
                    background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                    backgroundColor: '#3B5563',
                  }}
                >
                  <CardHeader>
                    <CardTitle className="text-white">Projeção Mensal</CardTitle>
                    <CardDescription className="text-white/70">
                      Próximos 12 meses com as configurações aplicadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingProjecao ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-white/50" />
                      </div>
                    ) : projecaoMensal.length === 0 ? (
                      <div className="text-center py-8 text-white/50">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Nenhuma projeção disponível</p>
                        <p className="text-xs mt-1">Aguardando dados históricos</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="text-left py-2 px-2 text-white/80 font-medium">Mês</th>
                              <th className="text-right py-2 px-2 text-white/80 font-medium">Receitas</th>
                              <th className="text-right py-2 px-2 text-white/80 font-medium">Despesas</th>
                              <th className="text-right py-2 px-2 text-white/80 font-medium">Saving</th>
                              <th className="text-right py-2 px-2 text-white/80 font-medium">Patrimônio</th>
                            </tr>
                          </thead>
                          <tbody className="max-h-[400px] overflow-y-auto">
                            {projecaoMensal.map((mes, index) => (
                              <tr
                                key={index}
                                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                              >
                                <td className="py-2 px-2 text-white/90">
                                  {new Date(mes.mes).toLocaleDateString('pt-BR', {
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="text-right py-2 px-2 text-green-400">
                                  {formatCurrency(mes.receitas.total)}
                                </td>
                                <td className="text-right py-2 px-2 text-red-400">
                                  {formatCurrency(mes.despesas.total)}
                                </td>
                                <td className="text-right py-2 px-2 text-white/90">
                                  {formatCurrency(mes.saving)}
                                </td>
                                <td className="text-right py-2 px-2 text-[#18B0A4] font-medium">
                                  {formatCurrency(mes.patrimonio_acumulado)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Objetivos */}
          <TabsContent value="objetivos" className="mt-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Coluna Esquerda: Formulário */}
              <div className="space-y-6">
                <Card
                  className="border-white/20"
                  style={{
                    background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                    backgroundColor: '#3B5563',
                  }}
                >
                  <CardHeader>
                    <CardTitle className="text-white">Novo Objetivo</CardTitle>
                    <CardDescription className="text-white/70">
                      Defina uma meta financeira para este cenário
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Nome do Objetivo</Label>
                        <Input
                          placeholder="Ex: Comprar casa, Aposentadoria, Viagem"
                          value={novoObjetivo.nome || ''}
                          onChange={(e) => setNovoObjetivo({ ...novoObjetivo, nome: e.target.value })}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Valor Alvo</Label>
                        <Input
                          type="number"
                          placeholder="Ex: 500000"
                          value={novoObjetivo.valor_alvo || ''}
                          onChange={(e) =>
                            setNovoObjetivo({ ...novoObjetivo, valor_alvo: parseFloat(e.target.value) || 0 })
                          }
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Data Alvo</Label>
                        <Input
                          type="date"
                          value={
                            novoObjetivo.data_alvo
                              ? new Date(novoObjetivo.data_alvo).toISOString().split('T')[0]
                              : ''
                          }
                          onChange={(e) => setNovoObjetivo({ ...novoObjetivo, data_alvo: new Date(e.target.value) })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Categoria</Label>
                        <Select
                          value={novoObjetivo.categoria}
                          onValueChange={(value) =>
                            setNovoObjetivo({ ...novoObjetivo, categoria: value as CategoriaObjetivo })
                          }
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#2C3E50] border-white/20">
                            <SelectItem value="casa" className="text-white">Casa</SelectItem>
                            <SelectItem value="carro" className="text-white">Carro</SelectItem>
                            <SelectItem value="viagem" className="text-white">Viagem</SelectItem>
                            <SelectItem value="educacao" className="text-white">Educação</SelectItem>
                            <SelectItem value="aposentadoria" className="text-white">Aposentadoria</SelectItem>
                            <SelectItem value="outro" className="text-white">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-white">Prioridade</Label>
                        <Select
                          value={novoObjetivo.prioridade}
                          onValueChange={(value) =>
                            setNovoObjetivo({ ...novoObjetivo, prioridade: value as PrioridadeObjetivo })
                          }
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#2C3E50] border-white/20">
                            <SelectItem value="alta" className="text-white">Alta</SelectItem>
                            <SelectItem value="media" className="text-white">Média</SelectItem>
                            <SelectItem value="baixa" className="text-white">Baixa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={handleAddObjetivo}
                      disabled={saving || !novoObjetivo.nome || !novoObjetivo.valor_alvo}
                      className="w-full bg-[#18B0A4] text-white hover:bg-[#159890]"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Adicionar Objetivo
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Coluna Direita: Preview */}
              <div className="space-y-6">
                <Card
                  className="border-white/20"
                  style={{
                    background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                    backgroundColor: '#3B5563',
                  }}
                >
                  <CardHeader>
                    <CardTitle className="text-white">Preview - Objetivos Definidos</CardTitle>
                    <CardDescription className="text-white/70">
                      {objetivos.length === 0
                        ? 'Nenhum objetivo definido'
                        : `${objetivos.length} objetivo(s) cadastrado(s)`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {objetivos.length === 0 ? (
                      <div className="text-center py-8 text-white/50">
                        <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Adicione objetivos à esquerda</p>
                        <p className="text-xs mt-1">Eles aparecerão aqui como preview</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                        {objetivos.map((objetivo) => (
                          <div
                            key={objetivo.id}
                            className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-[#18B0A4]" />
                                <h4 className="text-white font-medium">{objetivo.nome}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    objetivo.prioridade === 'alta'
                                      ? 'destructive'
                                      : objetivo.prioridade === 'media'
                                      ? 'secondary'
                                      : 'default'
                                  }
                                  className="text-xs"
                                >
                                  {objetivo.prioridade}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteObjetivo(objetivo.id)}
                                  className="text-red-400 hover:bg-red-500/10 h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-white/90">
                                <span className="text-white/60">Valor:</span>
                                <span className="font-semibold text-[#18B0A4]">
                                  {formatCurrency(objetivo.valor_alvo)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-white/90">
                                <Calendar className="h-3 w-3 text-white/60" />
                                <span className="text-white/60">Data:</span>
                                <span>{new Date(objetivo.data_alvo).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <div className="flex items-center gap-2 text-white/90">
                                <span className="text-white/60">Categoria:</span>
                                <span className="capitalize">{objetivo.categoria}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Eventos (TODO: implementar) */}
          <TabsContent value="eventos" className="space-y-6 mt-6">
            <Card
              className="border-white/20"
              style={{
                background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                backgroundColor: '#3B5563',
              }}
            >
              <CardHeader>
                <CardTitle className="text-white">Eventos Únicos</CardTitle>
                <CardDescription className="text-white/70">
                  Em breve: adicione eventos pontuais como bônus, 13º, compras grandes, etc.
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botão de Voltar */}
        <div className="flex justify-center pt-6">
          <Button
            onClick={() => router.push('/planejamento')}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Cenários
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
