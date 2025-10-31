/**
 * Settings Validation Schemas
 * Agent IMPORT: Owner
 *
 * Validação Zod para todas as configurações
 */

import { z } from 'zod';

// ============================================================================
// Schema por Categoria
// ============================================================================

export const appearanceSettingsSchema = z.object({
  theme: z.enum(['auto', 'dark', 'light']),
  density: z.enum(['compact', 'comfortable', 'spacious']),
  fontSize: z.enum([90, 100, 110, 120]),
  pixelArtMode: z.boolean(),
});

export const localizationSettingsSchema = z.object({
  language: z.enum(['pt-BR', 'en-US', 'es']),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  timeFormat: z.enum(['24h', '12h']),
  currency: z.enum(['BRL', 'USD', 'EUR', 'GBP']),
  decimalSeparator: z.enum([',', '.']),
  firstDayOfWeek: z.union([z.literal(0), z.literal(1)]),
  hideDecimals: z.boolean(),
});

export const dataPrivacySettingsSchema = z.object({
  autoBackup: z.boolean(),
  backupFrequency: z.enum(['daily', 'weekly', 'monthly']),
  backupTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:mm'),
  backupRetention: z.number().int().min(1).max(90),
  telemetry: z.boolean(),
  encryption: z.boolean(),
});

export const importClassificationSettingsSchema = z.object({
  autoDetectDuplicates: z.boolean(),
  createPendingTransactions: z.boolean(),
  autoApplyRules: z.boolean(),
  aiSuggestions: z.boolean(),
  aiConfidenceThreshold: z.number().min(0).max(100),
  autoSaveTemplates: z.boolean(),
  skipInvalidLines: z.boolean(),
});

export const budgetAlertsSettingsSchema = z.object({
  enabled: z.boolean(),
  alert80: z.boolean(),
  alert100: z.boolean(),
  alert120: z.boolean(),
  calculationMethod: z.enum(['cash', 'accrual']),
  considerTransfers: z.boolean(),
  autoProjection: z.boolean(),
  projectionMethod: z.enum(['avg3months', 'avg6months', 'lastMonth', 'manual']),
  resetMonthly: z.boolean(),
});

export const aiCostsSettingsSchema = z.object({
  apiKey: z.string(),
  enabled: z.boolean(),
  defaultModel: z.enum(['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo']),
  monthlyCostLimit: z.number().min(0).max(1000),
  allowOverride: z.boolean(),
  strategy: z.enum(['aggressive', 'balanced', 'quality']),
  cachePrompts: z.boolean(),
  batchProcessing: z.boolean(),
  batchSize: z.enum([10, 25, 50, 100]),
});

export const performanceSettingsSchema = z.object({
  cache: z.boolean(),
  cacheTTL: z.number().int().min(1).max(60),
  lazyLoading: z.boolean(),
  pagination: z.enum([25, 50, 100, 200]),
  chartAnimations: z.boolean(),
  preloadDashboards: z.boolean(),
  autoClearCache: z.boolean(),
  cacheClearFrequency: z.enum(['on_close', 'daily', 'weekly']),
});

export const advancedSettingsSchema = z.object({
  devMode: z.boolean(),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']),
  experiments: z.record(z.string(), z.boolean()),
});

// ============================================================================
// Schema Completo
// ============================================================================

export const settingsSchema = z.object({
  appearance: appearanceSettingsSchema,
  localization: localizationSettingsSchema,
  dataPrivacy: dataPrivacySettingsSchema,
  importClassification: importClassificationSettingsSchema,
  budgetAlerts: budgetAlertsSettingsSchema,
  aiCosts: aiCostsSettingsSchema,
  performance: performanceSettingsSchema,
  advanced: advancedSettingsSchema,
});

// ============================================================================
// Validators
// ============================================================================

/**
 * Valida settings completo
 */
export function validateSettings(data: unknown): {
  success: boolean;
  data?: any;
  errors?: Array<{ path: string; message: string }>;
} {
  const result = settingsSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  return { success: false, errors };
}

/**
 * Valida categoria específica
 */
export function validateSettingsCategory(
  category: string,
  data: unknown
): {
  success: boolean;
  data?: any;
  errors?: Array<{ path: string; message: string }>;
} {
  const schemas: Record<string, z.ZodSchema> = {
    appearance: appearanceSettingsSchema,
    localization: localizationSettingsSchema,
    dataPrivacy: dataPrivacySettingsSchema,
    importClassification: importClassificationSettingsSchema,
    budgetAlerts: budgetAlertsSettingsSchema,
    aiCosts: aiCostsSettingsSchema,
    performance: performanceSettingsSchema,
    advanced: advancedSettingsSchema,
  };

  const schema = schemas[category];
  if (!schema) {
    return {
      success: false,
      errors: [{ path: category, message: 'Categoria inválida' }],
    };
  }

  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map((err) => ({
    path: `${category}.${err.path.join('.')}`,
    message: err.message,
  }));

  return { success: false, errors };
}

/**
 * Valida valor individual
 */
export function validateSettingValue(
  path: string,
  value: unknown
): {
  success: boolean;
  data?: any;
  error?: string;
} {
  const [category, ...keyParts] = path.split('.');
  const key = keyParts.join('.');

  const schemas: Record<string, z.ZodSchema> = {
    appearance: appearanceSettingsSchema,
    localization: localizationSettingsSchema,
    dataPrivacy: dataPrivacySettingsSchema,
    importClassification: importClassificationSettingsSchema,
    budgetAlerts: budgetAlertsSettingsSchema,
    aiCosts: aiCostsSettingsSchema,
    performance: performanceSettingsSchema,
    advanced: advancedSettingsSchema,
  };

  const categorySchema = schemas[category];
  if (!categorySchema) {
    return { success: false, error: 'Categoria inválida' };
  }

  // Valida criando objeto com apenas esse campo
  const testObject: any = {};
  let current = testObject;
  const keys = key.split('.');

  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;

  const result = categorySchema.partial().safeParse(testObject);

  if (result.success) {
    return { success: true, data: value };
  }

  return {
    success: false,
    error: result.error.errors[0]?.message || 'Valor inválido',
  };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isValidTheme(value: unknown): value is 'auto' | 'dark' | 'light' {
  return typeof value === 'string' && ['auto', 'dark', 'light'].includes(value);
}

export function isValidDensity(
  value: unknown
): value is 'compact' | 'comfortable' | 'spacious' {
  return typeof value === 'string' && ['compact', 'comfortable', 'spacious'].includes(value);
}

export function isValidDateFormat(
  value: unknown
): value is 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' {
  return typeof value === 'string' && ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(value);
}

export function isValidDecimalSeparator(value: unknown): value is ',' | '.' {
  return typeof value === 'string' && [',', '.'].includes(value);
}
