'use client'

import { useState } from 'react'
import { Building2 } from 'lucide-react'

interface BankLogoProps {
  logoUrl?: string
  bankName: string
  size?: number
  className?: string
}

/**
 * Componente para exibir logo de banco com fallback
 * Tenta carregar a imagem, se falhar mostra ícone genérico
 */
export function BankLogo({ logoUrl, bankName, size = 40, className = '' }: BankLogoProps) {
  const [imageError, setImageError] = useState(false)

  // Se não tem logo ou deu erro, mostra ícone genérico
  if (!logoUrl || imageError || logoUrl.length === 1) {
    // Se logoUrl tem 1 caractere, é um emoji
    return (
      <div
        className={`flex items-center justify-center bg-white/10 rounded-lg ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <Building2 className="text-white/70" style={{ width: size * 0.6, height: size * 0.6 }} />
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center bg-white rounded-lg overflow-hidden ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <img
        src={logoUrl}
        alt={`Logo ${bankName}`}
        width={size}
        height={size}
        className="object-contain"
        onError={() => setImageError(true)}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  )
}
