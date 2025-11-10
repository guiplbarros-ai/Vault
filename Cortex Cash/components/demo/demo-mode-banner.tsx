'use client'

/**
 * Demo Mode Banner
 * Agent BACKEND: Owner
 *
 * Banner visual que indica quando o usuário está em modo demonstração
 */

import { useState, useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { isDemoMode } from '@/lib/config/demo-mode'
import { Button } from '@/components/ui/button'

export function DemoModeBanner() {
  const [isDemo, setIsDemo] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Verificar modo demo
    const demo = isDemoMode()
    setIsDemo(demo)

    // Verificar se já foi dispensado nesta sessão
    const wasDismissed = sessionStorage.getItem('demo-banner-dismissed') === 'true'
    setDismissed(wasDismissed)
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('demo-banner-dismissed', 'true')
  }

  if (!isDemo || dismissed) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm md:text-base">
                Modo Demonstração Ativo
              </p>
              <p className="text-xs md:text-sm opacity-90">
                Você está usando dados fictícios. Acesse Settings para sair do modo demo.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0"
            aria-label="Dispensar banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
