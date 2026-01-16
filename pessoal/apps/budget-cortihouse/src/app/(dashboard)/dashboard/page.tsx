import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Users, Package, TrendingUp, PlusCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { fetchDashboardStats, fetchRecentQuotes } from './actions'
import { statusConfig } from '@/lib/constants/quote-status'

export default async function DashboardPage() {
  const [statsResult, quotesResult] = await Promise.all([
    fetchDashboardStats(),
    fetchRecentQuotes(),
  ])

  const stats = statsResult.data
  const recentQuotes = quotesResult.data

  return (
    <>
      <Header title="Dashboard" description="Visão geral do sistema" />

      <div className='space-y-6 p-6'>
        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/orcamentos/novo">
              <PlusCircle className="mr-2 h-5 w-5" />
              Novo Orçamento
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/clientes/novo">
              <Users className="mr-2 h-5 w-5" />
              Novo Cliente
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className='font-medium text-sm'>Orçamentos do Mês</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className='font-bold text-2xl'>{stats?.quotesThisMonth ?? 0}</div>
              <p className='text-muted-foreground text-xs'>Total de orçamentos criados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className='font-medium text-sm'>Clientes Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className='font-bold text-2xl'>{stats?.totalCustomers ?? 0}</div>
              <p className='text-muted-foreground text-xs'>Clientes cadastrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className='font-medium text-sm'>Materiais</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className='font-bold text-2xl'>{stats?.totalProducts ?? 0}</div>
              <p className='text-muted-foreground text-xs'>Preços cadastrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className='font-medium text-sm'>Faturamento</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className='font-bold text-2xl'>
                {formatCurrency(stats?.revenueThisMonth ?? 0)}
              </div>
              <p className='text-muted-foreground text-xs'>Aprovados este mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Quotes */}
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos Recentes</CardTitle>
            <CardDescription>Últimos orçamentos criados</CardDescription>
          </CardHeader>
          <CardContent>
            {recentQuotes.length > 0 ? (
              <div className="space-y-4">
                {recentQuotes.map((quote) => {
                  const config = statusConfig[quote.status as keyof typeof statusConfig]
                  return (
                    <Link
                      key={quote.id}
                      href={`/orcamentos/${quote.id}`}
                      className='flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted'
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{quote.quoteNumber}</span>
                          <Badge className={`${config.bgColor} ${config.color} border-0`}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className='text-muted-foreground text-sm'>
                          {quote.customerName} • {formatDate(quote.createdAt)}
                        </p>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(Number(quote.total))}
                      </span>
                    </Link>
                  )
                })}
                <div className='border-t pt-2'>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/orcamentos">Ver todos os orçamentos</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className='font-medium text-lg'>Nenhum orçamento ainda</p>
                <p className="text-sm">Crie seu primeiro orçamento para começar</p>
                <Button asChild className="mt-4">
                  <Link href="/orcamentos/novo">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Orçamento
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
