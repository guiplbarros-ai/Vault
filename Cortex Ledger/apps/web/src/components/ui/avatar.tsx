import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

/**
 * Avatar Component
 *
 * Componente de avatar para exibir foto de perfil ou iniciais do usuário.
 * Baseado em Radix UI Avatar com fallback automático.
 *
 * @example
 * ```tsx
 * // Com imagem
 * <Avatar>
 *   <AvatarImage src="/foto.jpg" alt="João Silva" />
 *   <AvatarFallback>JS</AvatarFallback>
 * </Avatar>
 *
 * // Apenas iniciais
 * <Avatar>
 *   <AvatarFallback>AB</AvatarFallback>
 * </Avatar>
 * ```
 */

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-elev text-sm font-medium text-text',
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }

/**
 * UserAvatar Component
 *
 * Componente helper para avatar de usuário com geração automática de iniciais.
 */
export interface UserAvatarProps {
  /** URL da imagem */
  src?: string | null
  /** Nome do usuário (para gerar iniciais) */
  name: string
  /** Classes CSS adicionais */
  className?: string
  /** Tamanho (sm: 8, md: 10, lg: 12, xl: 16) */
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * Gera iniciais a partir do nome
 * Ex: "João Silva" -> "JS"
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

export function UserAvatar({ src, name, className, size = 'md' }: UserAvatarProps) {
  const initials = getInitials(name)

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
