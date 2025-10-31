"use client";

/**
 * useTheme Hook
 * Agent IMPORT: Owner
 *
 * Hook para gerenciar tema da aplicação
 */

import { useEffect } from 'react';
import { useSetting } from '@/app/providers/settings-provider';
import type { Theme } from '@/lib/types/settings';

export function useTheme() {
  const [theme, setTheme] = useSetting<Theme>('appearance.theme');

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove both classes first
    root.classList.remove('light', 'dark');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.add('light');
    } else {
      // Auto: use system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(isDark ? 'dark' : 'light');
    }
  }, [theme]);

  // Listen to system theme changes when in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return {
    theme,
    setTheme,
    resolvedTheme: theme === 'auto'
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme,
  };
}
