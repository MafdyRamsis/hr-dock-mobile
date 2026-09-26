import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/context/ThemeContext'
import api from '../src/services/api'
import { useLang } from '../src/context/LanguageContext'
import { ls, back, chevron, IS_RTL } from '../src/utils/rtl'

// "previous" chevron points against reading order
const prevChevron = IS_RTL ? '›' : '‹'

const TYPE_CONFIG = {
  public:    { label: tr => tr('Public Holiday', 'إجازة رسمية'),                 color: '#E8583C', bg: '#fef2f2' },
  company:   { label: tr => tr('Company Event',  'مناسبة الشركة', 'مناسبة للشركة'), color: '#2BC4BE', bg: '#f0fdfc' },
  national:  { label: tr => tr('National Day',   'عيد قومي'),                    color: '#3b82f6', bg: '#eff6ff' },
  religious: { label: tr => tr('Religious',      'مناسبة دينية'),                color: '#f59e0b', bg: '#fffbeb' },
}
const getType = (t, tr) => {
  const c = TYPE_CONFIG[t]
  return c ? { ...c, label: c.label(tr) } : { label: t || tr('Holiday', 'إجازة رسمية'), color: '#64748b', bg: '#f1f5f9' }
}

// Arabic counted nouns: 1 / 2 / 3–10 / 11+
const arDays = n => (n === 1 ? 'يوم' : n === 2 ? 'يومين' : n <= 10 ? `${n} أيام` : `${n} يوم`)
const arHolidaysF = n => (n === 0 ? 'مفيش إجازات' : n === 1 ? 'إجازة واحدة' : n === 2 ? 'إجازتين' : n <= 10 ? `${n} إجازات` : `${n} إجازة`)

const toDateStr = d => d ? d.split('T')[0] : ''

export default function HolidaysScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { tr, date: fmtD, month, day: dayName } = useLang()

  const now = new Date()
  const [year,       setYear]       = useState(now.getFullYear())
  const [viewMonth,  setViewMonth]  = useState(now.getMonth())
  const [holidays,   setHolidays]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (y) => {
    try {
      const r = await api.get(`/holidays?year=${y}&limit=200`)
      const raw = r.data.data || []
      setHolidays(Array.isArray(raw) ? raw : (raw?.rows || []))
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load(year) }, [year])

  const prevYear = () => setYear(y => { const n = y - 1; load(n); return n })
  const nextYear = () => {
    if (year >= now.getFullYear() + 2) return
    setYear(y => { const n = y + 1; load(n); return n })
  }

  // Map: "YYYY-MM-DD" → holiday
  const holidayMap = useMemo(() => {
    const m = {}
    holidays.forEach(h => { if (h.date) m[toDateStr(h.date)] = h })
    return m
  }, [holidays])

  // Holidays in current view month
  const monthHolidays = useMemo(() =>
    holidays.filter(h => {
      const d = toDateStr(h.date)
      return d.startsWith(`${year}-${String(viewMonth + 1).padStart(2, '0')}`)
    }).sort((a, b) => a.date.localeCompare(b.date))
  , [holidays, year, viewMonth])

  // Next upcoming holiday from today
  const todayStr = now.toISOString().split('T')[0]
  const upcoming = holidays
    .filter(h => toDateStr(h.date) >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  // Calendar cells
  const firstDay    = new Date(year, viewMonth, 1).getDay()
  const daysInMonth = new Date(year, viewMonth + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => {
    if (viewMonth === 0) setViewMonth(11)
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) setViewMonth(0)
    else setViewMonth(m => m + 1)
  }

  const fmtDate = iso => (iso ? fmtD(toDateStr(iso)) : '')
  const monthLabel = month(viewMonth)

  const yearHolidayCount = holidays.length

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Nav */}
      <View style={[s.navBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backArrow, { color: colors.text }]}>{back}</Text>
          <Text style={[s.backText,  { color: colors.text }]}>{tr('Back', 'رجوع')}</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.text }]}>{tr('Holiday Calendar', 'تقويم الإجازات الرسمية', 'الإجازات الرسمية')}</Text>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#2BC4BE" size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(year) }} tintColor="#2BC4BE" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Year hero */}
          <View style={s.hero}>
            <View style={s.yearNav}>
              <TouchableOpacity onPress={prevYear} style={s.yearBtn} accessibilityLabel={tr('Previous year', 'السنة السابقة', 'السنة اللي فاتت')}>
                <Text style={s.yearArrow}>{prevChevron}</Text>
              </TouchableOpacity>
              <View style={s.yearCenter}>
                <Text style={s.heroYear}>{year}</Text>
                <Text style={s.heroCount}>{tr(
                  `${yearHolidayCount} holiday${yearHolidayCount !== 1 ? 's' : ''} this year`,
                  `عدد الإجازات الرسمية هذا العام: ${yearHolidayCount}`,
                  `${arHolidaysF(yearHolidayCount)} السنة دي`,
                )}</Text>
              </View>
              <TouchableOpacity onPress={nextYear} style={s.yearBtn} accessibilityLabel={tr('Next year', 'السنة التالية', 'السنة الجاية')}>
                <Text style={s.yearArrow}>{chevron}</Text>
              </TouchableOpacity>
            </View>

            {/* Type legend */}
            <View style={s.legend}>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <View key={key} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: cfg.color }]} />
                  <Text style={s.legendText}>{cfg.label(tr)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Upcoming strip */}
          {upcoming.length > 0 && (
            <View style={[s.upcomingCard, { backgroundColor: colors.card }]}>
              <Text style={[s.upcomingTitle, { color: colors.sub }]}>{tr('NEXT UP', 'الإجازات القادمة', 'اللي جاية')}</Text>
              {upcoming.map((h, i) => {
                const cfg = getType(h.type, tr)
                const daysLeft = Math.ceil((new Date(toDateStr(h.date)) - new Date(todayStr)) / 86400000)
                return (
                  <View key={h.id} style={[s.upcomingRow, i < upcoming.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <View style={[s.upcomingDot, { backgroundColor: cfg.bg }]}>
                      <Text style={[s.upcomingDotText, { color: cfg.color }]}>
                        {new Date(toDateStr(h.date)).getDate()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.upcomingName, { color: colors.text }]} numberOfLines={1}>{h.name}</Text>
                      <Text style={[s.upcomingDate, { color: colors.sub }]}>{fmtDate(h.date)}</Text>
                    </View>
                    <View style={[s.daysLeftBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[s.daysLeftText, { color: cfg.color }]}>
                        {daysLeft === 0 ? tr('Today', 'اليوم', 'النهارده') : tr(`${daysLeft}d`, `بعد ${arDays(daysLeft)}`, `فاضل ${arDays(daysLeft)}`)}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {/* Month calendar */}
          <View style={[s.calCard, { backgroundColor: colors.card }]}>
            {/* Month nav */}
            <View style={s.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={s.monthNavBtn} accessibilityLabel={tr('Previous month', 'الشهر السابق', 'الشهر اللي فات')}>
                <Text style={[s.monthNavArrow, { color: colors.sub }]}>{prevChevron}</Text>
              </TouchableOpacity>
              <Text style={[s.monthTitle, { color: colors.text }]}>{monthLabel}</Text>
              <TouchableOpacity onPress={nextMonth} style={s.monthNavBtn} accessibilityLabel={tr('Next month', 'الشهر التالي', 'الشهر اللي جاي')}>
                <Text style={[s.monthNavArrow, { color: colors.sub }]}>{chevron}</Text>
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={s.dayHeaders}>
              {[0, 1, 2, 3, 4, 5, 6].map(i => {
                // Arabic short names are full words: drop the leading "ال" and shrink to fit the cell
                const d = dayName(i, true)
                return (
                  <Text key={i} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
                    style={[s.dayLabel, IS_RTL && s.dayLabelAr]}>{IS_RTL ? d.replace(/^ال/, '') : d}</Text>
                )
              })}
            </View>

            {/* Grid */}
            <View style={s.grid}>
              {cells.map((day, i) => {
                if (!day) return <View key={`e${i}`} style={s.cell} />
                const iso = `${year}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const holiday = holidayMap[iso]
                const isToday = iso === todayStr
                const isWeekend = [0, 6].includes(new Date(iso).getDay())
                const cfg = holiday ? getType(holiday.type) : null

                return (
                  <View key={iso} style={s.cell}>
                    <View style={[
                      s.dayCircle,
                      isToday && s.todayCircle,
                      holiday && !isToday && { backgroundColor: cfg.bg },
                    ]}>
                      <Text style={[
                        s.dayNum,
                        { color: colors.text2 },
                        isToday && s.todayNum,
                        isWeekend && !isToday && !holiday && { color: colors.muted },
                        holiday && !isToday && { color: cfg.color, fontWeight: '800' },
                      ]}>{day}</Text>
                    </View>
                    {holiday ? (
                      <View style={[s.dot, { backgroundColor: cfg.color }]} />
                    ) : (
                      <View style={s.dotEmpty} />
                    )}
                  </View>
                )
              })}
            </View>
          </View>

          {/* This month's holidays */}
          <Text style={[s.sectionTitle, { color: colors.sub }]}>{tr(`${monthLabel} Holidays`, `الإجازات الرسمية في ${monthLabel}`, `إجازات ${monthLabel}`)}</Text>
          {monthHolidays.length === 0 ? (
            <View style={[s.emptyBox, { backgroundColor: colors.card }]}>
              <Text style={s.emptyIcon}>🎉</Text>
              <Text style={[s.emptyText, { color: colors.sub }]}>{tr(`No holidays in ${monthLabel}`, `لا توجد إجازات رسمية في ${monthLabel}`, `مفيش إجازات في ${monthLabel}`)}</Text>
            </View>
          ) : (
            monthHolidays.map((h, i) => {
              const cfg  = getType(h.type, tr)
              const date = new Date(toDateStr(h.date))
              return (
                <View key={h.id} style={[s.holidayCard, { backgroundColor: colors.card }]}>
                  <View style={[s.holidayLeft, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.holidayDay, { color: cfg.color }]}>{date.getDate()}</Text>
                    <Text style={[s.holidayWeekday, { color: cfg.color }]}>
                      {dayName(date.getDay(), true)}
                    </Text>
                  </View>
                  <View style={s.holidayBody}>
                    <Text style={[s.holidayName, { color: colors.text }]} numberOfLines={1}>{h.name}</Text>
                    {h.description ? (
                      <Text style={[s.holidayDesc, { color: colors.sub }]} numberOfLines={2}>{h.description}</Text>
                    ) : null}
                    <View style={[s.typeBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[s.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  {h.recurring && (
                    <Text style={s.recurringIcon}>🔁</Text>
                  )}
                </View>
              )
            })
          )}

          {/* Full year list */}
          {holidays.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.sub, marginTop: 8 }]}>{tr(`All ${year} Holidays`, `جميع إجازات ${year}`, `كل إجازات ${year}`)}</Text>
              {holidays.map(h => {
                const cfg  = getType(h.type, tr)
                const isPast = toDateStr(h.date) < todayStr
                return (
                  <View key={h.id} style={[s.listRow, { backgroundColor: colors.card }, isPast && { opacity: 0.5 }]}>
                    <View style={[s.listDot, { backgroundColor: cfg.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.listName, { color: colors.text2 }]} numberOfLines={1}>{h.name}</Text>
                      <Text style={[s.listDate, { color: colors.sub }]}>
                        {fmtD(toDateStr(h.date), { weekday: 'long', month: 'long', year: false })}
                      </Text>
                    </View>
                    <View style={[s.listBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[s.listBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                )
              })}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:           { flex: 1 },
  navBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backArrow:      { fontSize: 20, fontWeight: '600' },
  backText:       { fontSize: 15, fontWeight: '600' },
  navTitle:       { fontSize: 16, fontWeight: '800' },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:         { padding: 16, paddingBottom: 40 },

  // Hero
  hero:           { backgroundColor: '#0F1829', borderRadius: 20, padding: 20, marginBottom: 14 },
  yearNav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  yearBtn:        { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  yearArrow:      { fontSize: 28, color: 'rgba(255,255,255,0.6)', fontWeight: '300' },
  yearCenter:     { alignItems: 'center' },
  heroYear:       { color: 'white', fontSize: 36, fontWeight: '900', letterSpacing: ls(1) },
  heroCount:      { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 },
  legend:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendText:     { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' },

  // Upcoming
  upcomingCard:   { borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  upcomingTitle:  { fontSize: 10, fontWeight: '800', letterSpacing: ls(0.8), marginBottom: 12 },
  upcomingRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  upcomingDot:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  upcomingDotText:{ fontSize: 16, fontWeight: '900' },
  upcomingName:   { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  upcomingDate:   { fontSize: 11 },
  daysLeftBadge:  { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  daysLeftText:   { fontSize: 11, fontWeight: '800' },

  // Calendar
  calCard:        { borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  monthNav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthNavBtn:    { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  monthNavArrow:  { fontSize: 24, fontWeight: '300' },
  monthTitle:     { fontSize: 16, fontWeight: '800' },
  dayHeaders:     { flexDirection: 'row', marginBottom: 6 },
  dayLabel:       { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  dayLabelAr:     { fontSize: 9, fontWeight: '600' },
  grid:           { flexDirection: 'row', flexWrap: 'wrap' },
  cell:           { width: '14.28%', alignItems: 'center', marginBottom: 6 },
  dayCircle:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  todayCircle:    { backgroundColor: '#0F1829' },
  dayNum:         { fontSize: 13, fontWeight: '600' },
  todayNum:       { color: 'white', fontWeight: '800' },
  dot:            { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  dotEmpty:       { width: 5, height: 5, marginTop: 1 },

  // Month holiday cards
  sectionTitle:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: ls(0.5), marginBottom: 10 },
  emptyBox:       { borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 8 },
  emptyIcon:      { fontSize: 32, marginBottom: 8 },
  emptyText:      { fontSize: 13 },
  holidayCard:    { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  holidayLeft:    { width: 60, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  holidayDay:     { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  holidayWeekday: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: ls(0.3) },
  holidayBody:    { flex: 1, padding: 14 },
  holidayName:    { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  holidayDesc:    { fontSize: 12, lineHeight: 17, marginBottom: 6 },
  typeBadge:      { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText:  { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  recurringIcon:  { fontSize: 14, paddingRight: 14 },

  // Full year list
  listRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12, marginBottom: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  listDot:        { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  listName:       { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  listDate:       { fontSize: 11 },
  listBadge:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  listBadgeText:  { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
})
