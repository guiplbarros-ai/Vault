/**
 * Settings Service
 * Agent IMPORT: Owner
 *
 * Gerencia todas as configurações da aplicação
 */

import type {
  Settings,
  PartialSettings,
  SettingsPath,
  SettingsValue,
  SettingsCategory,
  SettingsChangeEvent,
} from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';
import { validateSettings, validateSettingsCategory } from '../validations/settings';

const STORAGE_KEY = 'cortex_settings';
const VERSION = '1.0.0';

type SubscriberCallback = (value: any, event: SettingsChangeEvent) => void;

export class SettingsService {
  private settings: Settings;
  private subscribers: Map<string, Set<SubscriberCallback>>;

  constructor() {
    this.settings = this.loadSettings();
    this.subscribers = new Map();
  }

  // =========================================================================
  // Public API
  // =========================================================================

  /**
   * Get configuração específica (suporta path nested)
   */
  get<T = any>(path: string): T {
    const keys = path.split('.');
    let value: any = this.settings;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // Retorna default se path não existe
        return this.getDefault(path);
      }
    }

    return value as T;
  }

  /**
   * Set configuração específica
   */
  async set<T = any>(path: string, value: T): Promise<void> {
    const oldValue = this.get(path);

    // Valida valor
    const validation = this.validateValue(path, value);
    if (!validation.success) {
      throw new Error(validation.error || 'Valor inválido');
    }

    // Atualiza
    const keys = path.split('.');
    let current: any = this.settings;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;

    // Persiste
    await this.saveSettings();

    // Notifica subscribers
    const event: SettingsChangeEvent = {
      path,
      oldValue,
      newValue: value,
      timestamp: new Date(),
    };

    this.notifySubscribers(path, value, event);
  }

  /**
   * Get todas configurações
   */
  getAll(): Settings {
    return { ...this.settings };
  }

  /**
   * Set categoria completa
   */
  async setCategory(category: SettingsCategory, value: Partial<Settings[typeof category]>): Promise<void> {
    // Valida categoria
    const validation = validateSettingsCategory(category, value);
    if (!validation.success) {
      throw new Error(validation.errors?.[0]?.message || 'Categoria inválida');
    }

    // Captura oldValue ANTES do merge
    const oldValue = { ...this.settings[category] };

    // Merge com valores atuais
    this.settings[category] = {
      ...this.settings[category],
      ...value,
    } as any;

    // Persiste
    await this.saveSettings();

    // Notifica
    const event: SettingsChangeEvent = {
      path: category,
      oldValue,
      newValue: value,
      timestamp: new Date(),
    };

    this.notifySubscribers(category, value, event);
  }

  /**
   * Reset para defaults (tudo ou categoria específica)
   */
  async resetToDefaults(category?: SettingsCategory): Promise<void> {
    if (category) {
      const oldValue = this.settings[category];
      this.settings[category] = { ...DEFAULT_SETTINGS[category] } as any;

      await this.saveSettings();

      const event: SettingsChangeEvent = {
        path: category,
        oldValue,
        newValue: this.settings[category],
        timestamp: new Date(),
      };

      this.notifySubscribers(category, this.settings[category], event);
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings();

      // Notifica todos
      this.notifySubscribers('*', this.settings, {
        path: '*',
        oldValue: null,
        newValue: this.settings,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Export configurações como JSON
   */
  exportSettings(): string {
    const exportData = {
      version: VERSION,
      timestamp: new Date().toISOString(),
      settings: this.settings,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import configurações de JSON
   */
  async importSettings(json: string): Promise<void> {
    try {
      const data = JSON.parse(json);

      // Valida estrutura
      if (!data.settings) {
        throw new Error('Formato de arquivo inválido');
      }

      // Valida settings
      const validation = validateSettings(data.settings);
      if (!validation.success) {
        throw new Error(validation.errors?.[0]?.message || 'Settings inválidas');
      }

      // Importa
      this.settings = data.settings;
      await this.saveSettings();

      // Notifica todos
      this.notifySubscribers('*', this.settings, {
        path: '*',
        oldValue: null,
        newValue: this.settings,
        timestamp: new Date(),
      });
    } catch (error) {
      throw new Error(`Erro ao importar settings: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Subscribe para mudanças em um path específico
   */
  subscribe(path: string, callback: SubscriberCallback): () => void {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }

    this.subscribers.get(path)!.add(callback);

    // Retorna função de unsubscribe
    return () => {
      const subs = this.subscribers.get(path);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(path);
        }
      }
    };
  }

  /**
   * Limpa todos os subscribers
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Load settings do localStorage
   */
  private loadSettings(): Settings {
    try {
      if (typeof window === 'undefined') {
        return { ...DEFAULT_SETTINGS };
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { ...DEFAULT_SETTINGS };
      }

      const data = JSON.parse(stored);

      // Valida
      const validation = validateSettings(data);
      if (!validation.success) {
        console.warn('Settings inválidas no localStorage, usando defaults:', validation.errors);
        return { ...DEFAULT_SETTINGS };
      }

      // Merge com defaults (para adicionar novos campos)
      return this.mergeWithDefaults(data);
    } catch (error) {
      console.error('Erro ao carregar settings:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save settings no localStorage
   */
  private async saveSettings(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Erro ao salvar settings:', error);
      throw new Error('Falha ao salvar configurações');
    }
  }

  /**
   * Merge settings com defaults (adiciona campos novos)
   */
  private mergeWithDefaults(settings: Partial<Settings>): Settings {
    const merged: any = { ...DEFAULT_SETTINGS };

    for (const category in settings) {
      if (category in DEFAULT_SETTINGS) {
        merged[category] = {
          ...DEFAULT_SETTINGS[category as SettingsCategory],
          ...settings[category as SettingsCategory],
        };
      }
    }

    return merged;
  }

  /**
   * Get default value para um path
   */
  private getDefault(path: string): any {
    const keys = path.split('.');
    let value: any = DEFAULT_SETTINGS;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Valida valor individual
   */
  private validateValue(path: string, value: any): { success: boolean; error?: string } {
    // Implementação básica, pode ser expandida
    return { success: true };
  }

  /**
   * Notifica subscribers sobre mudança
   */
  private notifySubscribers(path: string, value: any, event: SettingsChangeEvent): void {
    // Notifica subscribers específicos do path
    const exactSubs = this.subscribers.get(path);
    if (exactSubs) {
      exactSubs.forEach((callback) => {
        try {
          callback(value, event);
        } catch (error) {
          console.error('Erro em subscriber:', error);
        }
      });
    }

    // Notifica subscribers do path pai (ex: 'appearance' quando muda 'appearance.theme')
    const pathParts = path.split('.');
    for (let i = 1; i < pathParts.length; i++) {
      const parentPath = pathParts.slice(0, i).join('.');
      const parentSubs = this.subscribers.get(parentPath);
      if (parentSubs) {
        parentSubs.forEach((callback) => {
          try {
            callback(value, event);
          } catch (error) {
            console.error('Erro em subscriber pai:', error);
          }
        });
      }
    }

    // Notifica subscribers globais (*)
    const globalSubs = this.subscribers.get('*');
    if (globalSubs) {
      globalSubs.forEach((callback) => {
        try {
          callback(value, event);
        } catch (error) {
          console.error('Erro em subscriber global:', error);
        }
      });
    }
  }
}

// Singleton instance
export const settingsService = new SettingsService();

// Export helper functions
export const getSettings = () => settingsService.getAll();
export const getSetting = <T = any>(path: string): T => settingsService.get<T>(path);
export const setSetting = <T = any>(path: string, value: T) => settingsService.set(path, value);
export const resetSettings = (category?: SettingsCategory) => settingsService.resetToDefaults(category);
export const subscribeToSettings = (path: string, callback: SubscriberCallback) => settingsService.subscribe(path, callback);
