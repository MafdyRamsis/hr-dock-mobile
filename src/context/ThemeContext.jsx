import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/* ── HR Dock brand system — matched to the real web app (app.hr-dock.com) ──
   Crisp white / light-slate surfaces, bold near-black headlines, and the
   web app's signature indigo → blue → cyan gradient reserved for primary
   actions only (the Sign In button, active tab, key highlights) — never
   smeared across the whole screen. Same keys as before
   (coral/mint/sunshine/lavender/navy) so every screen that already
   references GRADIENTS.<key> or BRAND.<key> re-themes automatically. */
export const GRADIENTS = {
  coral:    ['#4F46E5', '#3B82F6', '#06B6D4'],  // indigo → blue → cyan — PRIMARY (exact web app CTA gradient)
  mint:     ['#34D399', '#059669'],             // emerald — positive / success
  sunshine: ['#FBBF24', '#D97706'],             // amber — attention / streaks
  lavender: ['#818CF8', '#6366F1'],             // lighter indigo tint — tertiary
  navy:     ['#1E293B', '#0F172A'],             // slate — hero card backdrops
}

export const BRAND = {
  coral:    '#4F46E5',   // indigo-600 — matches the web app's accent-pill text color exactly
  mint:     '#059669',
  sunshine: '#D97706',
  lavender: '#6366F1',
}

// Kept for compatibility with anything that still imports it.
export const GLOW = {
  violet:  '#4F46E5',
  cyan:    '#06B6D4',
  amber:   '#D97706',
  magenta: '#6366F1',
}

export const RADIUS = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 }

export const LIGHT = {
  bg:       '#F5F7FB',
  card:     '#FFFFFF',
  cardAlt:  '#EEF0F7',
  text:     '#0F1829',
  text2:    '#1E293B',
  sub:      '#64748B',
  muted:    '#94A3B8',
  border:   '#E2E8F0',
  border2:  '#DBE3EF',
  input:    '#FFFFFF',
  tabBar:   '#FFFFFF',
  glass:       'rgba(255,255,255,0.85)',
  glassBorder: 'rgba(15,24,41,0.08)',
  glassTint:   'light',
  ...BRAND,
  isDark:   false,
}

export const DARK = {
  bg:       '#0B1120',
  card:     '#0F172A',
  cardAlt:  '#1E293B',
  text:     '#F1F5F9',
  text2:    '#E2E8F0',
  sub:      '#94A3B8',
  muted:    '#64748B',
  border:   '#1E293B',
  border2:  '#334155',
  input:    '#111827',
  tabBar:   '#0F172A',
  glass:       'rgba(15,23,42,0.85)',
  glassBorder: 'rgba(99,102,241,0.16)',
  glassTint:   'dark',
  ...BRAND,
  isDark:   true,
}

const ThemeContext = createContext({ colors: LIGHT, isDark: false, toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme()
  const [override, setOverride] = useState(null) // null = follow system, 'light' | 'dark' = manual

  useEffect(() => {
    SecureStore.getItemAsync('theme_override').then(v => {
      if (v === 'light' || v === 'dark') setOverride(v)
    })
  }, [])

  // Both themes are built to the same standard, so we simply follow the
  // phone's system setting unless the user has manually overridden it
  // (remembered in SecureStore).
  const isDark = override ? override === 'dark' : systemScheme === 'dark'
  const colors = isDark ? DARK : LIGHT

  const toggleTheme = async () => {
    const next = isDark ? 'light' : 'dark'
    setOverride(next)
    await SecureStore.setItemAsync('theme_override', next)
  }

  const value = useMemo(() => ({ colors, isDark, toggleTheme }), [isDark])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
