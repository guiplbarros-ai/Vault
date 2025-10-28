import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

/**
 * Tabs Component
 *
 * Componente de abas para organizar conteúdo em múltiplas seções.
 * Baseado em Radix UI Tabs com suporte a teclado e acessibilidade.
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="overview">
 *   <TabsList>
 *     <TabsTrigger value="overview">Visão Geral</TabsTrigger>
 *     <TabsTrigger value="details">Detalhes</TabsTrigger>
 *     <TabsTrigger value="settings">Configurações</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="overview">
 *     <p>Conteúdo da visão geral</p>
 *   </TabsContent>
 *   <TabsContent value="details">
 *     <p>Conteúdo dos detalhes</p>
 *   </TabsContent>
 *   <TabsContent value="settings">
 *     <p>Conteúdo das configurações</p>
 *   </TabsContent>
 * </Tabs>
 * ```
 */

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-xl bg-surface p-1 text-muted border border-line/25',
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-elev data-[state=active]:text-text data-[state=active]:shadow-sm',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2',
      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25',
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

/**
 * TabsCard Component
 *
 * Wrapper de Card para Tabs, seguindo o padrão do design system.
 *
 * @example
 * ```tsx
 * <TabsCard defaultValue="monthly">
 *   <TabsList>
 *     <TabsTrigger value="monthly">Mensal</TabsTrigger>
 *     <TabsTrigger value="yearly">Anual</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="monthly">
 *     <MonthlyChart />
 *   </TabsContent>
 *   <TabsContent value="yearly">
 *     <YearlyChart />
 *   </TabsContent>
 * </TabsCard>
 * ```
 */
export interface TabsCardProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  children: React.ReactNode
}

export function TabsCard({ className, children, ...props }: TabsCardProps) {
  return (
    <div className="rounded-2xl border border-line/25 bg-surface p-6 shadow-card">
      <Tabs className={className} {...props}>
        {children}
      </Tabs>
    </div>
  )
}
