"use client";

/**
 * Theme Initializer Component
 * Agent IMPORT: Owner
 *
 * Aplica configurações de aparência assim que a aplicação carrega
 */

import { useEffect } from 'react';
import { useAppearanceSettings } from '@/app/providers/settings-provider';

export function ThemeInitializer() {
  useAppearanceSettings();
  return null;
}
