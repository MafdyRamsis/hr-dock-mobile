import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { I18nManager } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { EN, AR, AR_FRIENDLY } from '../i18n/strings'
import { fmtDate, fmtMonthYear, monthName, dayName, currency } from '../i18n/format'
import api from '../services/api'

const DICT = { en: EN, ar: AR }

/**
 * Language + Arabic tone.
 *  - t(key): dictionary strings (src/i18n/strings.js)
 *  - tr(en, ar, arFriendly?): inline strings. Companies choose how HR Dock speaks Arabic
 *    (same setting as the web app): "friendly" Egyptian (default) or "formal". When a
 *    friendly version is given it is used for friendly companies; otherwise `ar` is used.
 *  - date(...), month(...): formatting in the current language
 */
const makeValue = (lang, tone, setLanguage, refreshTone) => {
  const ar = lang === 'ar'
  return {
    lang,
    isRTL: ar,
    ar,
    tone,
    t: (key) => (ar && tone === 'friendly' && AR_FRIENDLY[key]) || DICT[lang]?.[key] || EN[key] || key,
    tr: (en, arText, arFriendly) => (ar ? ((tone === 'friendly' && arFriendly) || arText || en) : en),
    date: (v, opts) => fmtDate(v, lang, opts),
    monthYear: (m, y, short) => fmtMonthYear(m, y, lang, short),
    month: (m, short) => monthName(m, lang, short),
    day: (d, short) => dayName(d, lang, short),
    cur: currency(lang),
    setLanguage,
    refreshTone,
  }
}

// Default value keeps components (and tests) working without a provider.
const LanguageContext = createContext(makeValue('en', 'friendly', async () => {}, async () => {}))

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(I18nManager.isRTL ? 'ar' : 'en')
  const [tone, setTone] = useState('friendly')

  // Restore the saved language and tone; make sure the native layout direction matches.
  useEffect(() => {
    SecureStore.getItemAsync('app_tone').then(v => { if (v === 'formal' || v === 'friendly') setTone(v) }).catch(() => {})
    SecureStore.getItemAsync('app_language').then(saved => {
      if (saved !== 'en' && saved !== 'ar') {
        // First launch: follow the phone's language
        let locale = ''
        try { locale = Intl.DateTimeFormat().resolvedOptions().locale || '' } catch {}
        if (/^ar/i.test(locale)) saved = 'ar'
        else return
      }
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

  // The company's Arabic tone (chosen by its admin on the web). Called after sign-in.
  const refreshTone = useCallback(async () => {
    try {
      const r = await api.get('/settings/company-setting/language_tone')
      const v = r.data?.data?.value
      if (v === 'formal' || v === 'friendly') {
        setTone(v)
        await SecureStore.setItemAsync('app_tone', v)
      }
    } catch { /* keep the cached/default tone */ }
  }, [])

  const value = useMemo(() => makeValue(lang, tone, setLanguage, refreshTone), [lang, tone, setLanguage, refreshTone])
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
