'use client'

/**
 * useProductLogo
 *
 * Returns the correct JobMaster product image path based on the active
 * primary color and light/dark mode — mirroring the mobile app's theme-switching logic.
 *
 * Logo mapping (per design decision):
 *   Warm colors (Mocha, Amber)       → brown logo   Logo_Brown_510x325.png
 *   Cool/vibrant (Teal, Rose, Sky)   → teal logo    Logo_Teal_510x350.png
 *   Neutral/other (Violet, unknown)  → black logo   Logo_Black_510x290.png
 */

import { useColorScheme } from '@mui/material/styles'
import { useSettings } from '@core/hooks/useSettings'

// Primary color hex values that map to each logo (from primaryColorConfig.ts)
const WARM_COLORS  = ['#A47148', '#FFAB1D'] // Mocha, Amber
const COOL_COLORS  = ['#0D9394', '#EB3D63', '#2092EC'] // Teal, Rose, Sky

export function useProductLogo(): string {
  const { settings } = useSettings()
  const { mode, systemMode } = useColorScheme()

  const primaryColor: string = (settings as any).primaryColor ?? '#A47148'
  const resolvedMode = mode === 'system' ? systemMode : mode
  const isDark = resolvedMode === 'dark'

  // Color family detection (case-insensitive hex comparison)
  const hex = primaryColor.toUpperCase()
  const isWarm = WARM_COLORS.some(c => c.toUpperCase() === hex)
  const isCool = COOL_COLORS.some(c => c.toUpperCase() === hex)

  if (isWarm) return '/Logo_Brown_510x325.png'  // mocha/brown logo
  if (isCool) return '/Logo_Teal_510x350.png'   // teal logo
  return '/Logo_Black_510x290.png'               // black logo for violet / dark / others
}
