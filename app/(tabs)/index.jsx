import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Animated, Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import * as Location from 'expo-location'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme, GRADIENTS } from '../../src/context/ThemeContext'
import api from '../../src/services/api'
import StatusBadge from '../../src/components/StatusBadge'
import PillTag from '../../src/components/PillTag'
import StatWidget from '../../src/components/StatWidget'
import FeedItem from '../../src/components/FeedItem'
import Skeleton, { SkeletonCard, SkeletonRow } from '../../src/components/Skeleton'

const fmt      = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'
const fmtNum   = n => n != null ? Number(n).toLocaleString() : '—'
const fmtTime  = iso => {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return isNaN(d) ? iso.slice(0, 5) : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
const todayISO = () => new Date().toISOString().split('T')[0]
const CAT_COLORS  = { event: '#8854D0', policy: '#FFA801', hr: '#2ED573', general: '#8A8DA3' }
const CAT_GRADIENT = { event: 'lavender', policy: 'sunshine', hr: 'mint', general: 'coral' }

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

  const gradient  = canCheckIn ? GRADIENTS.mint : canCheckOut ? GRADIENTS.coral : GRADIENTS.lavender
  const btnLabel  = canCheckIn ? 'Check In' : canCheckOut ? 'Check Out' : 'Done'
  const btnAction = canCheckIn ? onCheckIn : canCheckOut ? onCheckOut : null

  const shiftIn  = todayLog?.expected_check_in?.slice(0, 5)
  const shiftOut = todayLog?.expected_check_out?.slice(0, 5)

  return (
    <View style={ci.card}>
      <LinearGradient colors={GRADIENTS.navy} style={StyleSheet.absoluteFill} borderRadius={26} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <Text style={ci.date}>{dateStr}</Text>
      <Text style={ci.clock}>{timeStr}</Text>

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
          <Animated.View style={[ci.pulseRing, { backgroundColor: `${gradient[1]}33`, transform: [{ scale: pulse }] }]} />
        )}
        <TouchableOpacity
          onPress={btnAction}
          disabled={!btnAction || actioning}
          activeOpacity={0.85}
          style={ci.btnTouchable}
        >
          <LinearGradient colors={gradient} style={[ci.btn, (!btnAction || actioning) && ci.btnDisabled]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={ci.btnLabel}>{actioning ? '…' : btnLabel}</Text>
          </LinearGradient>
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
          <Skeleton width={44} height={44} borderRadius={22} />
        </View>
        <View style={{ backgroundColor: '#12121C', borderRadius: 26, padding: 20, marginBottom: 14, alignItems: 'center', gap: 14 }}>
          <Skeleton width={120} height={11} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <Skeleton width={180} height={40} borderRadius={10} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <Skeleton width={96} height={96} borderRadius={48} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <Skeleton width="31%" height={92} borderRadius={20} />
          <Skeleton width="31%" height={92} borderRadius={20} />
          <Skeleton width="31%" height={92} borderRadius={20} />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2ED573" />}
        showsVerticalScrollIndicator={false}
      >
        {loadError && (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>⚠️  Could not load data — pull down to retry</Text>
          </View>
        )}

        {/* Header — avatar + greeting left, actions right */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerLeft} onPress={() => router.push('/profile')} activeOpacity={0.85}>
            <LinearGradient colors={GRADIENTS.coral} style={s.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={s.avatarText}>{user?.first_name?.[0]}{user?.last_name?.[0]}</Text>
            </LinearGradient>
            <View>
              <Text style={[s.greeting, { color: colors.sub }]}>{greeting()} 👋</Text>
              <Text style={[s.name, { color: colors.text }]}>{user?.first_name} {user?.last_name}</Text>
            </View>
          </TouchableOpacity>
          <View style={s.headerRight}>
            {['admin','hr_manager','manager'].includes(user?.role) && (
              <TouchableOpacity style={[s.teamBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]} onPress={() => router.push('/manager-dashboard')} activeOpacity={0.8}>
                <Text style={[s.teamBtnText, { color: colors.text2 }]}>👥 Team</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.bellBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]} onPress={() => router.push('/notifications')}>
              <Text style={s.bellIcon}>🔔</Text>
              {notifBadge > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{notifBadge > 9 ? '9+' : notifBadge}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Check In / Out */}
        <CheckInOutCard
          todayLog={todayLog}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          actioning={actioning}
          employeeId={employeeId}
        />

        {todayLog && (
          <TouchableOpacity style={s.corrLink} onPress={() => setShowCorrection(true)}>
            <Text style={s.corrLinkText}>Incorrect record? Request a correction →</Text>
          </TouchableOpacity>
        )}

        {/* Quick Stats */}
        <View style={s.statsRow}>
          <StatWidget icon="🏖️" value={`${totalLeft}d`} label="Leave left" gradient="sunshine" onPress={() => router.push('/leave-balance')} />
          <StatWidget icon="📋" value={pending.length} label="Pending" gradient="lavender" onPress={() => router.push('/(tabs)/leave')} />
          <StatWidget icon="📣" value={announcements.length} label="News" gradient="mint" onPress={() => router.push('/announcements')} />
        </View>

        {/* Today's Flow */}
        <View style={s.sectionRow}>
          <Text style={[s.sectionTitle, { color: colors.sub }]}>Your Today's Flow</Text>
        </View>

        {/* Leave balance summary */}
        <FeedItem
          icon="🏖️"
          gradient="sunshine"
          title="Leave Balance"
          subtitle={`${balances.length} type${balances.length === 1 ? '' : 's'} · tap for details`}
          progress={null}
          onPress={() => router.push('/leave-balance')}
          right={<PillTag label={`${totalLeft}d left`} color="#FFA801" size="sm" />}
        />

        {balances.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsScroll} contentContainerStyle={s.pillsContent}>
            {balances.map((b, i) => (
              <TouchableOpacity key={i} style={[s.pill, { backgroundColor: colors.card, borderColor: colors.glassBorder }]} onPress={() => router.push('/leave-balance')} activeOpacity={0.8}>
                <Text style={[s.pillNum, { color: colors.text }]}>{b.remaining}</Text>
                <Text style={[s.pillName, { color: colors.sub }]} numberOfLines={2}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Pending leave */}
        {pending.map((p, i) => (
          <FeedItem
            key={`pend-${i}`}
            icon="📝"
            gradient="lavender"
            title={p.leave_type}
            subtitle={`${fmt(p.start_date)} → ${fmt(p.end_date)} · ${p.days_requested}d`}
            onPress={() => router.push('/(tabs)/leave')}
            right={<StatusBadge status={p.status} />}
          />
        ))}

        {/* Announcements */}
        {announcements.length > 0 && (
          <>
            <View style={s.sectionRow}>
              <Text style={[s.sectionTitle, { color: colors.sub }]}>Announcements</Text>
              <TouchableOpacity onPress={() => router.push('/announcements')}>
                <Text style={s.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            {announcements.map(a => (
              <FeedItem
                key={a.id}
                icon={a.pinned ? '📌' : '📣'}
                gradient={CAT_GRADIENT[a.category] || 'coral'}
                title={a.title}
                subtitle={a.body}
                onPress={() => router.push('/announcements')}
                right={a.priority === 'high'
                  ? <PillTag label="HIGH" color="#E14F4A" size="sm" />
                  : <PillTag label={(a.category || 'general').toUpperCase()} color={CAT_COLORS[a.category] || '#8A8DA3'} size="sm" />
                }
              />
            ))}
          </>
        )}

        {/* Last payslip */}
        {payslip && (
          <FeedItem
            icon="💰"
            gradient="mint"
            title="Last Payslip"
            subtitle={`${fmt(payslip.period_start)} – ${fmt(payslip.period_end)}`}
            onPress={() => router.push('/(tabs)/payslips')}
            right={<PillTag label={`EGP ${fmtNum(payslip.net_salary)}`} color="#0E9F6E" size="sm" />}
          />
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
              placeholderTextColor="#B0B3C6"
              value={corrReason}
              onChangeText={setCorrReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={m.hint}>Your request will be sent to HR for review and manual adjustment.</Text>
            <TouchableOpacity onPress={submitCorrection} disabled={corrSaving} activeOpacity={0.85}>
              <LinearGradient colors={GRADIENTS.coral} style={[m.btn, corrSaving && m.btnDisabled]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {corrSaving ? <ActivityIndicator color="white" /> : <Text style={m.btnText}>Send to HR</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  )
}

const ci = StyleSheet.create({
  card:        { borderRadius: 26, padding: 22, marginBottom: 14, alignItems: 'center', overflow: 'hidden', shadowColor: '#12121C', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 22, elevation: 8 },
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
  btnTouchable:{ shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10, borderRadius: 48 },
  btn:         { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.55 },
  btnLabel:    { color: 'white', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  shiftRow:    { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  shiftText:   { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  doneNote:    { color: '#54E3C4', fontSize: 12, fontWeight: '700', marginTop: 14 },
})

const s = StyleSheet.create({
  safe:          { flex: 1 },
  scroll:        { padding: 16, paddingBottom: 130 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  greeting:      { fontSize: 12, fontWeight: '600' },
  name:          { fontSize: 18, fontWeight: '900' },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamBtn:       { height: 40, borderRadius: 20, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: '#8890B5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 1 },
  teamBtnText:   { fontSize: 13, fontWeight: '700' },
  bellBtn:       { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: '#8890B5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  bellIcon:      { fontSize: 18 },
  badge:         { position: 'absolute', top: -2, right: -2, backgroundColor: '#FF6B6B', borderRadius: 8, minWidth: 17, height: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: 'white' },
  badgeText:     { color: 'white', fontSize: 9, fontWeight: '800' },
  avatar:        { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
  avatarText:    { color: 'white', fontWeight: '800', fontSize: 14 },

  statsRow:      { flexDirection: 'row', gap: 10, marginBottom: 18 },

  pillsScroll:   { marginTop: 4, marginBottom: 16, marginHorizontal: -4 },
  pillsContent:  { paddingHorizontal: 4, gap: 8 },
  pill:          { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 76, borderWidth: 1, shadowColor: '#8890B5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 },
  pillNum:       { fontSize: 20, fontWeight: '900', marginBottom: 3 },
  pillName:      { fontSize: 10, textAlign: 'center', maxWidth: 68 },

  sectionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 6 },
  sectionTitle:  { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  seeAll:        { fontSize: 12, fontWeight: '700', color: '#2ED573' },

  errorBanner:     { backgroundColor: '#FFF6DD', borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FFE9AE' },
  errorBannerText: { fontSize: 12, color: '#92400e', fontWeight: '600', textAlign: 'center' },
  corrLink:      { alignSelf: 'center', marginTop: -6, marginBottom: 16, paddingVertical: 4 },
  corrLinkText:  { fontSize: 11, color: '#8A8DA3', textDecorationLine: 'underline' },
})

const m = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: 'white' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEF0F8' },
  title:      { fontSize: 16, fontWeight: '800', color: '#1A1B2E', flex: 1, marginRight: 12 },
  close:      { fontSize: 22, color: '#8A8DA3' },
  scroll:     { padding: 20 },
  infoBox:    { backgroundColor: '#F5F6FC', borderRadius: 16, padding: 14, marginBottom: 20 },
  infoLabel:  { fontSize: 11, fontWeight: '700', color: '#8A8DA3', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  infoRow:    { fontSize: 14, color: '#1A1B2E', fontWeight: '500', marginBottom: 4 },
  label:      { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  input:      { borderWidth: 1.5, borderColor: '#E3E6F3', borderRadius: 16, padding: 14, fontSize: 14, color: '#1A1B2E', backgroundColor: '#F5F6FC', minHeight: 100 },
  hint:       { fontSize: 12, color: '#8A8DA3', marginTop: 10, marginBottom: 24, lineHeight: 18 },
  btn:        { borderRadius: 16, padding: 16, alignItems: 'center' },
  btnDisabled:{ opacity: 0.6 },
  btnText:    { color: 'white', fontSize: 15, fontWeight: '800' },
})
