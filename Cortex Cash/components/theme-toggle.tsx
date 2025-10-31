"use client";

/**
 * Theme Toggle Component
 * Agent IMPORT: Owner
 *
 * Botão para alternar entre temas (claro/escuro)
 */

import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSetting } from '@/app/providers/settings-provider';
import type { Theme } from '@/lib/types/settings';

export function ThemeToggle() {
  const [theme, setTheme] = useSetting<Theme>('appearance.theme');

  const handleThemeChange = async (newTheme: Theme) => {
    await setTheme(newTheme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Claro</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Escuro</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('auto')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>Automático</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
