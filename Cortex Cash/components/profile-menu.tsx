'use client';

/**
 * Profile Menu
 * Agent CORE: Sistema de Autenticação
 *
 * Menu de perfil do usuário com opções de logout, configurações, etc.
 */

import { useAuth } from '@/app/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    // O logout() já redireciona para /onboarding
    logout();
  };

  if (!user) {
    return null;
  }

  // Pega as iniciais do nome
  const initials = user.nome
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20"
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.nome}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-primary">{initials}</span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={5}
        className="w-56"
        style={{
          backgroundColor: '#1a362f',
          border: '1px solid #2d5247',
          borderRadius: '14px',
          boxShadow: '0 2px 0 rgba(0,0,0,.45), 0 12px 24px rgba(0,0,0,.35)',
        }}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none" style={{ color: '#F7FAF9' }}>
              {user.nome}
            </p>
            <p className="text-xs leading-none" style={{ color: '#94a8a1' }}>
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator style={{ backgroundColor: '#2d5247' }} />

        <DropdownMenuItem
          onClick={() => router.push('/settings')}
          className="cursor-pointer"
          style={{ color: '#F7FAF9' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1d3a33';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </DropdownMenuItem>

        <DropdownMenuSeparator style={{ backgroundColor: '#2d5247' }} />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer"
          style={{ color: '#F07167' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2e1f1f';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
