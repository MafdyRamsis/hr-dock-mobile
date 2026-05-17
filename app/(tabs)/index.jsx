import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Animated, Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'
import api from '../../src/services/api'
import Card from '../../src/components/Card'
import StatusBadge from '../../src/components/StatusBadge'
import Skeleton, { SkeletonCard, SkeletonRow } from '../../src/components/Skeleton'

const fmt      = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'
const fmtNum   = n => n != null ? Number(n).toLocaleString() : '—'
const fmtTime  = iso => {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return isNaN(d) ? iso.slice(0, 5) : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
const todayISO = () => new Date().toISOString().split('T')[0]
const CAT_COLORS = { event: '#1d4ed8', policy: '#92400e', hr: '#166534', general: '#475569' }

function useClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

function CheckInOutCard({ todayLog, onCheckIn, onCheckOut, actioning, employeeId }) {
  const pulse = useRef(new Animated.Value(1)).current
  const now   = useClock()

  const canCheckIn  = !todayLog?.check_in
  const canCheckOut = !!todayLog?.check_in && !todayLog?.check_out
  const done        = !!todayLog?.check_in && !!todayLog?.check_out

  useEffect(() => {
    if (done) return
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [done])

  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const btnColor  = canCheckIn ? '#16a34a' : canCheckOut ? '#E8583C' : '#2BC4BE'
  const btnLabel  = canCheckIn ? 'Check In' : canCheckOut ? 'Check Out' : 'Done'
  const btnAction = canCheckIn ? onCheckIn : canCheckOut ? onCheckOut : null

  const shiftIn  = todayLog?.expected_check_in?.slice(0, 5)
  const shiftOut = todayLog?.expected_check_out?.slice(0, 5)

  return (
    <View style={ci.card}>
      <Text style={ci.date}>{dateStr}</Text>
      <Text style={ci.clock}>{timeStr}</Text>

      {/* Shift info */}
      {(shiftIn || shiftOut) && (
        <View style={ci.shiftRow}>
          <Text style={ci.shiftText}>Shift  {shiftIn} – {shiftOut}</Text>
        </View>
      )}

      <View style={ci.timesRow}>
        <View style={ci.timeBox}>
          <Text style={ci.timeLabel}>CHECK IN</Text>
          <Text style={[ci.timeVal, !todayLog?.check_in && ci.timeDim]}>
            {fmtTime(todayLog?.check_in)}
          </Text>
        </View>
        <View style={ci.timeLine} />
        <View style={ci.statusCenter}>
          <StatusBadge status={todayLog?.status || (employeeId ? 'absent' : '—')} />
        </View>
        <View style={ci.timeLine} />
        <View style={ci.timeBox}>
          <Text style={ci.timeLabel}>CHECK OUT</Text>
          <Text style={[ci.timeVal, !todayLog?.check_out && ci.timeDim]}>
            {fmtTime(todayLog?.check_out)}
          </Text>
        </View>
      </View>

      <View style={ci.btnWrap}>
        {!done && (
          <Animated.View style={[ci.pulseRing, { backgroundColor: `${btnColor}30`, transform: [{ scale: pulse }] }]} />
        )}
        <TouchableOpacity
          style={[ci.btn, { backgroundColor: btnColor }, (!btnAction || actioning) && ci.btnDisabled]}
          onPress={btnAction}
          disabled={!btnAction || actioning}
          activeOpacity={0.85}
        >
          <Text style={ci.btnLabel}>{actioning ? '…' : btnLabel}</Text>
        </TouchableOpacity>
      </View>

      {done && (
        <Text style={ci.doneNote}>
          {todayLog?.work_minutes ? `${Math.floor(todayLog.work_minutes / 60)}h ${todayLog.work_minutes % 60}m worked` : 'Day complete'}
        </Text>
      )}
    </View>
  )
}

export default function HomeScreen() {
  const { user }  = useAuth()
  const { colors } = useTheme()
  const router    = useRouter()

  const [ctx,            setCtx]            = useState(null)
  const [todayLog,       setTodayLog]       = useState(null)
  const [employeeId,     setEmployeeId]     = useState(user?.employee_id || null)
  const [announcements,  setAnnouncements]  = useState([])
  const [notifBadge,     setNotifBadge]     = useState(0)
  const [loading,        setLoading]        = useState(true)
  const [refreshing,     setRefreshing]     = useState(false)
  const [loadError,      setLoadError]      = useState(false)
  const [actioning,      setActioning]      = useState(false)
  const [showCorrection, setShowCorrection] = useState(false)
  const [corrReason,     setCorrReason]     = useState('')
  const [corrSaving,     setCorrSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const [ctxRes, annRes, logsRes, empRes, tickRes] = await Promise.allSettled([
        api.get('/ai/context'),
        api.get('/announcements'),
        api.get('/attendance/logs?limit=30'),
        api.get('/employees'),
        api.get('/helpdesk?limit=10'),
      ])
      if (ctxRes.status === 'fulfilled') setCtx(ctxRes.value.data.data)
      if (annRes.status === 'fulfilled') setAnnouncements((annRes.value.data.data || []).slice(0, 3))
      if (tickRes.status === 'fulfilled') {
        const tickets = tickRes.value.data.data || []
        const updated = tickets.filter(t => t.status !== 'pending').length
        setNotifBadge(updated)
      }

      // Resolve employee_id — prefer employees list match, fall back to logs
      let empId = user?.employee_id
      if (empRes.status === 'fulfilled') {
        const emps = empRes.value.data.data || []
        const me   = emps.find(e => e.email === user?.email) || emps[0]
        if (me?.id) empId = me.id
      }

      if (logsRes.status === 'fulfilled') {
        const raw  = logsRes.value.data.data
        const rows = Array.isArray(raw) ? raw : (raw?.rows || [])
        if (!empId && rows[0]?.employee_id) empId = rows[0].employee_id
        const todayRec = rows.find(l => (l.date || l.created_at || '').startsWith(todayISO()))
        setTodayLog(todayRec || null)
      }

      if (empId) setEmployeeId(empId)
    } catch { setLoadError(true) }
    finally { setLoading(false); setRefreshing(false) }
  }, [user])

  useEffect(() => { load() }, [])

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
    } catch (e) { Alert.alert('Check-in failed', e.response?.data?.message || 'Please try again.') }
    finally { setActioning(false) }
  }

  const handleCheckOut = async () => {
    setActioning(true)
    try {
      const loc = await getLocation()
      await api.post('/attendance/check-out', { ...(employeeId ? { employee_id: employeeId } : {}), ...loc })
      await load()
    } catch (e) { Alert.alert('Check-out failed', e.response?.data?.message || 'Please try again.') }
    finally { setActioning(false) }
  }

  const submitCorrection = async () => {
    if (!corrReason.trim()) return
    setCorrSaving(true)
    try {
      const dateStr  = todayLog?.date?.split('T')[0] || new Date().toISOString().split('T')[0]
      const checkIn  = fmtTime(todayLog?.check_in)
      const checkOut = fmtTime(todayLog?.check_out)
      await api.post('/helpdesk', {
        subject:     `Attendance Correction – ${dateStr}`,
        description: `Recorded: Check-in ${checkIn}, Check-out ${checkOut}\n\nReason for correction:\n${corrReason.trim()}`,
        priority:    'medium',
      })
      setShowCorrection(false)
      setCorrReason('')
      Alert.alert('Request sent', 'HR will review and correct your attendance record.')
    } catch { Alert.alert('Error', 'Failed to submit request. Please try again.') }
    finally { setCorrSaving(false) }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const balances  = ctx?.balances || []
  const payslip   = ctx?.payslip
  const pending   = ctx?.pending || []
  const totalLeft = balances.reduce((s, b) => s + (Number(b.remaining) || 0), 0)

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={{ gap: 6 }}>
            <Skeleton width={80} height={11} />
            <Skeleton width={140} height={20} />
          </View>
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>
        {/* Check-in card skeleton */}
        <View style={{ backgroundColor: '#0F1829', borderRadius: 20, padding: 20, marginBottom: 14, alignItems: 'center', gap: 14 }}>
          <Skeleton width={120} height={11} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <Skeleton width={180} height={40} borderRadius={10} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <Skeleton width={96} height={96} borderRadius={48} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </View>
        <SkeletonCard rows={1} style={{ marginBottom: 10 }} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
      </ScrollView>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2BC4BE" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Offline / error banner */}
        {loadError && (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>⚠️  Could not load data — pull down to retry</Text>
          </View>
        )}

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.greeting, { color: colors.sub }]}>{greeting()}</Text>
            <Text style={[s.name, { color: colors.text }]}>{user?.first_name} {user?.last_name}</Text>
          </View>
          <View style={s.headerRight}>
            {['admin','hr_manager','manager'].includes(user?.role) && (
              <TouchableOpacity style={[s.teamBtn, { backgroundColor: colors.card }]} onPress={() => router.push('/manager-dashboard')} activeOpacity={0.8}>
                <Text style={[s.teamBtnText, { color: colors.text2 }]}>👥 Team</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.bellBtn} onPress={() => router.push('/notifications')}>
              <Text style={s.bellIcon}>🔔</Text>
              {notifBadge > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{notifBadge > 9 ? '9+' : notifBadge}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.avatar} onPress={() => router.push('/profile')}>
              <Text style={s.avatarText}>{user?.first_name?.[0]}{user?.last_name?.[0]}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. Check In / Out */}
        <CheckInOutCard
          todayLog={todayLog}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          actioning={actioning}
          employeeId={employeeId}
        />

        {/* Correction link */}
        {todayLog && (
          <TouchableOpacity style={s.corrLink} onPress={() => setShowCorrection(true)}>
            <Text style={s.corrLinkText}>Incorrect record? Request a correction →</Text>
          </TouchableOpacity>
        )}

        {/* 2. Leave Balance */}
        <TouchableOpacity style={[s.leaveCard, { backgroundColor: colors.card }]} onPress={() => router.push('/leave-balance')} activeOpacity={0.85}>
          <View style={s.leaveLeft}>
            <Text style={s.leaveIcon}>🏖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.leaveTitle, { color: colors.text }]}>Leave Balance</Text>
              <Text style={s.leaveSub} numberOfLines={1}>{balances.length} types · tap for details</Text>
            </View>
          </View>
          <View style={s.leaveRight}>
            <Text style={s.leaveDays}>{totalLeft}</Text>
            <View>
              <Text style={s.leaveDaysLabel}>days</Text>
              <Text style={s.leaveDaysLabel}>left</Text>
            </View>
            <Text style={s.leaveArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {balances.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsScroll} contentContainerStyle={s.pillsContent}>
            {balances.map((b, i) => (
              <TouchableOpacity key={i} style={[s.pill, { backgroundColor: colors.card }]} onPress={() => router.push('/leave-balance')} activeOpacity={0.8}>
                <Text style={[s.pillNum, { color: colors.text }]}>{b.remaining}</Text>
                <Text style={s.pillName} numberOfLines={2}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* 3. Announcements */}
        {announcements.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={[s.sectionTitle, { color: colors.sub }]}>Announcements</Text>
              <TouchableOpacity onPress={() => router.push('/announcements')}>
                <Text style={s.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            {announcements.map(a => (
              <TouchableOpacity key={a.id} style={[s.annCard, { backgroundColor: colors.card }]} onPress={() => router.push('/announcements')} activeOpacity={0.85}>
                <View style={s.annTop}>
                  <Text style={[s.annCat, { color: CAT_COLORS[a.category] || '#475569' }]}>
                    {a.category?.toUpperCase()}
                  </Text>
                  {a.pinned && <Text style={s.annPin}>📌</Text>}
                  {a.priority === 'high' && (
                    <View style={s.highBadge}><Text style={s.highText}>HIGH</Text></View>
                  )}
                </View>
                <Text style={[s.annTitle, { color: colors.text }]} numberOfLines={1}>{a.title}</Text>
                <Text style={[s.annBody, { color: colors.sub }]}  numberOfLines={2}>{a.body}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 4. Pending requests */}
        {pending.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.sub }]}>Pending Leave</Text>
            {pending.map((p, i) => (
              <Card key={i} style={s.pendCard}>
                <View style={s.pendRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pendType, { color: colors.text2 }]} numberOfLines={1}>{p.leave_type}</Text>
                    <Text style={s.pendDate}>{fmt(p.start_date)} → {fmt(p.end_date)} · {p.days_requested}d</Text>
                  </View>
                  <StatusBadge status={p.status} />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Last payslip */}
        {payslip && (
          <TouchableOpacity onPress={() => router.push('/(tabs)/payslips')} activeOpacity={0.85} style={{ marginBottom: 8 }}>
            <Card>
              <View style={s.sectionRow}>
                <Text style={[s.sectionTitle, { color: colors.sub }]}>Last Payslip</Text>
                <Text style={s.seeAll}>View →</Text>
              </View>
              <Text style={s.payPeriod}>{fmt(payslip.period_start)} – {fmt(payslip.period_end)}</Text>
              <View style={s.payRow}>
                <View>
                  <Text style={s.payLabel}>Net Salary</Text>
                  <Text style={[s.payNet, { color: colors.text }]}>EGP {fmtNum(payslip.net_salary)}</Text>
                </View>
                <View>
                  <Text style={s.payLabel}>Basic</Text>
                  <Text style={[s.payBasic, { color: colors.sub }]}>EGP {fmtNum(payslip.basic_salary)}</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      </ScrollView>
      {/* Correction Modal */}
      <Modal visible={showCorrection} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCorrection(false)}>
        <SafeAreaView style={m.safe}>
          <View style={m.header}>
            <Text style={m.title}>Request Attendance Correction</Text>
            <TouchableOpacity onPress={() => setShowCorrection(false)}>
              <Text style={m.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={m.scroll} keyboardShouldPersistTaps="handled">
            <View style={m.infoBox}>
              <Text style={m.infoLabel}>Today's Record</Text>
              <Text style={m.infoRow}>Check-in:  {fmtTime(todayLog?.check_in)}</Text>
              <Text style={m.infoRow}>Check-out: {fmtTime(todayLog?.check_out)}</Text>
            </View>
            <Text style={m.label}>Reason for Correction</Text>
            <TextInput
              style={m.input}
              placeholder="e.g. Forgot to check out, checked in at wrong time…"
              placeholderTextColor="#94a3b8"
              value={corrReason}
              onChangeText={setCorrReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={m.hint}>Your request will be sent to HR for review and manual adjustment.</Text>
            <TouchableOpacity style={[m.btn, corrSaving && m.btnDisabled]} onPress={submitCorrection} disabled={corrSaving}>
              {corrSaving ? <ActivityIndicator color="white" /> : <Text style={m.btnText}>Send to HR</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  )
}

const ci = StyleSheet.create({
  card:        { backgroundColor: '#0F1829', borderRadius: 20, padding: 20, marginBottom: 14, alignItems: 'center' },
  date:        { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 2 },
  clock:       { color: 'white', fontSize: 34, fontWeight: '900', letterSpacing: 2, marginBottom: 18 },
  timesRow:    { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 22 },
  timeBox:     { flex: 1, alignItems: 'center' },
  timeLabel:   { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  timeVal:     { color: 'white', fontSize: 18, fontWeight: '800' },
  timeDim:     { color: 'rgba(255,255,255,0.2)' },
  timeLine:    { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.12)' },
  statusCenter:{ flex: 1, alignItems: 'center' },
  btnWrap:     { alignItems: 'center', justifyContent: 'center', width: 120, height: 120 },
  pulseRing:   { position: 'absolute', width: 120, height: 120, borderRadius: 60 },
  btn:         { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  btnDisabled: { opacity: 0.55 },
  btnLabel:    { color: 'white', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  shiftRow:    { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  shiftText:   { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  doneNote:    { color: '#2BC4BE', fontSize: 12, fontWeight: '600', marginTop: 14 },
})

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F0F4FA' },
  scroll:        { padding: 14, paddingBottom: 40 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting:      { fontSize: 12, color: '#64748b' },
  name:          { fontSize: 19, fontWeight: '800', color: '#0F1829' },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamBtn:       { height: 36, borderRadius: 18, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  teamBtnText:   { fontSize: 13, fontWeight: '700' },
  bellBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  bellIcon:      { fontSize: 18 },
  badge:         { position: 'absolute', top: -2, right: -2, backgroundColor: '#E8583C', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#F0F4FA' },
  badgeText:     { color: 'white', fontSize: 9, fontWeight: '800' },
  avatar:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8583C', alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: 'white', fontWeight: '700', fontSize: 14 },

  leaveCard:     { backgroundColor: 'white', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  leaveLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  leaveIcon:     { fontSize: 24 },
  leaveTitle:    { fontSize: 14, fontWeight: '800', color: '#0F1829', marginBottom: 1 },
  leaveSub:      { fontSize: 11, color: '#94a3b8' },
  leaveRight:    { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  leaveDays:     { fontSize: 30, fontWeight: '900', color: '#2BC4BE' },
  leaveDaysLabel:{ fontSize: 10, color: '#94a3b8', lineHeight: 14 },
  leaveArrow:    { fontSize: 20, color: '#cbd5e1' },

  pillsScroll:   { marginBottom: 14, marginHorizontal: -4 },
  pillsContent:  { paddingHorizontal: 4, gap: 8 },
  pill:          { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 76, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  pillNum:       { fontSize: 20, fontWeight: '900', color: '#0F1829', marginBottom: 3 },
  pillName:      { fontSize: 10, color: '#64748b', textAlign: 'center', maxWidth: 68 },

  section:       { marginBottom: 6 },
  sectionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  seeAll:        { fontSize: 12, fontWeight: '600', color: '#2BC4BE' },

  annCard:       { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  annTop:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  annCat:        { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  annPin:        { fontSize: 11 },
  highBadge:     { backgroundColor: '#fef2f2', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  highText:      { fontSize: 9, fontWeight: '800', color: '#ef4444', letterSpacing: 0.4 },
  annTitle:      { fontSize: 13, fontWeight: '800', color: '#0F1829', marginBottom: 4 },
  annBody:       { fontSize: 12, color: '#475569', lineHeight: 17 },

  pendCard:      { marginBottom: 8 },
  pendRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pendType:      { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  pendDate:      { fontSize: 11, color: '#94a3b8' },

  errorBanner:     { backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#fcd34d' },
  errorBannerText: { fontSize: 12, color: '#92400e', fontWeight: '600', textAlign: 'center' },
  corrLink:      { alignSelf: 'center', marginTop: -8, marginBottom: 14, paddingVertical: 4 },
  corrLinkText:  { fontSize: 11, color: '#94a3b8', textDecorationLine: 'underline' },

  payPeriod:     { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  payRow:        { flexDirection: 'row', gap: 28 },
  payLabel:      { fontSize: 10, color: '#94a3b8', marginBottom: 2 },
  payNet:        { fontSize: 18, fontWeight: '800', color: '#0F1829' },
  payBasic:      { fontSize: 14, fontWeight: '600', color: '#475569' },
})

const m = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: 'white' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title:      { fontSize: 16, fontWeight: '800', color: '#0F1829', flex: 1, marginRight: 12 },
  close:      { fontSize: 22, color: '#64748b' },
  scroll:     { padding: 20 },
  infoBox:    { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 20 },
  infoLabel:  { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  infoRow:    { fontSize: 14, color: '#1e293b', fontWeight: '500', marginBottom: 4 },
  label:      { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  input:      { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 14, color: '#1e293b', backgroundColor: '#fafafa', minHeight: 100 },
  hint:       { fontSize: 12, color: '#94a3b8', marginTop: 10, marginBottom: 24, lineHeight: 18 },
  btn:        { backgroundColor: '#E8583C', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: 'white', fontSize: 15, fontWeight: '700' },
})
