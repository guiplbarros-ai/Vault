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
// Utility Functions
// ============================================================================

/**
 * Comparação profunda eficiente para objetos Settings
 * Evita usar JSON.stringify que é custoso
 */
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2 || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;

    const val1 = obj1[key];
    const val2 = obj2[key];

    if (typeof val1 === 'object' && typeof val2 === 'object') {
      if (!deepEqual(val1, val2)) return false;
    } else if (val1 !== val2) {
      return false;
    }
  }

  return true;
}

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
        // Só atualiza se realmente mudou (comparação profunda eficiente)
        if (!deepEqual(prevSettings, newSettings)) {
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

  // Memoiza o callback de subscription para evitar re-subscriptions
  const handleValueChange = useCallback((newValue: T) => {
    setValue(newValue);
  }, []);

  // Subscribe to changes on this specific path
  useEffect(() => {
    const unsubscribe = subscribe(path, handleValueChange);
    return unsubscribe;
  }, [path, subscribe, handleValueChange]);

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

  // Memoiza o callback para evitar re-subscriptions
  const handleCategoryChange = useCallback((_: any, event: SettingsChangeEvent) => {
    // Verifica se o path começa com a categoria (ex: "appearance.theme" começa com "appearance")
    if (event.path.startsWith(category + '.') || event.path === '*') {
      const newCategorySettings = settingsService.getAll()[category];
      setCategorySettings(newCategorySettings);
    }
  }, [category]);

  useEffect(() => {
    // Subscribe a TODAS as mudanças (*) e filtra apenas a categoria desejada
    // Nota: Idealmente subscriberíamos apenas ao prefixo "category.*", mas o
    // settingsService não oferece essa funcionalidade, então subscribemos a todas
    const unsubscribe = subscribe('*', handleCategoryChange);
    return unsubscribe;
  }, [category, subscribe, handleCategoryChange]);

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
 * Consolidado em um único useEffect para reduzir cascata de subscriptions
 */
export function useAppearanceSettings() {
  // Usa useSettingsCategory para obter todas as configurações de aparência de uma vez
  const appearanceSettings = useSettingsCategory('appearance');

  // Consolida aplicação de temas e estilos em um único useEffect
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Apply theme - FORÇADO PARA SEMPRE DARK (esquema verde CORES.md)
    root.classList.remove('dark', 'light');
    body.classList.remove('dark', 'light');
    root.classList.add('dark');
    body.classList.add('dark');

    // Apply density e fontSize
    root.setAttribute('data-density', appearanceSettings.density);
    root.style.fontSize = `${appearanceSettings.fontSize}%`;

    // Apply pixel art mode
    if (appearanceSettings.pixelArtMode) {
      root.classList.add('pixel-art-mode');
    } else {
      root.classList.remove('pixel-art-mode');
    }
  }, [appearanceSettings]);
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
