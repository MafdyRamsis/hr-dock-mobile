import { I18nManager } from 'react-native'

// Screen-reader names for icon-only buttons (the app reloads on a language
// change, so the layout direction tells us the language).
export const closeLabel = I18nManager.isRTL ? 'إغلاق' : 'Close'
