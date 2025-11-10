'use client';

/**
 * Seletor de Usuário
 * Agent UI: Multi-User System
 *
 * Permite trocar entre perfis de usuário (Produção / Teste)
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Check } from 'lucide-react';
import { getDB } from '@/lib/db/client';
import { getCurrentUserId, setCurrentUserId } from '@/lib/db/seed-usuarios';
import type { Usuario } from '@/lib/types';

export function UserSelector() {
  const [currentUserId, setCurrentUserIdState] = useState<string>('usuario-producao');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUsuarios() {
      try {
        setIsLoading(true);
        const db = getDB();
        const allUsuarios = await db.usuarios.toArray();
        setUsuarios(allUsuarios.filter(u => u.ativo));

        const userId = getCurrentUserId();
        setCurrentUserIdState(userId);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUsuarios();
  }, []);

  const handleUserChange = async (userId: string) => {
    if (userId === currentUserId) return;

    try {
      // Atualiza localStorage
      setCurrentUserId(userId);

      // Atualiza último acesso
      const db = getDB();
      await db.usuarios.update(userId, {
        ultimo_acesso: new Date(),
      });

      // Recarrega a página para aplicar o novo usuário em todos os services
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Erro ao trocar usuário:', error);
    }
  };

  const currentUser = usuarios.find(u => u.id === currentUserId);

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
    );
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
          <span className="max-w-[120px] truncate">
            {currentUser?.nome || 'Produção'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={5}
        className="w-56 bg-[#0B2230]/95 backdrop-blur-md border-white/20 text-white"
      >
        <DropdownMenuLabel className="text-white/70 font-normal">
          Perfis de Usuário
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/20" />
        {usuarios.map((usuario) => (
          <DropdownMenuItem
            key={usuario.id}
            onClick={() => handleUserChange(usuario.id)}
            className="flex items-center justify-between cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
          >
            <span>{usuario.nome}</span>
            {usuario.id === currentUserId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
