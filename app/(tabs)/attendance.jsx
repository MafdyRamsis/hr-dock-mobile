import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import api from '../../src/services/api'
import Card from '../../src/components/Card'
import StatusBadge from '../../src/components/StatusBadge'
import Skeleton, { SkeletonCard, SkeletonRow } from '../../src/components/Skeleton'
import { useTheme } from '../../src/context/ThemeContext'

const fmt     = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'
const fmtTime = iso => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d) ? iso.slice(0, 5) : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
const toDateStr = d => d ? d.split('T')[0] : ''

const DAYS = ['S','M','T','W','T','F','S']

const STATUS_COLOR = {
  present: '#16a34a',
  late:    '#f59e0b',
  absent:  '#ef4444',
  leave:   '#2BC4BE',
}

function MonthCalendar({ logs, month, year, colors }) {
  const logMap = useMemo(() => {
    const m = {}
    logs.forEach(l => {
      const d = toDateStr(l.date || l.created_at)
      if (d) m[d] = l.status || 'present'
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
        {DAYS.map((d, i) => <Text key={i} style={cal.dayLabel}>{d}</Text>)}
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

          return (
            <View key={iso} style={cal.cell}>
              <View style={[
                cal.dayCircle,
                isToday && cal.todayCircle,
              ]}>
                <Text style={[
                  cal.dayNum, { color: colors.text2 },
                  isToday && cal.todayNum,
                  (isFuture || isWeekend) && !isToday && cal.mutedNum,
                ]}>{day}</Text>
              </View>
              {dotColor && !isFuture ? (
                <View style={[cal.dot, { backgroundColor: dotColor }]} />
              ) : (
                <View style={cal.dotEmpty} />
              )}
            </View>
          )
        })}
      </View>

      {/* Legend */}
      <View style={[cal.legend, { borderTopColor: colors.border }]}>
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <View key={s} style={cal.legendItem}>
            <View style={[cal.legendDot, { backgroundColor: c }]} />
            <Text style={[cal.legendText, { color: colors.sub }]}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export default function AttendanceScreen() {
  const { colors } = useTheme()
  const [today,      setToday]      = useState(null)
  const [employeeId, setEmployeeId] = useState(null)
  const [logs,       setLogs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [actioning,  setActioning]  = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear,  setViewYear]  = useState(now.getFullYear())

  const load = useCallback(async () => {
    try {
      const [logsRes, empRes] = await Promise.allSettled([
        api.get('/attendance/logs?limit=60'),
        api.get('/employees'),
      ])
      let empId = null
      if (empRes.status === 'fulfilled') {
        const emps = empRes.value.data.data || []
        empId = emps[0]?.id || null
      }
      if (logsRes.status === 'fulfilled') {
        const raw  = logsRes.value.data.data
        const rows = Array.isArray(raw) ? raw : (raw?.rows || [])
        if (!empId && rows[0]?.employee_id) empId = rows[0].employee_id
        const todayStr = new Date().toISOString().split('T')[0]
        const todayRec = rows.find(l => (l.date || l.created_at || '').startsWith(todayStr))
        setToday(todayRec || null)
        setLogs(rows)
      }
      if (empId) setEmployeeId(empId)
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    const n = new Date()
    if (viewYear > n.getFullYear() || (viewYear === n.getFullYear() && viewMonth >= n.getMonth())) return
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return {}
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const [place] = await Location.reverseGeocodeAsync(loc.coords).catch(() => [null])
      const location_name = place
        ? [place.name, place.street, place.city].filter(Boolean).join(', ')
        : undefined
      return { location_lat: loc.coords.latitude, location_lng: loc.coords.longitude, location_name }
    } catch { return {} }
  }

  const handleCheckIn = async () => {
    setActioning(true)
    try {
      const loc = await getLocation()
      await api.post('/attendance/check-in', { ...(employeeId ? { employee_id: employeeId } : {}), ...loc })
      await load()
    } catch (err) {
      Alert.alert('Check-in failed', err.response?.data?.message || 'Please try again.')
    } finally { setActioning(false) }
  }

  const handleCheckOut = async () => {
    setActioning(true)
    try {
      const loc = await getLocation()
      await api.post('/attendance/check-out', { ...(employeeId ? { employee_id: employeeId } : {}), ...loc })
      await load()
    } catch (err) {
      Alert.alert('Check-out failed', err.response?.data?.message || 'Please try again.')
    } finally { setActioning(false) }
  }

  const canCheckIn  = !today?.check_in
  const canCheckOut = today?.check_in && !today?.check_out

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Skeleton width={160} height={28} borderRadius={8} style={{ marginBottom: 16 }} />
        {/* Today card skeleton */}
        <View style={{ backgroundColor: '#0F1829', borderRadius: 20, padding: 20, marginBottom: 16, alignItems: 'center', gap: 16 }}>
          <Skeleton width={140} height={12} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <View style={{ flexDirection: 'row', gap: 40 }}>
            <Skeleton width={70} height={36} borderRadius={8} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <Skeleton width={70} height={36} borderRadius={8} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          </View>
          <Skeleton width={160} height={52} borderRadius={16} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </View>
        {/* Calendar skeleton */}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2BC4BE" />}
      >
        <Text style={[s.pageTitle, { color: colors.text }]}>Attendance</Text>

        {/* Today card */}
        <Card style={s.todayCard}>
          <Text style={s.todayDate}>{now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</Text>

          <View style={s.timesRow}>
            <View style={s.timeBox}>
              <Text style={s.timeLabel}>Check In</Text>
              <Text style={[s.timeVal, !today?.check_in && s.timeEmpty]}>{fmtTime(today?.check_in)}</Text>
            </View>
            <View style={s.timeSep}/>
            <View style={s.timeBox}>
              <Text style={s.timeLabel}>Check Out</Text>
              <Text style={[s.timeVal, !today?.check_out && s.timeEmpty]}>{fmtTime(today?.check_out)}</Text>
            </View>
          </View>

          {canCheckIn && (
            <TouchableOpacity style={[s.actionBtn, s.checkInBtn]} onPress={handleCheckIn} disabled={actioning} activeOpacity={0.85}>
              {actioning ? <ActivityIndicator color="white" /> : <>
                <Text style={s.actionIcon}>✅</Text>
                <Text style={s.actionText}>Check In</Text>
                <Text style={s.actionTime}>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>
              </>}
            </TouchableOpacity>
          )}

          {canCheckOut && (
            <TouchableOpacity style={[s.actionBtn, s.checkOutBtn]} onPress={handleCheckOut} disabled={actioning} activeOpacity={0.85}>
              {actioning ? <ActivityIndicator color="white" /> : <>
                <Text style={s.actionIcon}>🏁</Text>
                <Text style={s.actionText}>Check Out</Text>
                <Text style={s.actionTime}>{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>
              </>}
            </TouchableOpacity>
          )}

          {today?.check_in && today?.check_out && (
            <View style={s.doneBox}>
              <Text style={s.doneText}>✓ Completed for today</Text>
            </View>
          )}
        </Card>

        {/* Monthly Calendar */}
        <Card style={s.calCard}>
          <View style={s.calNav}>
            <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
              <Text style={[s.navArrow, { color: colors.sub }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[s.calTitle, { color: colors.text }]}>{monthName}</Text>
            <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
              <Text style={[s.navArrow, { color: colors.sub }]}>›</Text>
            </TouchableOpacity>
          </View>
          <MonthCalendar logs={logs} month={viewMonth} year={viewYear} colors={colors} />
        </Card>

        {/* Recent list */}
        {recentLogs.length > 0 && (
          <View>
            <Text style={[s.sectionTitle, { color: colors.sub }]}>Recent History</Text>
            {recentLogs.map((log, i) => (
              <Card key={i} style={s.logCard}>
                <View style={s.logRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.logDate, { color: colors.text2 }]}>{fmt(log.date || log.created_at)}</Text>
                    <Text style={[s.logTimes, { color: colors.sub }]}>
                      {fmtTime(log.check_in)} → {fmtTime(log.check_out)}
                    </Text>
                  </View>
                  <StatusBadge status={log.status || 'present'} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const cal = StyleSheet.create({
  wrap:        { paddingTop: 8 },
  dayHeaders:  { flexDirection: 'row', marginBottom: 6 },
  dayLabel:    { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  grid:        { flexDirection: 'row', flexWrap: 'wrap' },
  cell:        { width: '14.28%', alignItems: 'center', marginBottom: 6 },
  dayCircle:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { backgroundColor: '#0F1829' },
  dayNum:      { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  todayNum:    { color: 'white', fontWeight: '800' },
  mutedNum:    { color: '#cbd5e1' },
  dot:         { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  dotEmpty:    { width: 5, height: 5, marginTop: 1 },
  legend:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', justifyContent: 'center' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendText:  { fontSize: 11, color: '#64748b', textTransform: 'capitalize' },
})

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F0F4FA' },
  scroll:      { padding: 16, paddingBottom: 32 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:   { fontSize: 26, fontWeight: '900', color: '#0F1829', marginBottom: 16 },
  todayCard:   { backgroundColor: '#0F1829', marginBottom: 16 },
  todayDate:   { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  timesRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  timeBox:     { flex: 1, alignItems: 'center' },
  timeLabel:   { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6 },
  timeVal:     { color: 'white', fontSize: 32, fontWeight: '900' },
  timeEmpty:   { color: 'rgba(255,255,255,0.2)' },
  timeSep:     { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 20 },
  actionBtn:   { borderRadius: 16, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  checkInBtn:  { backgroundColor: '#16a34a' },
  checkOutBtn: { backgroundColor: '#E8583C' },
  actionIcon:  { fontSize: 22 },
  actionText:  { color: 'white', fontSize: 18, fontWeight: '800' },
  actionTime:  { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  doneBox:     { backgroundColor: 'rgba(43,196,190,0.15)', borderRadius: 12, padding: 14, alignItems: 'center' },
  doneText:    { color: '#2BC4BE', fontWeight: '700', fontSize: 14 },
  calCard:     { marginBottom: 16 },
  calNav:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calTitle:    { fontSize: 15, fontWeight: '800', color: '#0F1829' },
  navBtn:      { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  navArrow:    { fontSize: 24, color: '#475569', fontWeight: '300' },
  sectionTitle:{ fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  logCard:     { marginBottom: 8, padding: 14 },
  logRow:      { flexDirection: 'row', alignItems: 'center' },
  logDate:     { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  logTimes:    { fontSize: 13, color: '#64748b' },
})
