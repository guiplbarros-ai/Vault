'use client'

/**
 * Seletor de Usuário
 * Agent UI: Multi-User System
 *
 * Exibe o usuário autenticado atual
 */

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authService } from '@/lib/services/auth.service'
import type { Usuario } from '@/lib/types'
import { LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'

export function UserSelector() {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        setIsLoading(true)
        const user = await authService.getCurrentUser()
        setCurrentUser(user)
      } catch (error) {
        console.error('Erro ao carregar usuário:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCurrentUser()
  }, [])

  const handleLogout = async () => {
    try {
      await authService.logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  if (isLoading) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="text-white border-white/40 bg-transparent"
      >
        <User className="h-4 w-4 mr-2" />
        Carregando...
      </Button>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-white border-white/40 bg-transparent hover:bg-white/10 hover:border-white"
        >
          <User className="h-4 w-4 mr-2" />
          <span className="max-w-[120px] truncate">{currentUser.nome}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={5}
        className="w-56 bg-[#0B2230]/95 backdrop-blur-md border-white/20 text-white"
      >
        <DropdownMenuLabel className="text-white/70 font-normal">
          {currentUser.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/20" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
