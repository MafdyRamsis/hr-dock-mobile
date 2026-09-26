// Date / number formatting that follows the app language.
// Digits stay 0-9 in both languages (same as the web app).
export const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
export const DAYS_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
export const DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']

export const monthName = (i, lang = 'en', short = false) => {
  if (lang === 'ar') return MONTHS_AR[i] ?? ''
  const m = MONTHS_EN[i] ?? ''
  return short ? m.slice(0, 3) : m
}
export const dayName = (i, lang = 'en', short = false) => {
  if (lang === 'ar') return DAYS_AR[i] ?? ''
  const d = DAYS_EN[i] ?? ''
  return short ? d.slice(0, 3) : d
}

const toDate = v => (v instanceof Date ? v : new Date(v))

/**
 * fmtDate(value, lang, { weekday, day, month, year })
 *   month: 'long' | 'short' (default 'short'); weekday: 'long' | 'short'; day/year: true to include
 * e.g. fmtDate('2026-09-26', 'ar') → "26 سبتمبر 2026", fmtDate(.., 'en') → "26 Sep 2026"
 */
export function fmtDate(value, lang = 'en', opts = {}) {
  if (!value) return ''
  const d = toDate(value)
  if (isNaN(d)) return String(value)
  const { weekday, day = true, month = 'short', year = true } = opts
  const parts = []
  if (weekday) parts.push(dayName(d.getDay(), lang, weekday === 'short') + (lang === 'ar' ? '،' : ','))
  if (day) parts.push(String(d.getDate()))
  if (month) parts.push(monthName(d.getMonth(), lang, month === 'short'))
  if (year) parts.push(String(d.getFullYear()))
  return parts.join(' ')
}

/** "September 2026" / "سبتمبر 2026" */
export const fmtMonthYear = (monthIndex, year, lang = 'en', short = false) => `${monthName(monthIndex, lang, short)} ${year}`

/** 24h "09:05" — same in both languages */
export function fmtTime(value) {
  if (!value) return '—'
  const d = toDate(value)
  if (isNaN(d)) return String(value).slice(0, 5)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Money: "12,500" / with 2 decimals when asked. Currency word follows the language. */
export const fmtNum = (n, decimals = 0) =>
  n == null || n === '' || isNaN(Number(n)) ? '—'
    : Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: Math.max(decimals, 2) })
export const currency = lang => (lang === 'ar' ? 'ج.م' : 'EGP')
