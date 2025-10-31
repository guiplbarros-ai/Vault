'use client'

import { useState, useEffect } from 'react'
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
              className="text-white"
              style={{
                backgroundColor: '#18B0A4',
                color: '#ffffff'
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Cartão
            </Button>
          }
        />

        {cartoes.length === 0 ? (
          <Card
            className="border-2 border-dashed border-white/20"
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563'
            }}
          >
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CreditCard className="h-16 w-16 text-white/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Nenhum cartão cadastrado</h3>
              <p className="text-white/70 text-center max-w-md mb-6">
                Comece adicionando seu primeiro cartão de crédito para acompanhar gastos e faturas.
              </p>
              <Button
                onClick={handleNewCartao}
                className="text-white"
                style={{
                  backgroundColor: '#18B0A4',
                  color: '#ffffff'
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Cartão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card style={{
                background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                backgroundColor: '#3B5563'
              }}>
                <CardHeader className="pb-3">
                  <CardDescription className="text-white/70">Limite Total</CardDescription>
                  <CardTitle className="text-3xl text-white">{formatCurrency(totalLimite)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-white/70">
                    {cartoes.filter(c => c.ativo).length} cartões ativos
                  </p>
                </CardContent>
              </Card>

              <Card style={{
                background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                backgroundColor: '#3B5563'
              }}>
                <CardHeader className="pb-3">
                  <CardDescription className="text-white/70">Limite Usado</CardDescription>
                  <CardTitle className="text-3xl text-amber-400">{formatCurrency(totalUsado)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-white/70">
                    {percentualUsado.toFixed(1)}% do limite total
                  </p>
                </CardContent>
              </Card>

              <Card style={{
                background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                backgroundColor: '#3B5563'
              }}>
                <CardHeader className="pb-3">
                  <CardDescription className="text-white/70">Limite Disponível</CardDescription>
                  <CardTitle className="text-3xl text-green-400">{formatCurrency(totalDisponivel)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-white/70">
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
                  <h3 className="text-lg font-semibold mb-4 text-white">Meus Cartões</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cartoes.map((cartao) => {
                      const limite = limites[cartao.id]
                      const Icon = CreditCard

                      return (
                        <Card
                          key={cartao.id}
                          className="relative overflow-hidden border-l-4 transition-all hover:shadow-lg"
                          style={{
                            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                            backgroundColor: '#3B5563',
                            borderLeftColor: cartao.cor || '#18B0A4'
                          }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                >
                                  <Icon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <CardTitle className="text-base text-white">{cartao.nome}</CardTitle>
                                  <CardDescription className="text-xs text-white/70">
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
                                    onClick={() => handleViewDetails(cartao)}
                                    className="!text-white hover:!bg-gray-700 cursor-pointer"
                                    style={{ color: '#ffffff' }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver Detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(cartao)}
                                    className="!text-white hover:!bg-gray-700 cursor-pointer"
                                    style={{ color: '#ffffff' }}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleToggleActive(cartao)}
                                    className="!text-white hover:!bg-gray-700 cursor-pointer"
                                    style={{ color: '#ffffff' }}
                                  >
                                    <EyeOff className="mr-2 h-4 w-4" />
                                    {cartao.ativo ? 'Desativar' : 'Ativar'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="!bg-gray-600" />
                                  <DropdownMenuItem
                                    className="!text-red-400 hover:!bg-gray-700 cursor-pointer"
                                    style={{ color: '#f87171' }}
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
                              <span className="text-xs text-white/70">Limite Total</span>
                              <span className="text-lg font-bold text-white">{formatCurrency(cartao.limite_total)}</span>
                            </div>
                            {limite && (
                              <>
                                <div className="flex items-baseline justify-between text-sm">
                                  <span className="text-white/70">Usado</span>
                                  <span className="font-semibold text-amber-400">
                                    {formatCurrency(limite.limite_usado)}
                                  </span>
                                </div>
                                <div className="flex items-baseline justify-between text-sm">
                                  <span className="text-white/70">Disponível</span>
                                  <span className="font-semibold text-green-400">
                                    {formatCurrency(limite.limite_disponivel)}
                                  </span>
                                </div>
                              </>
                            )}
                            <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs">
                              <span className="text-white/70">Vence dia {cartao.dia_vencimento}</span>
                              <Badge
                                variant={cartao.ativo ? 'default' : 'secondary'}
                                className="text-xs"
                                style={{
                                  backgroundColor: cartao.ativo ? '#18B0A4' : 'rgba(255, 255, 255, 0.2)',
                                  color: '#ffffff'
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
                  <h3 className="text-lg font-semibold mb-4 text-white">Uso de Limite</h3>
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
                      <h3 className="text-lg font-semibold mb-4 text-white">{cartao.nome}</h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {cartaoFaturas.map((fatura) => (
                          <FaturaCard
                            key={fatura.id}
                            id={fatura.id}
                            mes_referencia={fatura.mes_referencia}
                            data_vencimento={fatura.data_vencimento}
                            valor_total={fatura.valor_total}
                            valor_pago={fatura.valor_pago}
                            status={fatura.status}
                            cartao_nome={cartao.nome}
                            onViewDetails={(id) => {
                              // TODO: Implementar visualização de detalhes da fatura
                              console.log('Ver detalhes da fatura:', id)
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
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
              backgroundColor: '#3B5563',
              borderColor: '#374151'
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-white">{editMode ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
              <DialogDescription className="text-white/70">
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
