import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/* ── HR Dock "Command Center" brand system ──
   Deep-space navy base with an electric violet / cyan / amber / magenta
   accent system — glowing gradients over near-black, sharp and premium
   rather than soft/pastel. Each brand color ships as a gradient pair
   [start, end] plus a flat "solid" for text/icons/borders. Same keys as
   before (coral/mint/sunshine/lavender/navy) so every screen that already
   references GRADIENTS.<key> re-themes automatically. */
export const GRADIENTS = {
  coral:    ['#8B7CFF', '#5B3DF5'],   // electric indigo-violet — primary
  mint:     ['#33E9D6', '#06B6D4'],   // neon cyan — positive / data
  sunshine: ['#FFD166', '#FF9F1C'],   // neon amber — pending / attention
  lavender: ['#FF7FE0', '#C026D3'],   // neon magenta — tertiary / social
  navy:     ['#1C2237', '#05060B'],   // deep space — hero card backdrops
}

export const BRAND = {
  coral:    '#7C6CFF',
  mint:     '#22D3D8',
  sunshine: '#FFB020',
  lavender: '#E248E8',
}

// Signature glow colors — used for shadowColor / border accents that need
// to "emit light" against the dark backdrop rather than sit flat.
export const GLOW = {
  violet: '#7C6CFF',
  cyan:   '#22D3EE',
  amber:  '#FFB020',
  magenta:'#E248E8',
}

export const RADIUS = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 }

export const LIGHT = {
  bg:       '#F5F6FB',
  card:     '#ffffff',
  cardAlt:  '#EFF0F9',
  text:     '#12141F',
  text2:    '#242739',
  sub:      '#6B7086',
  muted:    '#A6AABD',
  border:   '#EAEBF4',
  border2:  '#DEE0EE',
  input:    '#F1F2FA',
  tabBar:   '#ffffff',
  glass:       'rgba(255,255,255,0.78)',
  glassBorder: 'rgba(18,20,31,0.07)',
  glassTint:   'light',
  ...BRAND,
  isDark:   false,
}

export const DARK = {
  bg:       '#090A11',
  card:     '#12141F',
  cardAlt:  '#0D0F17',
  text:     '#F5F6FC',
  text2:    '#E7E8F5',
  sub:      '#9195B5',
  muted:    '#5B5F7D',
  border:   '#1D2033',
  border2:  '#262A42',
  input:    '#151827',
  tabBar:   '#0C0E17',
  glass:       'rgba(18,20,31,0.78)',
  glassBorder: 'rgba(140,124,255,0.14)',
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

  // "Command Center" dark is the flagship look — default to it regardless
  // of the phone's system theme (a user can still flip to light and it's
  // remembered), rather than only showing it to system-dark users.
  const isDark = override ? override === 'dark' : true
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
