import { cn } from '@/lib/utils'

/**
 * Skeleton Component
 *
 * Componente para loading states com skeleton screens.
 * Melhora a percepção de performance ao mostrar a estrutura da UI durante carregamento.
 *
 * @example
 * ```tsx
 * // Skeleton básico
 * <Skeleton className="h-12 w-12 rounded-full" />
 * <Skeleton className="h-4 w-[250px]" />
 *
 * // Card com skeleton
 * <Card>
 *   <CardHeader>
 *     <Skeleton className="h-4 w-[200px]" />
 *     <Skeleton className="h-3 w-[150px]" />
 *   </CardHeader>
 *   <CardContent>
 *     <Skeleton className="h-[200px] w-full" />
 *   </CardContent>
 * </Card>
 * ```
 */

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variação de animação */
  variant?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({ className, variant = 'pulse', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-neutral-200 dark:bg-neutral-800',
        {
          'animate-pulse': variant === 'pulse',
          'animate-shimmer': variant === 'wave',
        },
        className
      )}
      {...props}
    />
  )
}

/**
 * SkeletonText Component
 *
 * Helper para skeleton de texto (múltiplas linhas).
 */
export interface SkeletonTextProps {
  /** Número de linhas */
  lines?: number
  /** Classes CSS adicionais */
  className?: string
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', {
            'w-full': i < lines - 1,
            'w-4/5': i === lines - 1, // última linha menor
          })}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonCard Component
 *
 * Skeleton para um card completo.
 */
export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <SkeletonText lines={3} />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  )
}

/**
 * SkeletonTable Component
 *
 * Skeleton para uma tabela.
 */
export interface SkeletonTableProps {
  /** Número de linhas */
  rows?: number
  /** Número de colunas */
  columns?: number
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex gap-4 border-b border-neutral-200 pb-2 dark:border-neutral-800">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * SkeletonAvatar Component
 *
 * Skeleton circular para avatar.
 */
export interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const avatarSizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

export function SkeletonAvatar({ size = 'md', className }: SkeletonAvatarProps) {
  return <Skeleton className={cn('rounded-full', avatarSizes[size], className)} />
}

/**
 * ChartSkeleton Component
 *
 * Skeleton para gráficos.
 */
export function ChartSkeleton() {
  return (
    <div className="flex h-[300px] w-full items-end justify-around gap-2 p-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton
          key={i}
          className="w-full"
          style={{ height: `${Math.random() * 60 + 40}%` }}
        />
      ))}
    </div>
  )
}
