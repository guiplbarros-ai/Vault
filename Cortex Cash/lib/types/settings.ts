/**
 * Settings Types
 * Agent IMPORT: Owner
 *
 * Tipos completos para sistema de configurações da aplicação
 */

// ============================================================================
// Enums e Tipos Base
// ============================================================================

export type Theme = 'auto' | 'dark' | 'light';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type FontSize = 90 | 100 | 110 | 120;
export type Language = 'pt-BR' | 'en-US' | 'es';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '24h' | '12h';
export type Currency = 'BRL' | 'USD' | 'EUR' | 'GBP';
export type DecimalSeparator = ',' | '.';
export type FirstDayOfWeek = 0 | 1; // 0=Sunday, 1=Monday
export type BackupFrequency = 'daily' | 'weekly' | 'monthly';
export type CalculationMethod = 'cash' | 'accrual';
export type ProjectionMethod = 'avg3months' | 'avg6months' | 'lastMonth' | 'manual';
export type AIModel = 'gpt-4o-mini' | 'gpt-4o';
export type AIStrategy = 'aggressive' | 'balanced' | 'quality';
export type ImportMode = 'always' | 'errors_only' | 'never';
export type ToastPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type CacheClearFrequency = 'on_close' | 'daily' | 'weekly';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type Pagination = 25 | 50 | 100 | 200;
export type BatchSize = 10 | 25 | 50 | 100;

// ============================================================================
// Settings Interface Completa
// ============================================================================

export interface Settings {
  appearance: AppearanceSettings;
  localization: LocalizationSettings;
  dataPrivacy: DataPrivacySettings;
  importClassification: ImportClassificationSettings;
  budgetAlerts: BudgetAlertsSettings;
  aiCosts: AICostsSettings;
  performance: PerformanceSettings;
  advanced: AdvancedSettings;
}

// ============================================================================
// Categorias de Settings
// ============================================================================

export interface AppearanceSettings {
  theme: Theme;
  density: Density;
  fontSize: FontSize;
  pixelArtMode: boolean;
}

export interface LocalizationSettings {
  language: Language;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  currency: Currency;
  decimalSeparator: DecimalSeparator;
  firstDayOfWeek: FirstDayOfWeek;
  hideDecimals: boolean; // Ocultar casas decimais em toda aplicação
}

export interface DataPrivacySettings {
  autoBackup: boolean;
  backupFrequency: BackupFrequency;
  backupTime: string; // HH:mm format
  backupRetention: number; // days
  telemetry: boolean;
  encryption: boolean; // v1.0+
}

export interface ImportClassificationSettings {
  autoDetectDuplicates: boolean;
  createPendingTransactions: boolean;
  autoApplyRules: boolean;
  aiSuggestions: boolean;
  aiConfidenceThreshold: number; // 0-100
  autoSaveTemplates: boolean;
  skipInvalidLines: boolean;
}

export interface BudgetAlertsSettings {
  enabled: boolean;
  alert80: boolean;
  alert100: boolean;
  alert120: boolean;
  calculationMethod: CalculationMethod;
  considerTransfers: boolean;
  autoProjection: boolean;
  projectionMethod: ProjectionMethod;
  resetMonthly: boolean;
}

export interface AICostsSettings {
  apiKey: string; // encrypted
  enabled: boolean;
  defaultModel: AIModel;
  monthlyCostLimit: number; // USD
  allowOverride: boolean;
  strategy: AIStrategy;
  cachePrompts: boolean;
  batchProcessing: boolean;
  batchSize: BatchSize;
  confidenceThreshold: number; // 0-1, default 0.7
  autoApplyOnImport: boolean;
}

export interface PerformanceSettings {
  cache: boolean;
  cacheTTL: number; // minutes
  lazyLoading: boolean;
  pagination: Pagination;
  chartAnimations: boolean;
  preloadDashboards: boolean;
  autoClearCache: boolean;
  cacheClearFrequency: CacheClearFrequency;
}

export interface AdvancedSettings {
  devMode: boolean;
  logLevel: LogLevel;
  experiments: Record<string, boolean>;
}

// ============================================================================
// Notification Settings (nested in advanced or separate)
// ============================================================================

export interface NotificationSettings {
  system: boolean;
  budget: {
    enabled: boolean;
    alert80: boolean;
    alert100: boolean;
    exceeded: boolean;
  };
  import: ImportMode;
  ai: boolean;
  invoice: {
    closed: boolean;
    due3days: boolean;
    overdue: boolean;
    limit70: boolean;
    limit90: boolean;
  };
  sound: boolean;
  position: ToastPosition;
  duration: number; // ms
}

// ============================================================================
// Helpers e Utility Types
// ============================================================================

/**
 * Path type para acessar nested settings
 * Exemplos: 'appearance.theme', 'aiCosts.monthlyCostLimit'
 */
export type SettingsPath =
  | `appearance.${keyof AppearanceSettings}`
  | `localization.${keyof LocalizationSettings}`
  | `dataPrivacy.${keyof DataPrivacySettings}`
  | `importClassification.${keyof ImportClassificationSettings}`
  | `budgetAlerts.${keyof BudgetAlertsSettings}`
  | `aiCosts.${keyof AICostsSettings}`
  | `performance.${keyof PerformanceSettings}`
  | `advanced.${keyof AdvancedSettings}`;

/**
 * Categoria de settings (top-level keys)
 */
export type SettingsCategory = keyof Settings;

/**
 * Todas as categorias de UI (incluindo views especiais)
 */
export type UICategory = SettingsCategory | 'profile' | 'analytics' | 'demoMode' | 'admin';

/**
 * Value type baseado no path
 */
export type SettingsValue<T extends SettingsPath> =
  T extends `${infer Category}.${infer Key}`
    ? Category extends keyof Settings
      ? Key extends keyof Settings[Category]
        ? Settings[Category][Key]
        : never
      : never
    : never;

/**
 * Partial settings para updates
 */
export type PartialSettings = {
  [K in keyof Settings]?: Partial<Settings[K]>;
};

/**
 * Settings metadata (para UI)
 */
export interface SettingMeta {
  key: string;
  category: SettingsCategory;
  label: string;
  description: string;
  type: 'toggle' | 'select' | 'slider' | 'input' | 'password';
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  tooltip?: string;
  requiresReload?: boolean;
  impact?: 'visual' | 'data' | 'performance' | 'cost';
  version?: string; // v0.1, v1.0, etc
}

/**
 * Settings change event
 */
export interface SettingsChangeEvent<T = any> {
  path: string;
  oldValue: T;
  newValue: T;
  timestamp: Date;
}

/**
 * Settings validation result
 */
export interface SettingsValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Backup metadata
 */
export interface BackupMetadata {
  version: string;
  timestamp: Date;
  recordCount: {
    transacoes: number;
    contas: number;
    categorias: number;
    instituicoes: number;
  };
  settings: Settings;
  checksum: string; // SHA256
}

/**
 * Storage info
 */
export interface StorageInfo {
  used: number; // bytes
  available: number; // bytes
  total: number; // bytes
  percentage: number; // 0-100
  breakdown: {
    transacoes: number;
    cache: number;
    settings: number;
    other: number;
  };
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_SETTINGS: Settings = {
  appearance: {
    theme: 'auto',
    density: 'compact',
    fontSize: 100,
    pixelArtMode: false,
  },
  localization: {
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'BRL',
    decimalSeparator: ',',
    firstDayOfWeek: 0, // Sunday
    hideDecimals: false,
  },
  dataPrivacy: {
    autoBackup: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    backupRetention: 7, // days
    telemetry: false, // opt-in
    encryption: false, // v1.0+
  },
  importClassification: {
    autoDetectDuplicates: true,
    createPendingTransactions: true,
    autoApplyRules: true,
    aiSuggestions: false, // v0.4+
    aiConfidenceThreshold: 70,
    autoSaveTemplates: true,
    skipInvalidLines: true,
  },
  budgetAlerts: {
    enabled: true,
    alert80: true,
    alert100: true,
    alert120: true,
    calculationMethod: 'cash',
    considerTransfers: false,
    autoProjection: true,
    projectionMethod: 'avg3months',
    resetMonthly: true,
  },
  aiCosts: {
    apiKey: '',
    enabled: false,
    defaultModel: 'gpt-4o-mini',
    monthlyCostLimit: 10, // USD
    allowOverride: false,
    strategy: 'balanced',
    cachePrompts: true,
    batchProcessing: true,
    batchSize: 25,
    confidenceThreshold: 0.7, // 70%
    autoApplyOnImport: false,
  },
  performance: {
    cache: true,
    cacheTTL: 5, // minutes
    lazyLoading: true,
    pagination: 50,
    chartAnimations: true,
    preloadDashboards: true,
    autoClearCache: true,
    cacheClearFrequency: 'daily',
  },
  advanced: {
    devMode: false,
    logLevel: 'info',
    experiments: {},
  },
};

/**
 * Settings categories metadata
 */
export const SETTINGS_CATEGORIES: Array<{
  key: SettingsCategory;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    key: 'appearance',
    label: 'Aparência',
    description: 'Tema, densidade e tipografia',
    icon: 'Palette',
  },
  {
    key: 'localization',
    label: 'Localização',
    description: 'Idioma, moeda e formatos',
    icon: 'Globe',
  },
  {
    key: 'dataPrivacy',
    label: 'Dados e Privacidade',
    description: 'Backup, storage e telemetria',
    icon: 'Shield',
  },
  {
    key: 'importClassification',
    label: 'Importação',
    description: 'Duplicatas, regras e templates',
    icon: 'Upload',
  },
  {
    key: 'budgetAlerts',
    label: 'Orçamento',
    description: 'Alertas e projeções',
    icon: 'DollarSign',
  },
  {
    key: 'aiCosts',
    label: 'IA e Custos',
    description: 'OpenAI, modelos e limites',
    icon: 'Brain',
  },
  {
    key: 'performance',
    label: 'Performance',
    description: 'Cache, paginação e otimizações',
    icon: 'Zap',
  },
  {
    key: 'advanced',
    label: 'Avançado',
    description: 'Modo dev, logs e experimentos',
    icon: 'Settings',
  },
];
