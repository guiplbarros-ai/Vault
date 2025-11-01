"use client";

/**
 * Settings Provider
 * Agent IMPORT: Owner
 *
 * React Context para gerenciar settings globalmente
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { settingsService } from '@/lib/services/settings.service';
import type {
  Settings,
  SettingsPath,
  SettingsCategory,
  SettingsChangeEvent,
} from '@/lib/types/settings';

// ============================================================================
// Context Types
// ============================================================================

interface SettingsContextValue {
  settings: Settings;
  getSetting: <T = any>(path: string) => T;
  setSetting: <T = any>(path: string, value: T) => Promise<void>;
  resetSettings: (category?: SettingsCategory) => Promise<void>;
  exportSettings: () => string;
  importSettings: (json: string) => Promise<void>;
  subscribe: (path: string, callback: (value: any, event: SettingsChangeEvent) => void) => () => void;
  loading: boolean;
}

// ============================================================================
// Context
// ============================================================================

const SettingsContext = createContext<SettingsContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(settingsService.getAll());
  const [loading, setLoading] = useState(false);

  // Subscribe to all settings changes
  useEffect(() => {
    const unsubscribe = settingsService.subscribe('*', (_, event) => {
      // Update local state when settings change
      // Usa função de atualização para garantir que sempre temos o estado mais recente
      setSettings(prevSettings => {
        const newSettings = settingsService.getAll();
        // Só atualiza se realmente mudou (comparação profunda)
        if (JSON.stringify(prevSettings) !== JSON.stringify(newSettings)) {
          return newSettings;
        }
        return prevSettings;
      });
    });

    return unsubscribe;
  }, []);

  // Get setting value
  const getSetting = useCallback(<T = any>(path: string): T => {
    return settingsService.get<T>(path);
  }, []);

  // Set setting value
  const setSetting = useCallback(async <T = any>(path: string, value: T): Promise<void> => {
    setLoading(true);
    try {
      await settingsService.set(path, value);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(async (category?: SettingsCategory): Promise<void> => {
    setLoading(true);
    try {
      await settingsService.resetToDefaults(category);
    } finally {
      setLoading(false);
    }
  }, []);

  // Export settings as JSON
  const exportSettings = useCallback((): string => {
    return settingsService.exportSettings();
  }, []);

  // Import settings from JSON
  const importSettings = useCallback(async (json: string): Promise<void> => {
    setLoading(true);
    try {
      await settingsService.importSettings(json);
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to changes
  const subscribe = useCallback((
    path: string,
    callback: (value: any, event: SettingsChangeEvent) => void
  ) => {
    return settingsService.subscribe(path, callback);
  }, []);

  const value: SettingsContextValue = {
    settings,
    getSetting,
    setSetting,
    resetSettings,
    exportSettings,
    importSettings,
    subscribe,
    loading,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook para acessar todas as settings
 */
export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }

  return context;
}

/**
 * Hook para acessar e modificar uma setting específica
 */
export function useSetting<T = any>(path: string) {
  const { getSetting, setSetting, subscribe } = useSettings();
  const [value, setValue] = useState<T>(() => getSetting<T>(path));

  // Subscribe to changes on this specific path
  useEffect(() => {
    const unsubscribe = subscribe(path, (newValue) => {
      setValue(newValue);
    });

    return unsubscribe;
  }, [path, subscribe]);

  const updateValue = useCallback(
    async (newValue: T) => {
      await setSetting(path, newValue);
    },
    [path, setSetting]
  );

  return [value, updateValue] as const;
}

/**
 * Hook para acessar uma categoria completa de settings
 * Retorna valor estável usando useState local e subscription
 */
export function useSettingsCategory<K extends SettingsCategory>(
  category: K
): Settings[K] {
  const { getSetting, subscribe } = useSettings();
  const [categorySettings, setCategorySettings] = useState<Settings[K]>(() =>
    settingsService.getAll()[category]
  );

  useEffect(() => {
    // Subscribe a TODAS as mudanças (*) e filtra apenas a categoria desejada
    const unsubscribe = subscribe('*', (_, event) => {
      // Verifica se o path começa com a categoria (ex: "appearance.theme" começa com "appearance")
      if (event.path.startsWith(category + '.') || event.path === '*') {
        const newCategorySettings = settingsService.getAll()[category];
        setCategorySettings(newCategorySettings);
      }
    });

    return unsubscribe;
  }, [category, subscribe]);

  return categorySettings;
}

/**
 * Hook para detectar mudanças em settings
 */
export function useSettingsChange(
  path: string,
  callback: (value: any, event: SettingsChangeEvent) => void
) {
  const { subscribe } = useSettings();

  useEffect(() => {
    const unsubscribe = subscribe(path, callback);
    return unsubscribe;
  }, [path, callback, subscribe]);
}

/**
 * Hook para aplicar configurações de aparência (theme, density, etc)
 */
export function useAppearanceSettings() {
  // Usa useSetting para cada propriedade individualmente para garantir re-renders
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme');
  const [density] = useSetting<'comfortable' | 'compact'>('appearance.density');
  const [fontSize] = useSetting<number>('appearance.fontSize');
  const [pixelArtMode] = useSetting<boolean>('appearance.pixelArtMode');

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const applyTheme = (isDark: boolean) => {
      root.classList.remove('dark', 'light');
      body.classList.remove('dark', 'light');

      if (isDark) {
        root.classList.add('dark');
        body.classList.add('dark');
      } else {
        root.classList.add('light');
        body.classList.add('light');
      }
    };

    if (theme === 'dark') {
      applyTheme(true);
    } else if (theme === 'light') {
      applyTheme(false);
    } else {
      // Auto: use system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Apply density, fontSize, pixelArtMode
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-density', density);
    root.style.fontSize = `${fontSize}%`;

    if (pixelArtMode) {
      root.classList.add('pixel-art-mode');
    } else {
      root.classList.remove('pixel-art-mode');
    }
  }, [density, fontSize, pixelArtMode]);

  return { theme, density, fontSize, pixelArtMode };
}

/**
 * Hook para formatação baseada em configurações de localização
 */
export function useLocalizationSettings() {
  const localization = useSettingsCategory('localization');

  const formatCurrency = useCallback(
    (value: number): string => {
      const locale = localization.language;
      const currency = localization.currency;
      const fractionDigits = localization.hideDecimals ? 0 : 2;

      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value);
    },
    [localization.language, localization.currency, localization.hideDecimals]
  );

  const formatDate = useCallback(
    (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date;

      // Formata componentes da data
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();

      // Aplica o formato configurado
      switch (localization.dateFormat) {
        case 'DD/MM/YYYY':
          return `${day}/${month}/${year}`;
        case 'MM/DD/YYYY':
          return `${month}/${day}/${year}`;
        case 'YYYY-MM-DD':
          return `${year}-${month}-${day}`;
        default:
          return `${day}/${month}/${year}`;
      }
    },
    [localization.dateFormat]
  );

  const formatTime = useCallback(
    (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const locale = localization.language;

      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: localization.timeFormat === '12h',
      };

      return new Intl.DateTimeFormat(locale, options).format(d);
    },
    [localization.language, localization.timeFormat]
  );

  const formatNumber = useCallback(
    (value: number, decimals: number = 2): string => {
      const locale = localization.language;

      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    },
    [localization.language]
  );

  return {
    localization,
    formatCurrency,
    formatDate,
    formatTime,
    formatNumber,
  };
}
