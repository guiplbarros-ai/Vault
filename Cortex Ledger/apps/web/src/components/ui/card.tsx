import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const cardVariants = cva(
  'rounded-xl2 border',
  {
    variants: {
      variant: {
        light: 'bg-white shadow-card border-slate-200',
        dark: 'bg-graphite-800 shadow-cardDark border-graphite-700',
        default: 'bg-white dark:bg-graphite-800 shadow-card dark:shadow-cardDark border-slate-200 dark:border-graphite-700',
      }
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface CardProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  hover?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant }),
          hover && 'transition-all duration-200 hover:shadow-card hover:-translate-y-0.5',
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 px-6 py-4', className)}
        {...props}
      />
    )
  }
)

CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-xl font-semibold leading-none tracking-tight text-slate-900 dark:text-graphite-100', className)}
        {...props}
      />
    )
  }
)

CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-slate-600 dark:text-graphite-300', className)}
        {...props}
      />
    )
  }
)

CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
  }
)

CardContent.displayName = 'CardContent'

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
  }
)

CardBody.displayName = 'CardBody'

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center px-6 py-4', className)}
        {...props}
      />
    )
  }
)

CardFooter.displayName = 'CardFooter'
