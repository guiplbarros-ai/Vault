'use client'
import { useAppearanceSettings } from '@/app/providers/settings-provider'

export function ThemeInitializer() {
  useAppearanceSettings()
  return null
}
