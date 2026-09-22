import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/* ── HR Dock brand system ──
   Vibrant, friendly glassmorphism palette. Each brand color ships as a
   gradient pair [start, end] plus a flat "solid" for text/icons/borders. */
export const GRADIENTS = {
  coral:    ['#FF8A75', '#FF6B6B'],
  mint:     ['#54E3C4', '#2ED573'],
  sunshine: ['#FFD32A', '#FFA801'],
  lavender: ['#A55EEA', '#8854D0'],
  navy:     ['#2A2E45', '#12121C'],
}

export const BRAND = {
  coral:    '#FF6B6B',
  mint:     '#2ED573',
  sunshine: '#FFA801',
  lavender: '#8854D0',
}

export const RADIUS = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 }

export const LIGHT = {
  bg:       '#F8F9FD',
  card:     '#ffffff',
  cardAlt:  '#F1F3FA',
  text:     '#1A1B2E',
  text2:    '#2E3142',
  sub:      '#8A8DA3',
  muted:    '#B0B3C6',
  border:   '#EEF0F8',
  border2:  '#E3E6F3',
  input:    '#F5F6FC',
  tabBar:   '#ffffff',
  glass:       'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.6)',
  glassTint:   'light',
  ...BRAND,
  isDark:   false,
}

export const DARK = {
  bg:       '#12121C',
  card:     '#1D1E2C',
  cardAlt:  '#181924',
  text:     '#F5F6FA',
  text2:    '#E7E8F2',
  sub:      '#9497AE',
  muted:    '#6C6F87',
  border:   '#262838',
  border2:  '#2E3145',
  input:    '#20212F',
  tabBar:   '#1A1B28',
  glass:       'rgba(29,30,44,0.72)',
  glassBorder: 'rgba(255,255,255,0.08)',
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
