import { fmtDate, fmtMonthYear, fmtTime } from '../format'
import { AR, AR_FRIENDLY, EN } from '../strings'

describe('format', () => {
  it('formats dates in both languages with Western digits', () => {
    expect(fmtDate('2026-09-26T10:00:00', 'en')).toBe('26 Sep 2026')
    expect(fmtDate('2026-09-26T10:00:00', 'ar')).toBe('26 سبتمبر 2026')
    expect(fmtDate('2026-09-26T10:00:00', 'ar', { weekday: 'long', year: false, month: 'long' })).toBe('السبت، 26 سبتمبر')
    expect(fmtMonthYear(0, 2027, 'ar')).toBe('يناير 2027')
    expect(fmtTime('2026-09-26T09:05:00')).toBe('09:05')
  })
  it('every English string has an Arabic version', () => {
    expect(Object.keys(EN).filter(k => !AR[k])).toEqual([])
    expect(Object.keys(AR_FRIENDLY).filter(k => !EN[k])).toEqual([])
  })
})
