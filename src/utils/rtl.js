import { I18nManager } from 'react-native'

// Layout direction is fixed for the life of the app (switching language reloads it),
// so these can be used inside StyleSheet.create at module load.
export const IS_RTL = I18nManager.isRTL

// Letter spacing tears Arabic letters apart (they must join), so it is dropped in Arabic.
export const ls = n => (IS_RTL ? 0 : n)

// Arrows and chevrons that point "forward" in reading order.
export const fwd = IS_RTL ? '←' : '→'
export const back = IS_RTL ? '→' : '←'
export const chevron = IS_RTL ? '‹' : '›'
export const backChevron = IS_RTL ? '›' : '‹'
