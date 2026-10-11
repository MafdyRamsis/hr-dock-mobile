import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, AppState } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Location from 'expo-location'
import api from '../../src/services/api'
import { useAuth } from '../../src/context/AuthContext'
import { enqueuePunch, flushPunches, pendingPunches, isRetryable, uuidv4 } from '../../src/utils/punchQueue'
import Card from '../../src/components/Card'
import FeedItem from '../../src/components/FeedItem'
import Skeleton, { SkeletonCard, SkeletonRow } from '../../src/components/Skeleton'
import { useTheme, GRADIENTS } from '../../src/context/ThemeContext'
import { useLang } from '../../src/context/LanguageContext'
import { fmtTime } from '../../src/i18n/format'
import { ls, fwd, chevron, IS_RTL } from '../../src/utils/rtl'

// Month navigation: "previous" points against reading order
const prevChevron = IS_RTL ? '›' : '‹'

// Calendar date (YYYY-MM-DD) of a server value on this phone. A plain date
// passes through; a timestamp is read in local time — slicing the ISO string
// gave the UTC date, a day behind in Egypt between midnight and ~3 am.
const localDateOf = v => {
  if (!v) return ''
  const str = String(v)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const d = new Date(str)
  if (isNaN(d)) return str.slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const toDateStr = localDateOf

// Calendar header: short day names; Arabic names drop the leading "ال" to fit the narrow cell
const dayHeader = (day, ar, i) => { const d = day(i, true); return ar ? d.replace(/^ال/, '') : d }

const statusLabel = (st, tr) => ({
  present: tr('Present', 'حاضر'),
  late:    tr('Late', 'متأخر'),
  absent:  tr('Absent', 'غائب', 'غياب'),
  leave:   tr('Leave', 'إجازة'),
}[String(st || '').toLowerCase()] || st)

const STATUS_COLOR = {
  present: '#2ED573',
  late:    '#FFA801',
  absent:  '#FF6B6B',
  leave:   '#8854D0',
}
const STATUS_ICON = { present: '✅', late: '⏱️', absent: '❌', leave: '🏖️' }

// One day's status for the calendar dot / day card. The calendar endpoint
// returns every day (weekend, holiday, on_leave, not_yet …); a "present" day
// with late minutes is shown as late.
const dayStatus = (l) => {
  if (!l) return null
  const st = String(l.status || '').toLowerCase()
  if (st === 'on_leave') return 'leave'
  if ((st === 'present' || st === 'half_day') && Number(l.late_minutes) > 0) return 'late'
  if (st === 'present' || st === 'late' || st === 'absent') return st
  if (st === 'half_day') return 'present'
  return null
}
const pad2 = n => String(n).padStart(2, '0')
const phoneToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }

function MonthCalendar({ logs, month, year, colors, selected, onSelect }) {
  const { tr, ar, day: dayName } = useLang()
  const logMap = useMemo(() => {
    const m = {}
    logs.forEach(l => {
      const d = toDateStr(l.date || l.created_at)
      if (d) m[d] = dayStatus(l)
    })
    return m
  }, [logs])

  const today = new Date()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <View style={cal.wrap}>
      <View style={cal.dayHeaders}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <Text key={i} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
            style={[cal.dayLabel, ar && cal.dayLabelAr, { color: colors.muted }]}>{dayHeader(dayName, ar, i)}</Text>
        ))}
      </View>
      <View style={cal.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={cal.cell} />
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const status = logMap[iso]
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
          const isFuture = new Date(iso) > today
          const isWeekend = [0, 6].includes(new Date(iso).getDay())
          const dotColor = status ? STATUS_COLOR[status] : null
          const isSel = selected === iso

          return (
            <TouchableOpacity key={iso} style={cal.cell} disabled={isFuture} onPress={() => onSelect?.(iso)}
              accessibilityRole="button" accessibilityState={{ selected: isSel }}>
              {isToday ? (
                <LinearGradient colors={GRADIENTS.coral} style={cal.dayCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={[cal.dayNum, cal.todayNum]}>{day}</Text>
                </LinearGradient>
              ) : (
                <View style={[cal.dayCircle, isSel && { borderWidth: 2, borderColor: GRADIENTS.coral[0] }]}>
                  <Text style={[
                    cal.dayNum, { color: colors.text2 },
                    (isFuture || isWeekend) && { color: colors.muted },
                  ]}>{day}</Text>
                </View>
              )}
              {dotColor && !isFuture ? (
                <View style={[cal.dot, { backgroundColor: dotColor }]} />
              ) : (
                <View style={cal.dotEmpty} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={[cal.legend, { borderTopColor: colors.border }]}>
        {Object.entries(STATUS_COLOR).map(([st, c]) => (
          <View key={st} style={cal.legendItem}>
            <View style={[cal.legendDot, { backgroundColor: c }]} />
            <Text style={[cal.legendText, { color: colors.sub }]}>{statusLabel(st, tr)}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export default function AttendanceScreen() {
  const { colors } = useTheme()
  const { tr, date, monthYear } = useLang()
  const { user } = useAuth()
  const [today,      setToday]      = useState(null)
  const [employeeId, setEmployeeId] = useState(null)
  const [logs,       setLogs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [actioning,  setActioning]  = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  // Days of the month being viewed (from /attendance/calendar), and the day
  // the employee tapped to see its check-in / check-out.
  const [monthDays,   setMonthDays]   = useState(null)
  const [selectedDay, setSelectedDay] = useState(phoneToday())

  const load = useCallback(async () => {
    try {
      // Always the signed-in person's OWN records (?mine=1), for every role.
      // This screen used to take the first row of GET /employees — for an
      // admin/HR login that is the whole company, so it showed and punched
      // someone else. The server now also forces mobile punches to "me".
      const [logsRes] = await Promise.allSettled([
        api.get('/attendance/logs?mine=1&limit=60'),
      ])
      let empId = null
      if (logsRes.status === 'fulfilled') {
        const raw  = logsRes.value.data.data
        const rows = Array.isArray(raw) ? raw : (raw?.rows || [])
        if (rows[0]?.employee_id) empId = rows[0].employee_id
        // Local (phone) calendar day — not the UTC day, which is "yesterday"
        // for the first 2–3 hours after midnight in Egypt.
        const d0 = new Date()
        const todayStr = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`
        const todayRec = rows.find(l => localDateOf(l.date || l.created_at) === todayStr)
        setToday(todayRec || null)
        setLogs(rows)
      }
      if (empId) setEmployeeId(empId)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  // Load every day of the viewed month — the list of recent punches only
  // covered ~60 rows, so earlier months showed an empty calendar.
  const meId = user?.employee_id || employeeId
  const loadMonth = useCallback(async () => {
    if (!meId) return
    const from = `${viewYear}-${pad2(viewMonth + 1)}-01`
    const last = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(new Date(viewYear, viewMonth + 1, 0).getDate())}`
    const t = phoneToday()
    const to = last < t ? last : t
    if (to < from) { setMonthDays([]); return }
    try {
      const r = await api.get(`/attendance/calendar?employee_id=${meId}&from_date=${from}&to_date=${to}`)
      const raw = r.data?.data
      setMonthDays(Array.isArray(raw) ? raw : [])
    } catch {
      try {
        const r = await api.get(`/attendance/logs?mine=1&from_date=${from}&to_date=${to}&limit=40`)
        const raw = r.data?.data
        setMonthDays(Array.isArray(raw) ? raw : (raw?.rows || []))
      } catch { setMonthDays(null) }
    }
  }, [meId, viewMonth, viewYear])
  useEffect(() => { loadMonth() }, [loadMonth])

  const prevMonth = () => {
    setSelectedDay(null)
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    const n = new Date()
    if (viewYear > n.getFullYear() || (viewYear === n.getFullYear() && viewMonth >= n.getMonth())) return
    setSelectedDay(null)
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const monthName = monthYear(viewMonth, viewYear)

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return {}
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      // Reverse geocoding needs the network — skip it quietly when offline.
      const [place] = await Location.reverseGeocodeAsync(loc.coords).catch(() => [null])
      const location_name = place
        ? [place.name, place.street, place.city].filter(Boolean).join(', ')
        : undefined
      return { location_lat: loc.coords.latitude, location_lng: loc.coords.longitude, location_name, is_mock_location: loc.mocked === true }
    } catch { return {} }
  }

  // ── Resilience mode: punches captured offline are queued and synced ──
  const [queued, setQueued] = useState(0)
  const refreshQueued = useCallback(async () => {
    if (!user?.id) return
    setQueued((await pendingPunches(user.id)).length)
  }, [user?.id])

  const syncQueued = useCallback(async ({ silent = true } = {}) => {
    if (!user?.id) return
    const pending = await pendingPunches(user.id)
    if (!pending.length) { setQueued(0); return }
    const r = await flushPunches(user.id, (path, body) => api.post(path, body))
    setQueued(r.remaining)
    if (r.sent || r.review || r.failed) {
      await load()
      if (!silent || r.review || r.failed) {
        Alert.alert(
          tr('Offline punches synced', 'تمت مزامنة البصمات', 'البصمات اتبعتت'),
          [
            r.sent ? tr(`${r.sent} recorded.`, `تم تسجيل ${r.sent}.`) : null,
            r.review ? tr(`${r.review} sent to HR for review.`, `${r.review} أُرسلت للموارد البشرية للمراجعة.`) : null,
            r.failed ? (r.messages.filter(Boolean)[0] || tr(`${r.failed} could not be recorded.`, `تعذّر تسجيل ${r.failed}.`)) : null,
          ].filter(Boolean).join('\n'),
        )
      }
    }
  }, [user?.id, load, tr])

  useEffect(() => {
    refreshQueued()
    syncQueued()
    const sub = AppState.addEventListener('change', st => { if (st === 'active') syncQueued() })
    const timer = setInterval(() => syncQueued(), 30000)
    return () => { sub.remove(); clearInterval(timer) }
  }, [refreshQueued, syncQueued])

  const punch = async (kind) => {
    setActioning(true)
    const device_time = new Date().toISOString()
    const loc = await getLocation()
    const client_punch_id = uuidv4()
    const path = kind === 'check_in' ? '/attendance/check-in' : '/attendance/check-out'
    try {
      const res = await api.post(path, { source: 'mobile', client_punch_id, ...loc })
      if (res.status === 202) Alert.alert(tr('Sent for review', 'أُرسلت للمراجعة', 'اتبعتت للمراجعة'), res.data?.message || '')
      await load()
    } catch (err) {
      if (isRetryable(err)) {
        // No connection: keep the punch on the phone with the tap time and GPS.
        await enqueuePunch(user?.id, { kind, device_time, client_punch_id, ...loc })
        await refreshQueued()
        Alert.alert(
          tr('Saved offline', 'تم الحفظ دون اتصال', 'اتسجلت من غير نت'),
          tr('No connection. Your punch is saved with its time and will be sent automatically.', 'لا يوجد اتصال. تم حفظ البصمة بوقتها وسيتم إرسالها تلقائيًا.', 'مفيش نت. البصمة اتحفظت بوقتها وهتتبعت لوحدها أول ما النت يرجع.'),
        )
      } else {
        const sentForReview = err.response?.data?.errors?.sent_for_review
        Alert.alert(
          kind === 'check_in' ? tr('Check-in failed', 'تعذّر تسجيل الحضور', 'بصمة الدخول متسجلتش') : tr('Check-out failed', 'تعذّر تسجيل الانصراف', 'بصمة الخروج متسجلتش'),
          (err.response?.data?.message || tr('Please try again.', 'يرجى المحاولة مرة أخرى.', 'معرفناش نكمّل. يلا نجرّب تاني.'))
            + (sentForReview ? '\n\n' + tr('The attempt was saved and sent to HR for review.', 'تم حفظ المحاولة وإرسالها للموارد البشرية للمراجعة.', 'المحاولة اتحفظت واتبعتت للـ HR يراجعها.') : ''),
          [{ text: tr('OK', 'حسنًا', 'تمام') }],
        )
      }
    } finally { setActioning(false) }
  }
  const handleCheckIn  = () => punch('check_in')
  const handleCheckOut = () => punch('check_out')

  const canCheckIn  = !today?.check_in
  const canCheckOut = today?.check_in && !today?.check_out

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Skeleton width={160} height={28} borderRadius={8} style={{ marginBottom: 16 }} />
        <View style={{ backgroundColor: '#12121C', borderRadius: 26, padding: 20, marginBottom: 16, alignItems: 'center', gap: 16 }}>
          <Skeleton width={140} height={12} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <View style={{ flexDirection: 'row', gap: 40 }}>
            <Skeleton width={70} height={36} borderRadius={8} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <Skeleton width={70} height={36} borderRadius={8} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          </View>
          <Skeleton width={160} height={52} borderRadius={16} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </View>
        <SkeletonCard rows={1} style={{ height: 260 }} />
        <Skeleton width={120} height={13} borderRadius={6} style={{ marginBottom: 10 }} />
        <SkeletonRow /><SkeletonRow /><SkeletonRow />
      </ScrollView>
    </SafeAreaView>
  )

  const recentLogs = logs.slice(0, 10)

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2ED573" />}
      >
        <Text style={[s.pageTitle, { color: colors.text }]}>{tr('Attendance', 'الحضور')}</Text>

        {queued > 0 && (
          <TouchableOpacity onPress={() => syncQueued({ silent: false })} activeOpacity={0.8}
            style={{ backgroundColor: '#FFF7E6', borderColor: '#FFA801', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 }}>
            <Text style={{ color: '#9A5B00', fontWeight: '700' }}>
              {tr(`${queued} punch(es) saved offline`, `${queued} بصمة محفوظة دون اتصال`, `${queued} بصمة متسجلة من غير نت`)}
            </Text>
            <Text style={{ color: '#9A5B00', fontSize: 12, marginTop: 2 }}>
              {tr('They will be sent automatically. Tap to try now.', 'سيتم إرسالها تلقائيًا. اضغط للمحاولة الآن.', 'هتتبعت لوحدها. دوس عشان تجرب دلوقتي.')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Today card */}
        <View style={s.todayCard}>
          <LinearGradient colors={GRADIENTS.navy} style={StyleSheet.absoluteFill} borderRadius={26} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Text style={s.todayDate}>{date(now, { weekday: 'long', month: 'long' })}</Text>

          <View style={s.timesRow}>
            <View style={s.timeBox}>
              <Text style={s.timeLabel}>{tr('Check In', 'الحضور', 'الدخول')}</Text>
              <Text style={[s.timeVal, !today?.check_in && s.timeEmpty]}>{fmtTime(today?.check_in)}</Text>
            </View>
            <View style={s.timeSep}/>
            <View style={s.timeBox}>
              <Text style={s.timeLabel}>{tr('Check Out', 'الانصراف', 'الخروج')}</Text>
              <Text style={[s.timeVal, !today?.check_out && s.timeEmpty]}>{fmtTime(today?.check_out)}</Text>
            </View>
          </View>

          {canCheckIn && (
            <TouchableOpacity onPress={handleCheckIn} disabled={actioning} activeOpacity={0.85} style={s.actionTouchable}>
              <LinearGradient colors={GRADIENTS.mint} style={s.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {actioning ? <ActivityIndicator color="white" /> : <>
                  <Text style={s.actionIcon}>✅</Text>
                  <Text style={s.actionText}>{tr('Check In', 'تسجيل الحضور', 'بصمة دخول')}</Text>
                  <Text style={s.actionTime}>{fmtTime(now)}</Text>
                </>}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {canCheckOut && (
            <TouchableOpacity onPress={handleCheckOut} disabled={actioning} activeOpacity={0.85} style={s.actionTouchable}>
              <LinearGradient colors={GRADIENTS.coral} style={s.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {actioning ? <ActivityIndicator color="white" /> : <>
                  <Text style={s.actionIcon}>🏁</Text>
                  <Text style={s.actionText}>{tr('Check Out', 'تسجيل الانصراف', 'بصمة خروج')}</Text>
                  <Text style={s.actionTime}>{fmtTime(now)}</Text>
                </>}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {today?.check_in && today?.check_out && (
            <View style={s.doneBox}>
              <Text style={s.doneText}>✓ {tr('Completed for today', 'اكتمل تسجيل اليوم', 'خلّصنا بصمة النهارده')}</Text>
            </View>
          )}
        </View>

        {/* Monthly Calendar */}
        <Card style={s.calCard}>
          <View style={s.calNav}>
            <TouchableOpacity onPress={prevMonth} style={s.navBtn} accessibilityLabel={tr('Previous month', 'الشهر السابق', 'الشهر اللي فات')}>
              <Text style={[s.navArrow, { color: colors.sub }]}>{prevChevron}</Text>
            </TouchableOpacity>
            <Text style={[s.calTitle, { color: colors.text }]}>{monthName}</Text>
            <TouchableOpacity onPress={nextMonth} style={s.navBtn} accessibilityLabel={tr('Next month', 'الشهر التالي', 'الشهر اللي جاي')}>
              <Text style={[s.navArrow, { color: colors.sub }]}>{chevron}</Text>
            </TouchableOpacity>
          </View>
          <MonthCalendar logs={monthDays || logs} month={viewMonth} year={viewYear} colors={colors}
            selected={selectedDay} onSelect={setSelectedDay} />
          {selectedDay ? (() => {
            const rec = (monthDays || logs).find(l => toDateStr(l.date || l.created_at) === selectedDay)
            const st = dayStatus(rec)
            const raw = String(rec?.status || '').toLowerCase()
            const note = raw === 'weekend' ? tr('Weekly day off', 'إجازة أسبوعية', 'أجازة أسبوعية')
              : raw === 'holiday' ? tr('Public holiday', 'عطلة رسمية', 'أجازة رسمية')
              : raw === 'excused' ? tr('Approved excuse', 'إذن معتمد', 'إذن متوافق عليه')
              : raw === 'mission' ? tr('Approved mission', 'مأمورية معتمدة', 'مأمورية متوافق عليها')
              : null
            return (
              <View style={[s.dayCard, { borderTopColor: colors.border }]}>
                <View style={s.dayCardHead}>
                  <Text style={[s.dayCardDate, { color: colors.text }]}>{date(selectedDay, { weekday: 'long', month: 'long' })}</Text>
                  {st ? (
                    <View style={[s.statusPill, { backgroundColor: `${STATUS_COLOR[st]}1A` }]}>
                      <Text style={[s.statusPillText, { color: STATUS_COLOR[st] }]}>{statusLabel(st, tr)}</Text>
                    </View>
                  ) : null}
                </View>
                {rec?.check_in || rec?.check_out ? (
                  <View style={s.dayCardRow}>
                    <View style={s.dayCardCol}>
                      <Text style={[s.dayCardLbl, { color: colors.muted }]}>{tr('Check in', 'الحضور', 'الحضور')}</Text>
                      <Text style={[s.dayCardVal, { color: colors.text }]}>{fmtTime(rec.check_in)}</Text>
                    </View>
                    <View style={s.dayCardCol}>
                      <Text style={[s.dayCardLbl, { color: colors.muted }]}>{tr('Check out', 'الانصراف', 'الانصراف')}</Text>
                      <Text style={[s.dayCardVal, { color: colors.text }]}>{fmtTime(rec.check_out)}</Text>
                    </View>
                    {Number(rec.late_minutes) > 0 && (
                      <View style={s.dayCardCol}>
                        <Text style={[s.dayCardLbl, { color: colors.muted }]}>{tr('Late by', 'تأخير', 'متأخر')}</Text>
                        <Text style={[s.dayCardVal, { color: STATUS_COLOR.late }]}>{tr(`${rec.late_minutes} min`, `${rec.late_minutes} د`)}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={[s.dayCardNote, { color: colors.sub }]}>
                    {note || (selectedDay === phoneToday()
                      ? tr('No check-in yet today', 'لم يتم تسجيل الحضور اليوم بعد', 'لسه مفيش بصمة النهارده')
                      : tr('No check-in or check-out recorded', 'لا يوجد تسجيل حضور أو انصراف', 'مفيش بصمة حضور أو انصراف'))}
                  </Text>
                )}
              </View>
            )
          })() : (
            <Text style={[s.dayCardHint, { color: colors.muted }]}>{tr('Tap a day to see your check-in and check-out', 'اضغط على يوم لعرض الحضور والانصراف', 'دوس على أي يوم تشوف الحضور والانصراف')}</Text>
          )}
        </Card>

        {/* Recent list */}
        {recentLogs.length > 0 && (
          <View>
            <Text style={[s.sectionTitle, { color: colors.sub }]}>{tr('Recent History', 'السجل الأخير', 'آخر الأيام')}</Text>
            {recentLogs.map((log, i) => {
              const st = (log.status || 'present').toLowerCase()
              const gradient = st === 'present' ? 'mint' : st === 'late' ? 'sunshine' : st === 'leave' ? 'lavender' : 'coral'
              return (
                <FeedItem
                  key={i}
                  icon={STATUS_ICON[st] || '📅'}
                  gradient={gradient}
                  title={date(toDateStr(log.date || log.created_at), { weekday: 'short' }) || '—'}
                  subtitle={`${fmtTime(log.check_in)} ${fwd} ${fmtTime(log.check_out)}`}
                  right={
                    <View style={[s.statusPill, { backgroundColor: `${STATUS_COLOR[st] || '#8A8DA3'}1A` }]}>
                      <Text style={[s.statusPillText, { color: STATUS_COLOR[st] || '#8A8DA3' }]}>{statusLabel(log.status || 'present', tr)}</Text>
                    </View>
                  }
                />
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const cal = StyleSheet.create({
  wrap:        { paddingTop: 8 },
  dayHeaders:  { flexDirection: 'row', marginBottom: 6 },
  dayLabel:    { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  dayLabelAr:  { fontSize: 9, fontWeight: '600' },
  grid:        { flexDirection: 'row', flexWrap: 'wrap' },
  cell:        { width: '14.28%', alignItems: 'center', marginBottom: 6 },
  dayCircle:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayNum:      { fontSize: 13, fontWeight: '600' },
  todayNum:    { color: 'white', fontWeight: '800' },
  dot:         { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  dotEmpty:    { width: 5, height: 5, marginTop: 1 },
  legend:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, justifyContent: 'center' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendText:  { fontSize: 11, textTransform: 'capitalize' },
})

const s = StyleSheet.create({
  dayCard:     { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  dayCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  dayCardDate: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  dayCardRow:  { flexDirection: 'row', gap: 16 },
  dayCardCol:  { flex: 1 },
  dayCardLbl:  { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  dayCardVal:  { fontSize: 16, fontWeight: '800' },
  dayCardNote: { fontSize: 13 },
  dayCardHint: { fontSize: 12, textAlign: 'center', marginTop: 10 },
  safe:        { flex: 1 },
  scroll:      { padding: 16, paddingBottom: 130 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:   { fontSize: 26, fontWeight: '900', marginBottom: 16 },
  todayCard:   { borderRadius: 26, padding: 22, marginBottom: 16, overflow: 'hidden', shadowColor: '#12121C', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 6 },
  todayDate:   { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  timesRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  timeBox:     { flex: 1, alignItems: 'center' },
  timeLabel:   { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6 },
  timeVal:     { color: 'white', fontSize: 32, fontWeight: '900' },
  timeEmpty:   { color: 'rgba(255,255,255,0.2)' },
  timeSep:     { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 20 },
  actionTouchable: { borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  actionBtn:   { borderRadius: 18, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  actionIcon:  { fontSize: 22 },
  actionText:  { color: 'white', fontSize: 18, fontWeight: '800' },
  actionTime:  { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  doneBox:     { backgroundColor: 'rgba(84,227,196,0.15)', borderRadius: 14, padding: 14, alignItems: 'center' },
  doneText:    { color: '#54E3C4', fontWeight: '800', fontSize: 14 },
  calCard:     { marginBottom: 16 },
  calNav:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calTitle:    { fontSize: 15, fontWeight: '800' },
  navBtn:      { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  navArrow:    { fontSize: 24, fontWeight: '300' },
  sectionTitle:{ fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: ls(0.5), marginBottom: 10 },
  statusPill:  { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
})
