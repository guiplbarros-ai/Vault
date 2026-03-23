'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { FaturaCard } from '@/components/fatura-card'
import { CartaoForm } from '@/components/forms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BANDEIRAS } from '@/lib/constants'
import { cartaoService } from '@/lib/services/cartao.service'
import type { CartaoConfig, Fatura } from '@/lib/types'
import type { CartaoFormData } from '@/lib/validations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { contaService } from '@/lib/services/conta.service'
import type { Conta } from '@/lib/types'
import { CreditCard, DollarSign, Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function CreditCardsPage() {
  const router = useRouter()
  const [cartoes, setCartoes] = useState<CartaoConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cartaoToDelete, setCartaoToDelete] = useState<string | null>(null)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedCartao, setSelectedCartao] = useState<CartaoConfig | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [faturas, setFaturas] = useState<Record<string, Fatura[]>>({})
  const [limites, setLimites] = useState<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState('overview')
  // Payment dialog state
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payFaturaId, setPayFaturaId] = useState<string | null>(null)
  const [payFatura, setPayFatura] = useState<Fatura | null>(null)
  const [payCartaoNome, setPayCartaoNome] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [payContas, setPayContas] = useState<Conta[]>([])
  const [payContaId, setPayContaId] = useState('')
  const [payValor, setPayValor] = useState('')
  const [payData, setPayData] = useState(new Date().toISOString().split('T')[0])
  const [payObs, setPayObs] = useState('')

  // Carrega cartões do banco
  useEffect(() => {
    loadCartoes()
  }, [])

  // Carrega faturas e limites quando cartões mudam
  useEffect(() => {
    if (cartoes.length > 0) {
      loadFaturas().catch(console.error)
      loadLimites().catch(console.error)
    }
  }, [cartoes.length]) // Usar apenas length para evitar loop infinito

  const loadCartoes = async () => {
    try {
      setLoading(true)
      const data = await cartaoService.listCartoes()
      setCartoes(data)
    } catch (error) {
      console.error('Erro ao carregar cartões:', error)
      toast.error('Erro ao carregar cartões', {
        description: 'Não foi possível carregar os cartões. Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadFaturas = async () => {
    try {
      const faturasData: Record<string, Fatura[]> = {}
      for (const cartao of cartoes) {
        try {
          const cartaoFaturas = await cartaoService.listFaturas(cartao.id, {
            limit: 3,
            sortBy: 'mes_referencia',
            sortOrder: 'desc',
          })
          faturasData[cartao.id] = cartaoFaturas
        } catch (err) {
          console.error(`Erro ao carregar faturas do cartão ${cartao.id}:`, err)
          faturasData[cartao.id] = []
        }
      }
      setFaturas(faturasData)
    } catch (error) {
      console.error('Erro ao carregar faturas:', error)
    }
  }

  const loadLimites = async () => {
    try {
      const limitesData: Record<string, any> = {}
      for (const cartao of cartoes) {
        try {
          const limite = await cartaoService.getLimiteDisponivel(cartao.id)
          limitesData[cartao.id] = limite
        } catch (err) {
          console.error(`Erro ao carregar limite do cartão ${cartao.id}:`, err)
          // Define limite padrão se houver erro
          limitesData[cartao.id] = {
            limite_total: cartao.limite_total,
            limite_usado: 0,
            limite_disponivel: cartao.limite_total,
            percentual_usado: 0,
          }
        }
      }
      setLimites(limitesData)
    } catch (error) {
      console.error('Erro ao carregar limites:', error)
    }
  }

  const handleDelete = async () => {
    if (!cartaoToDelete) return

    try {
      await cartaoService.deleteCartao(cartaoToDelete)
      await loadCartoes()
      setDeleteDialogOpen(false)
      setCartaoToDelete(null)
      toast.success('Cartão excluído', {
        description: 'O cartão foi excluído com sucesso.',
      })
    } catch (error) {
      console.error('Erro ao excluir cartão:', error)
      toast.error('Erro ao excluir cartão', {
        description: 'Não foi possível excluir o cartão. Tente novamente.',
      })
    }
  }

  const handleSubmit = async (data: CartaoFormData) => {
    console.log('[DEBUG] Form data recebido:', data)
    setFormLoading(true)
    try {
      if (editMode && selectedCartao) {
        // Modo edição
        await cartaoService.updateCartao(selectedCartao.id, data)
        toast.success('Cartão atualizado', {
          description: 'O cartão foi atualizado com sucesso.',
        })
      } else {
        // Modo criação - buscar primeira instituição disponível
        const { instituicaoService } = await import('@/lib/services/instituicao.service')
        const instituicoes = await instituicaoService.listInstituicoes({ limit: 1 })

        if (instituicoes.length === 0) {
          toast.error('Nenhuma instituição encontrada', {
            description: 'Cadastre uma instituição antes de criar um cartão.',
          })
          return
        }

        const instituicaoId = instituicoes[0]!.id
        await cartaoService.createCartao({
          ...data,
          instituicao_id: instituicaoId,
        })
        toast.success('Cartão criado', {
          description: 'O cartão foi criado com sucesso.',
        })
      }
      await loadCartoes()
      setFormDialogOpen(false)
      setEditMode(false)
      setSelectedCartao(null)
    } catch (error) {
      console.error('Erro ao salvar cartão:', error)
      toast.error(editMode ? 'Erro ao atualizar cartão' : 'Erro ao criar cartão', {
        description: 'Não foi possível salvar o cartão. Verifique os dados e tente novamente.',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (cartao: CartaoConfig) => {
    setSelectedCartao(cartao)
    setEditMode(true)
    setFormDialogOpen(true)
  }

  const handleViewDetails = (cartao: CartaoConfig) => {
    setSelectedCartao(cartao)
    setDetailsDialogOpen(true)
  }

  const handleToggleActive = async (cartao: CartaoConfig) => {
    try {
      await cartaoService.toggleAtivo(cartao.id)
      await loadCartoes()
      toast.success(cartao.ativo ? 'Cartão desativado' : 'Cartão ativado', {
        description: `O cartão foi ${cartao.ativo ? 'desativado' : 'ativado'} com sucesso.`,
      })
    } catch (error) {
      console.error('Erro ao alterar status do cartão:', error)
      toast.error('Erro ao alterar status', {
        description: 'Não foi possível alterar o status do cartão.',
      })
    }
  }

  const handleNewCartao = () => {
    setEditMode(false)
    setSelectedCartao(null)
    setFormDialogOpen(true)
  }

  const handleOpenPayDialog = async (faturaId: string) => {
    // Find the fatura and its cartao
    let foundFatura: Fatura | null = null
    let cartaoNome = ''
    let cartaoContaPagamentoId: string | null = null

    for (const cartao of cartoes) {
      const cartaoFaturas = faturas[cartao.id] || []
      const f = cartaoFaturas.find((fat: Fatura) => fat.id === faturaId)
      if (f) {
        foundFatura = f
        cartaoNome = cartao.nome
        cartaoContaPagamentoId = cartao.conta_pagamento_id ?? null
        break
      }
    }

    if (!foundFatura) {
      toast.error('Fatura não encontrada')
      return
    }

    setPayFaturaId(faturaId)
    setPayFatura(foundFatura)
    setPayCartaoNome(cartaoNome)
    setPayValor((foundFatura.valor_total - (foundFatura.valor_pago || 0)).toFixed(2))
    setPayData(new Date().toISOString().split('T')[0])
    setPayObs('')

    // Load available accounts
    try {
      const contas = await contaService.listContas({ incluirInativas: false })
      setPayContas(contas)
      // Pre-select the card's linked payment account if available
      if (cartaoContaPagamentoId) {
        setPayContaId(cartaoContaPagamentoId)
      } else if (contas.length > 0) {
        setPayContaId(contas[0]!.id)
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error)
      setPayContas([])
    }

    setPayDialogOpen(true)
  }

  const handleConfirmPayment = async () => {
    if (!payFaturaId || !payContaId) {
      toast.error('Selecione uma conta para pagamento')
      return
    }

    const valorNum = Number.parseFloat(payValor.replace(',', '.'))
    if (Number.isNaN(valorNum) || valorNum <= 0) {
      toast.error('Informe um valor válido')
      return
    }

    setPayLoading(true)
    try {
      await cartaoService.pagarFatura({
        fatura_id: payFaturaId,
        conta_pagamento_id: payContaId,
        valor_pago: valorNum,
        data_pagamento: payData || new Date().toISOString().split('T')[0]!,
        observacoes: payObs || undefined,
      })

      toast.success('Pagamento registrado', {
        description: `Pagamento de ${formatCurrency(valorNum)} registrado com sucesso.`,
      })

      setPayDialogOpen(false)
      // Reload data
      await loadCartoes()
    } catch (error: any) {
      console.error('Erro ao pagar fatura:', error)
      toast.error('Erro ao registrar pagamento', {
        description: error?.message || 'Tente novamente.',
      })
    } finally {
      setPayLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Calcular totais
  const totalLimite = cartoes.reduce((sum, c) => sum + c.limite_total, 0)
  const totalUsado = Object.values(limites).reduce((sum, l) => sum + (l?.gastos_mes || l?.limite_usado || 0), 0)
  const totalDisponivel = totalLimite > 0 ? totalLimite - totalUsado : 0
  const percentualUsado = totalLimite > 0 ? (totalUsado / totalLimite) * 100 : 0

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando cartões...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Cartões de Crédito"
          description="Gerencie seus cartões e acompanhe suas faturas"
          actions={
            <Button onClick={handleNewCartao} className="bg-primary text-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cartão
            </Button>
          }
        />

        {cartoes.length === 0 ? (
          <Card className="border-2 border-dashed bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CreditCard className="h-16 w-16 mb-4 text-secondary" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                Nenhum cartão cadastrado
              </h3>
              <p className="text-center max-w-md mb-6 text-muted-foreground">
                Comece adicionando seu primeiro cartão de crédito para acompanhar gastos e faturas.
              </p>
              <Button onClick={handleNewCartao} className="bg-primary text-foreground">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Cartão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards - TEMA.md: KPI com shadow-2 e ícone em pill 36px */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card border-border shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)]">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <CardDescription className="text-muted-foreground text-sm">
                      Limite Total
                    </CardDescription>
                  </div>
                  <CardTitle className="text-3xl font-bold text-foreground">
                    {totalLimite > 0 ? formatCurrency(totalLimite) : 'Não informado'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {cartoes.filter((c) => c.ativo).length} cartões ativos
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)]">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-warning" />
                    </div>
                    <CardDescription className="text-muted-foreground text-sm">
                      Gastos no Mês
                    </CardDescription>
                  </div>
                  <CardTitle className="text-3xl font-bold text-warning">
                    {formatCurrency(totalUsado)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {totalLimite > 0 ? `${percentualUsado.toFixed(1)}% do limite total` : 'Baseado nas transações do mês'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)]">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-success" />
                    </div>
                    <CardDescription className="text-muted-foreground text-sm">
                      Limite Disponível
                    </CardDescription>
                  </div>
                  <CardTitle className="text-3xl font-bold text-success">
                    {totalLimite > 0 ? formatCurrency(totalDisponivel) : 'Não informado'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Disponível para uso</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="faturas">Faturas</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Cartões Ativos */}
                {cartoes.filter((c) => c.ativo).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Cartões Ativos</h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {cartoes
                        .filter((c) => c.ativo)
                        .map((cartao) => {
                          const limite = limites[cartao.id]

                          return (
                            <div
                              key={cartao.id}
                              className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-[0_1px_0_rgba(0,0,0,.35),0_12px_24px_rgba(0,0,0,.28)] border border-border"
                              style={{
                                background: `linear-gradient(135deg, ${cartao.cor || 'hsl(var(--primary))'} 0%, rgba(${Number.parseInt(cartao.cor?.slice(1, 3) || 'aa', 16)}, ${Number.parseInt(cartao.cor?.slice(3, 5) || 'aa', 16)}, ${Number.parseInt(cartao.cor?.slice(5, 7) || 'aa', 16)}, 0.8) 100%)`,
                              }}
                            >
                              <div className="relative p-6 h-64 flex flex-col justify-between text-white">
                                {/* Header do Cartão */}
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-xs opacity-75 uppercase tracking-wider">
                                      {cartao.bandeira && BANDEIRAS[cartao.bandeira]
                                        ? BANDEIRAS[cartao.bandeira]
                                        : 'Cartão'}
                                    </p>
                                    <h3 className="text-xl font-bold mt-1">{cartao.nome}</h3>
                                  </div>
                                  <Badge className="bg-white/20 text-white border-white/30 text-xs">
                                    Ativo
                                  </Badge>
                                </div>

                                {/* Números/Info do Cartão */}
                                <div>
                                  {cartao.ultimos_digitos && (
                                    <p className="text-lg font-mono tracking-widest opacity-90">
                                      •••• {cartao.ultimos_digitos}
                                    </p>
                                  )}
                                  <p className="text-xs opacity-75 mt-2">
                                    Vence dia {cartao.dia_vencimento}
                                  </p>
                                </div>

                                {/* Footer com limite */}
                                <div className="flex items-end justify-between">
                                  <div>
                                    <p className="text-xs opacity-75">Limite Total</p>
                                    <p className="text-xl font-bold">
                                      {cartao.limite_total > 0 ? formatCurrency(cartao.limite_total) : 'Não informado'}
                                    </p>
                                  </div>
                                </div>

                                {/* Gradient overlay invisível para hover */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                              </div>

                              {/* Ações em hover */}
                              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="bg-white/20 text-white hover:bg-white/30"
                                  onClick={() => handleViewDetails(cartao)}
                                  title="Ver Detalhes"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="bg-white/20 text-white hover:bg-white/30"
                                  onClick={() => handleEdit(cartao)}
                                  title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="bg-white/20 text-white hover:bg-white/30"
                                  onClick={() => handleToggleActive(cartao)}
                                  title="Desativar"
                                >
                                  <EyeOff className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="bg-destructive/80 text-white hover:bg-destructive"
                                  onClick={() => {
                                    setCartaoToDelete(cartao.id)
                                    setDeleteDialogOpen(true)
                                  }}
                                  title="Deletar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Info em Repouso */}
                              <div className="bg-card border-t border-border p-4 space-y-3">
                                {limite && (
                                  <>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-muted-foreground">Gastos este mês</span>
                                      <span className="font-semibold text-warning">
                                        {formatCurrency(limite.gastos_mes || limite.limite_usado)}
                                      </span>
                                    </div>
                                    {cartao.limite_total > 0 && (
                                      <>
                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                          <div
                                            className="h-full bg-gradient-to-r from-success to-warning transition-all duration-300"
                                            style={{
                                              width: `${Math.min(limite.percentual_usado, 100)}%`,
                                            }}
                                          />
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-muted-foreground">Disponível</span>
                                          <span className="font-semibold text-success">
                                            {formatCurrency(limite.limite_disponivel)}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* Cartões Inativos */}
                {cartoes.filter((c) => !c.ativo).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                      Cartões Inativos
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {cartoes
                        .filter((c) => !c.ativo)
                        .map((cartao) => {
                          const limite = limites[cartao.id]

                          return (
                            <Card
                              key={cartao.id}
                              className="opacity-60 border-dashed transition-all hover:opacity-100"
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                      <CardTitle className="text-base text-foreground">
                                        {cartao.nome}
                                      </CardTitle>
                                      <CardDescription className="text-xs">
                                        {cartao.bandeira && BANDEIRAS[cartao.bandeira] && (
                                          <span>{BANDEIRAS[cartao.bandeira]}</span>
                                        )}
                                        {cartao.bandeira && cartao.ultimos_digitos && ' • '}
                                        {cartao.ultimos_digitos && (
                                          <span>•••• {cartao.ultimos_digitos}</span>
                                        )}
                                      </CardDescription>
                                    </div>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    Inativo
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleToggleActive(cartao)}
                                  >
                                    <Eye className="mr-1 h-3 w-3" />
                                    Ativar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(cartao)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setCartaoToDelete(cartao.id)
                                      setDeleteDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="faturas" className="space-y-6">
                {cartoes.map((cartao) => {
                  const cartaoFaturas = faturas[cartao.id] || []
                  if (cartaoFaturas.length === 0) return null

                  return (
                    <div key={cartao.id}>
                      <h3 className="text-lg font-semibold mb-4 text-foreground">{cartao.nome}</h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {cartaoFaturas.map((fatura) => (
                          <FaturaCard
                            key={fatura.id}
                            id={fatura.id}
                            mes_referencia={fatura.mes_referencia}
                            data_vencimento={fatura.data_vencimento}
                            valor_total={fatura.valor_total}
                            valor_pago={fatura.valor_pago || 0}
                            status={fatura.status}
                            cartao_nome={cartao.nome}
                            onViewDetails={(faturaId) => {
                              router.push(`/credit-cards/${cartao.id}/faturas/${faturaId}`)
                            }}
                            onPay={(id) => {
                              handleOpenPayDialog(id)
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Form Dialog for Create/Edit */}
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editMode ? 'Editar Cartão' : 'Novo Cartão'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {editMode
                  ? 'Atualize as informações do seu cartão de crédito.'
                  : 'Adicione um novo cartão de crédito ao sistema.'}
              </DialogDescription>
            </DialogHeader>
            <CartaoForm
              defaultValues={
                selectedCartao
                  ? {
                      nome: selectedCartao.nome,
                      instituicao_id: selectedCartao.instituicao_id,
                      conta_pagamento_id: selectedCartao.conta_pagamento_id,
                      ultimos_digitos: selectedCartao.ultimos_digitos,
                      bandeira: selectedCartao.bandeira,
                      limite_total: selectedCartao.limite_total,
                      dia_fechamento: selectedCartao.dia_fechamento,
                      dia_vencimento: selectedCartao.dia_vencimento,
                      ativo: selectedCartao.ativo,
                      cor: selectedCartao.cor,
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
              onCancel={() => {
                setFormDialogOpen(false)
                setEditMode(false)
                setSelectedCartao(null)
              }}
              isLoading={formLoading}
              submitLabel={editMode ? 'Atualizar Cartão' : 'Criar Cartão'}
            />
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Cartão"
          description="Tem certeza que deseja excluir este cartão? Todas as faturas e lançamentos associados também serão removidos. Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          variant="destructive"
          onConfirm={handleDelete}
          isDark={true}
        />

        {/* Payment Dialog */}
        <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Pagar Fatura</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {payCartaoNome}
                {payFatura && ` - ${new Date(Number.parseInt(payFatura.mes_referencia.split('-')[0]!), Number.parseInt(payFatura.mes_referencia.split('-')[1]!) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Resumo da fatura */}
              {payFatura && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor total</span>
                    <span className="font-semibold text-foreground">{formatCurrency(payFatura.valor_total)}</span>
                  </div>
                  {(payFatura.valor_pago || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Já pago</span>
                      <span className="text-success">{formatCurrency(payFatura.valor_pago || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-1">
                    <span className="text-muted-foreground">Restante</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(payFatura.valor_total - (payFatura.valor_pago || 0))}
                    </span>
                  </div>
                </div>
              )}

              {/* Conta de pagamento */}
              <div className="space-y-2">
                <Label className="text-foreground">Conta de Pagamento</Label>
                <Select value={payContaId} onValueChange={setPayContaId}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {payContas.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <Label className="text-foreground">Valor do Pagamento (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={payValor}
                  onChange={(e) => setPayValor(e.target.value)}
                  placeholder="0,00"
                  className="bg-background border-border"
                />
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label className="text-foreground">Data do Pagamento</Label>
                <Input
                  type="date"
                  value={payData}
                  onChange={(e) => setPayData(e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label className="text-foreground">Observações (opcional)</Label>
                <Input
                  value={payObs}
                  onChange={(e) => setPayObs(e.target.value)}
                  placeholder="Ex: Pagamento parcial..."
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPayDialogOpen(false)}
                disabled={payLoading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-primary text-foreground"
                onClick={handleConfirmPayment}
                disabled={payLoading || !payContaId}
              >
                {payLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Confirmar Pagamento
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
