import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'

export const LIGHT = {
  bg:       '#F0F4FA',
  card:     '#ffffff',
  cardAlt:  '#f8fafc',
  text:     '#0F1829',
  text2:    '#1e293b',
  sub:      '#64748b',
  muted:    '#94a3b8',
  border:   '#f1f5f9',
  border2:  '#e2e8f0',
  input:    '#fafafa',
  tabBar:   '#0F1829',
  isDark:   false,
}

export const DARK = {
  bg:       '#0d1421',
  card:     '#1a2540',
  cardAlt:  '#131f33',
  text:     '#f1f5f9',
  text2:    '#e2e8f0',
  sub:      '#94a3b8',
  muted:    '#64748b',
  border:   '#1e2d42',
  border2:  '#243351',
  input:    '#0d1827',
  tabBar:   '#080f1c',
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
