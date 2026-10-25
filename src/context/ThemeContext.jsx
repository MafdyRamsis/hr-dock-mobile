import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/* ── HR Dock brand system — the same tokens as the web app (index.css) ──
   Navy #132940 for headlines and hero cards, teal #16A8B0 / #0E7C83 for
   primary actions and the active tab, coral #FF6955 as a rare accent, on a
   warm sand #F5F4F0 page. Fonts on the web are IBM Plex Sans Arabic and
   Readex Pro; the app uses the system font so it stays fast offline.
   Same keys as before (coral/mint/sunshine/lavender/navy) so every screen
   that references GRADIENTS.<key> or BRAND.<key> re-themes automatically:
   "coral" is the primary action colour (now teal), not the coral accent. */
export const GRADIENTS = {
  coral:    ['#16A8B0', '#0E7C83'],             // teal — PRIMARY actions
  mint:     ['#2BB673', '#0E8A55'],             // green — positive / success
  sunshine: ['#F2B441', '#C98A12'],             // amber — attention
  lavender: ['#3E5E80', '#132940'],             // navy tint — tertiary
  navy:     ['#1B3653', '#132940'],             // navy — hero cards
}

export const BRAND = {
  coral:    '#0E7C83',   // teal-deep — primary text/icon accent
  mint:     '#0E8A55',
  sunshine: '#C98A12',
  lavender: '#3E5E80',
}

// Web tokens by their own names, for new screens.
export const WEB = {
  navy: '#132940', teal: '#16A8B0', tealDeep: '#0E7C83', tealSoft: '#E6F6F7',
  coral: '#FF6955', sand: '#F5F4F0', line: '#E3E1DA', muted: '#56657A', dockMuted: '#9FB0C0',
}

// Kept for compatibility with anything that still imports it.
export const GLOW = {
  violet:  '#0E7C83',
  cyan:    '#16A8B0',
  amber:   '#C98A12',
  magenta: '#3E5E80',
}

export const RADIUS = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 }

export const LIGHT = {
  bg:       '#F5F4F0',
  card:     '#FFFFFF',
  cardAlt:  '#EFEDE7',
  text:     '#132940',
  text2:    '#1F3550',
  sub:      '#56657A',
  muted:    '#8494A6',
  border:   '#E3E1DA',
  border2:  '#D8D5CC',
  input:    '#FFFFFF',
  tabBar:   '#FFFFFF',
  primary:  '#0E7C83',
  primarySoft: '#E6F6F7',
  glass:       'rgba(255,255,255,0.92)',
  glassBorder: '#E3E1DA',
  glassTint:   'light',
  ...BRAND,
  isDark:   false,
}

export const DARK = {
  bg:       '#0C1A2A',
  card:     '#132940',
  cardAlt:  '#1B3653',
  text:     '#F2F5F8',
  text2:    '#DCE4EC',
  sub:      '#9FB0C0',
  muted:    '#71859A',
  border:   '#22405F',
  border2:  '#2C4C6E',
  input:    '#0F2236',
  tabBar:   '#132940',
  primary:  '#16A8B0',
  primarySoft: 'rgba(22,168,176,0.16)',
  glass:       'rgba(19,41,64,0.92)',
  glassBorder: '#22405F',
  glassTint:   'dark',
  ...BRAND,
  coral:    '#16A8B0',
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
