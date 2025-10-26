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
      'inline-flex h-10 items-center justify-center rounded-lg bg-neutral-100 p-1 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
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
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm',
      'dark:ring-offset-neutral-950 dark:focus-visible:ring-primary-400',
      'dark:data-[state=active]:bg-neutral-950 dark:data-[state=active]:text-neutral-50',
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
      'mt-2 ring-offset-white',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
      'dark:ring-offset-neutral-950 dark:focus-visible:ring-primary-400',
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
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <Tabs className={className} {...props}>
        {children}
      </Tabs>
    </div>
  )
}
