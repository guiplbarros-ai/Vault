'use client'

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, FileText, TrendingUp, AlertCircle } from "lucide-react"

export default function TaxPage() {
  const [declaracoes] = useState<any[]>([])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Imposto de Renda"
          description="Gerencie suas declarações e otimize sua tributação"
          actions={
            <Button
              className="rounded-xl px-6 py-3 text-base font-semibold text-white hover:opacity-90"
              style={{
                backgroundColor: '#18B0A4',
                color: '#ffffff'
              }}
            >
              <Plus className="mr-2 h-5 w-5" />
              Nova Declaração
            </Button>
          }
        />

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card style={{
            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
            backgroundColor: '#3B5563'
          }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Declarações</CardDescription>
              <CardTitle className="text-3xl text-white">{declaracoes.length}</CardTitle>
              <p className="text-xs text-white/60 mt-1">
                Cadastradas no sistema
              </p>
            </CardHeader>
          </Card>

          <Card style={{
            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
            backgroundColor: '#3B5563'
          }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Status Atual</CardDescription>
              <CardTitle className="text-2xl text-white">Em dia</CardTitle>
              <p className="text-xs text-white/60 mt-1">
                Nenhuma pendência
              </p>
            </CardHeader>
          </Card>

          <Card style={{
            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
            backgroundColor: '#3B5563'
          }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Próxima Entrega</CardDescription>
              <CardTitle className="text-2xl text-white">Abril/2026</CardTitle>
              <p className="text-xs text-white/60 mt-1">
                Ano-calendário 2025
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Card Principal */}
        <Card style={{
          background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
          backgroundColor: '#3B5563'
        }}>
          <CardHeader>
            <CardTitle className="text-white">Gestão de Declarações</CardTitle>
            <CardDescription className="text-white/70">
              Organize rendimentos, despesas e bens para sua declaração
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="declaracoes" className="space-y-4">
              <TabsList className="border-0" style={{ backgroundColor: '#1e293b' }}>
                <TabsTrigger
                  value="declaracoes"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                  style={{ color: '#ffffff' }}
                >
                  Declarações
                </TabsTrigger>
                <TabsTrigger
                  value="rendimentos"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                  style={{ color: '#ffffff' }}
                >
                  Rendimentos
                </TabsTrigger>
                <TabsTrigger
                  value="deducoes"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                  style={{ color: '#ffffff' }}
                >
                  Deduções
                </TabsTrigger>
                <TabsTrigger
                  value="bens"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                  style={{ color: '#ffffff' }}
                >
                  Bens e Direitos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="declaracoes" className="space-y-4">
                {declaracoes.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-white/70 mx-auto mb-4" />
                    <p className="text-white/70 text-lg mb-2">
                      Nenhuma declaração cadastrada
                    </p>
                    <p className="text-white/50 text-sm">
                      Crie sua primeira declaração para começar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Lista de declarações será renderizada aqui */}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rendimentos" className="space-y-4">
                <div className="text-center py-8 text-white/70">
                  Cadastro de rendimentos em desenvolvimento...
                </div>
              </TabsContent>

              <TabsContent value="deducoes" className="space-y-4">
                <div className="text-center py-8 text-white/70">
                  Cadastro de deduções em desenvolvimento...
                </div>
              </TabsContent>

              <TabsContent value="bens" className="space-y-4">
                <div className="text-center py-8 text-white/70">
                  Cadastro de bens e direitos em desenvolvimento...
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Card de Sugestões */}
        <Card style={{
          background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
          backgroundColor: '#3B5563'
        }}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Sugestões Inteligentes
            </CardTitle>
            <CardDescription className="text-white/70">
              Identificamos automaticamente transações que podem ser declaradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-white/70">
              Sistema de sugestões em desenvolvimento...
              <p className="text-xs text-white/50 mt-2">
                Analisaremos suas transações, investimentos e rendimentos automaticamente
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
