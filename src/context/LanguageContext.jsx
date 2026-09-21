import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { I18nManager } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { EN, AR } from '../i18n/strings'

const DICT = { en: EN, ar: AR }

// Default value keeps components (and tests) working without a provider.
const LanguageContext = createContext({
  lang: 'en',
  isRTL: false,
  t: (key) => EN[key] ?? key,
  setLanguage: async () => {},
})

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(I18nManager.isRTL ? 'ar' : 'en')

  // Restore the saved language; make sure the native layout direction matches it.
  useEffect(() => {
    SecureStore.getItemAsync('app_language').then(saved => {
      if (saved !== 'en' && saved !== 'ar') return
      setLang(saved)
      const wantRTL = saved === 'ar'
      if (I18nManager.isRTL !== wantRTL) {
        I18nManager.allowRTL(wantRTL)
        I18nManager.forceRTL(wantRTL)
        reload()
      }
    }).catch(() => {})
  }, [])

  const setLanguage = useCallback(async (next) => {
    if (next !== 'en' && next !== 'ar') return
    await SecureStore.setItemAsync('app_language', next)
    setLang(next)
    const wantRTL = next === 'ar'
    if (I18nManager.isRTL !== wantRTL) {
      I18nManager.allowRTL(wantRTL)
      I18nManager.forceRTL(wantRTL)
      reload() // layout direction only fully applies after a reload
    }
  }, [])

  const value = useMemo(() => ({
    lang,
    isRTL: lang === 'ar',
    t: (key) => DICT[lang]?.[key] ?? EN[key] ?? key,
    setLanguage,
  }), [lang, setLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

async function reload() {
  try {
    const Updates = await import('expo-updates')
    await Updates.reloadAsync()
  } catch {
    // Not available (e.g. Expo Go / dev) — the change applies on next launch.
  }
}

export const useLang = () => useContext(LanguageContext)
