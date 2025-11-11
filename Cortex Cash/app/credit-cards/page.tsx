'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, CreditCard, MoreHorizontal, Pencil, Trash2, Eye, EyeOff, DollarSign } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { CartaoForm } from "@/components/forms"
import { CreditCardLimit } from "@/components/credit-card-limit"
import { FaturaCard } from "@/components/fatura-card"
import type { CartaoFormData } from "@/lib/validations"
import { cartaoService } from "@/lib/services/cartao.service"
import type { CartaoConfig, Fatura } from "@/lib/types"
import { toast } from "sonner"
import { BANDEIRAS, BANDEIRA_COLORS } from "@/lib/constants"

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
        const db = (await import('@/lib/db/client')).getDB()
        const instituicoes = await db.instituicoes.toArray()
        
        if (instituicoes.length === 0) {
          toast.error('Nenhuma instituição encontrada', {
            description: 'Cadastre uma instituição antes de criar um cartão.',
          })
          return
        }
        
        const instituicaoId = instituicoes[0].id
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Calcular totais
  const totalLimite = cartoes.reduce((sum, c) => sum + c.limite_total, 0)
  const totalUsado = Object.values(limites).reduce((sum, l) => sum + (l?.limite_usado || 0), 0)
  const totalDisponivel = totalLimite - totalUsado
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
            <Button
              onClick={handleNewCartao}
              className="bg-primary text-foreground"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Cartão
            </Button>
          }
        />

        {cartoes.length === 0 ? (
          <Card className="border-2 border-dashed bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CreditCard className="h-16 w-16 mb-4 text-secondary" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">Nenhum cartão cadastrado</h3>
              <p className="text-center max-w-md mb-6 text-muted-foreground">
                Comece adicionando seu primeiro cartão de crédito para acompanhar gastos e faturas.
              </p>
              <Button
                onClick={handleNewCartao}
                className="bg-primary text-foreground"
              >
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
                    <CardDescription className="text-muted-foreground text-sm">Limite Total</CardDescription>
                  </div>
                  <CardTitle className="text-3xl font-bold text-foreground">{formatCurrency(totalLimite)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {cartoes.filter(c => c.ativo).length} cartões ativos
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)]">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-warning" />
                    </div>
                    <CardDescription className="text-muted-foreground text-sm">Limite Usado</CardDescription>
                  </div>
                  <CardTitle className="text-3xl font-bold text-warning">{formatCurrency(totalUsado)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {percentualUsado.toFixed(1)}% do limite total
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)]">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-success" />
                    </div>
                    <CardDescription className="text-muted-foreground text-sm">Limite Disponível</CardDescription>
                  </div>
                  <CardTitle className="text-3xl font-bold text-success">{formatCurrency(totalDisponivel)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Disponível para uso
                  </p>
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
                {/* Credit Cards Grid */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-foreground">Meus Cartões</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cartoes.map((cartao) => {
                      const limite = limites[cartao.id]
                      const Icon = CreditCard

                      return (
                        <Card
                          key={cartao.id}
                          className="relative overflow-hidden border-l-4 transition-all hover:shadow-[0_1px_0_rgba(0,0,0,.4),0_10px_18px_rgba(0,0,0,.28)] bg-card border-border"
                          style={{
                            borderLeftColor: cartao.cor || 'hsl(var(--primary))'
                          }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                  <Icon className="h-5 w-5 text-foreground" />
                                </div>
                                <div>
                                  <CardTitle className="text-base text-foreground">{cartao.nome}</CardTitle>
                                  <CardDescription className="text-xs text-muted-foreground">
                                    {cartao.bandeira && BANDEIRAS[cartao.bandeira] && (
                                      <span className="capitalize">{BANDEIRAS[cartao.bandeira]}</span>
                                    )}
                                    {cartao.bandeira && cartao.ultimos_digitos && ' • '}
                                    {cartao.ultimos_digitos && <span>•••• {cartao.ultimos_digitos}</span>}
                                  </CardDescription>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-card border-border">
                                  <DropdownMenuItem
                                    onClick={() => handleViewDetails(cartao)}
                                    className="cursor-pointer text-foreground"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver Detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(cartao)}
                                    className="cursor-pointer text-foreground"
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleToggleActive(cartao)}
                                    className="cursor-pointer text-foreground"
                                  >
                                    <EyeOff className="mr-2 h-4 w-4" />
                                    {cartao.ativo ? 'Desativar' : 'Ativar'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-border" />
                                  <DropdownMenuItem
                                    className="cursor-pointer text-destructive"
                                    onClick={() => {
                                      setCartaoToDelete(cartao.id)
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
                              <span className="text-xs text-muted-foreground">Limite Total</span>
                              <span className="text-lg font-bold text-gold">{formatCurrency(cartao.limite_total)}</span>
                            </div>
                            {limite && (
                              <>
                                <div className="flex items-baseline justify-between text-sm">
                                  <span className="text-muted-foreground">Usado</span>
                                  <span className="font-semibold text-warning">
                                    {formatCurrency(limite.limite_usado)}
                                  </span>
                                </div>
                                <div className="flex items-baseline justify-between text-sm">
                                  <span className="text-muted-foreground">Disponível</span>
                                  <span className="font-semibold text-success">
                                    {formatCurrency(limite.limite_disponivel)}
                                  </span>
                                </div>
                              </>
                            )}
                            <div className="pt-2 flex items-center justify-between text-xs border-t border-border">
                              <span className="text-muted-foreground">Vence dia {cartao.dia_vencimento}</span>
                              <Badge
                                variant={cartao.ativo ? 'default' : 'secondary'}
                                className="text-xs"
                                style={{
                                  backgroundColor: cartao.ativo ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                                  color: 'hsl(var(--foreground))'
                                }}
                              >
                                {cartao.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>

                {/* Credit Card Limits */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-foreground">Uso de Limite</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cartoes.filter(c => c.ativo).map((cartao) => {
                      const limite = limites[cartao.id]
                      if (!limite) return null

                      return (
                        <CreditCardLimit
                          key={cartao.id}
                          nome={cartao.nome}
                          limite_total={limite.limite_total}
                          limite_usado={limite.limite_usado}
                          limite_disponivel={limite.limite_disponivel}
                          percentual_usado={limite.percentual_usado}
                          cor={cartao.cor}
                          bandeira={cartao.bandeira && BANDEIRAS[cartao.bandeira] ? BANDEIRAS[cartao.bandeira] : undefined}
                          ultimos_digitos={cartao.ultimos_digitos}
                        />
                      )
                    })}
                  </div>
                </div>
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
                              // TODO: Implementar pagamento de fatura
                              console.log('Pagar fatura:', id)
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
              <DialogTitle className="text-foreground">{editMode ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {editMode
                  ? 'Atualize as informações do seu cartão de crédito.'
                  : 'Adicione um novo cartão de crédito ao sistema.'}
              </DialogDescription>
            </DialogHeader>
            <CartaoForm
              defaultValues={selectedCartao ? {
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
              } : undefined}
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
      </div>
    </DashboardLayout>
  )
}
