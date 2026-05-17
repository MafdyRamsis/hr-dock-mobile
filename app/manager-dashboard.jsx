import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/context/ThemeContext'
import api from '../src/services/api'

const fmt = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'
const fmtTime = iso => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d) ? iso.slice(0, 5) : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_COLOR = {
  present:  { bg: '#dcfce7', color: '#166534' },
  late:     { bg: '#fef9c3', color: '#854d0e' },
  absent:   { bg: '#fee2e2', color: '#991b1b' },
  on_leave: { bg: '#dbeafe', color: '#1e40af' },
  half_day: { bg: '#fce7f3', color: '#9d174d' },
}

export default function ManagerDashboard() {
  const { colors } = useTheme()
  const router = useRouter()
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [todayLogs,  setTodayLogs]  = useState([])
  const [pending,    setPending]    = useState([])
  const [stats,      setStats]      = useState({ present:0, late:0, absent:0, on_leave:0, notYet:0 })

  const load = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const [attRes, leaveRes] = await Promise.allSettled([
        api.get(`/attendance/logs?from_date=${today}&to_date=${today}&limit=200`),
        api.get('/leave/requests?status=pending&limit=50'),
      ])

      if (attRes.status === 'fulfilled') {
        const raw = attRes.value.data.data
        const rows = Array.isArray(raw) ? raw : (raw?.rows || [])
        setTodayLogs(rows)
        const s = { present:0, late:0, absent:0, on_leave:0, notYet:0 }
        rows.forEach(l => {
          if (l.status === 'present')  s.present++
          else if (l.status === 'late') s.late++
          else if (l.status === 'absent') s.absent++
          else if (l.status === 'on_leave') s.on_leave++
        })
        setStats(s)
      }

      if (leaveRes.status === 'fulfilled') {
        const raw = leaveRes.value.data.data
        setPending(Array.isArray(raw) ? raw : (raw?.rows || []))
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={s.center}><ActivityIndicator color="#2563eb" size="large" /></View>
    </SafeAreaView>
  )

  const KPI_ITEMS = [
    { label: 'Present',  value: stats.present,  bg: '#dcfce7', color: '#166534' },
    { label: 'Late',     value: stats.late,      bg: '#fef9c3', color: '#854d0e' },
    { label: 'Absent',   value: stats.absent,    bg: '#fee2e2', color: '#991b1b' },
    { label: 'On Leave', value: stats.on_leave,  bg: '#dbeafe', color: '#1e40af' },
  ]

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Nav */}
      <View style={[s.nav, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={[s.backText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.text }]}>Manager Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Date */}
        <Text style={[s.dateLabel, { color: colors.sub }]}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>

        {/* KPI grid */}
        <View style={s.kpiGrid}>
          {KPI_ITEMS.map(k => (
            <View key={k.label} style={[s.kpiCard, { backgroundColor: k.bg }]}>
              <Text style={[s.kpiVal, { color: k.color }]}>{k.value}</Text>
              <Text style={[s.kpiLabel, { color: k.color }]}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Pending Leave Approvals */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={[s.sectionTitle, { color: colors.sub }]}>
              Pending Leave ({pending.length})
            </Text>
            {pending.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/leave-approvals')}>
                <Text style={s.seeAll}>Review all →</Text>
              </TouchableOpacity>
            )}
          </View>

          {pending.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: colors.card }]}>
              <Text style={s.emptyIcon}>✅</Text>
              <Text style={[s.emptyText, { color: colors.sub }]}>No pending requests</Text>
            </View>
          ) : pending.slice(0, 5).map(p => (
            <TouchableOpacity
              key={p.id}
              style={[s.leaveCard, { backgroundColor: colors.card }]}
              onPress={() => router.push('/leave-approvals')}
              activeOpacity={0.8}
            >
              <View style={s.leaveTop}>
                <View style={s.leaveAvatar}>
                  <Text style={s.leaveAvatarText}>
                    {(p.employee_name || p.first_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.leaveName, { color: colors.text }]} numberOfLines={1}>
                    {p.employee_name || `${p.first_name} ${p.last_name}`}
                  </Text>
                  <Text style={[s.leaveMeta, { color: colors.sub }]}>
                    {p.leave_type_name || p.leave_type} · {p.days || '—'} day(s)
                  </Text>
                </View>
                <View style={s.pendingBadge}>
                  <Text style={s.pendingText}>Pending</Text>
                </View>
              </View>
              <Text style={[s.leaveDates, { color: colors.sub }]}>
                {fmt(p.start_date)} → {fmt(p.end_date)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Attendance */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.sub }]}>
            Today's Attendance ({todayLogs.length})
          </Text>

          {todayLogs.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: colors.card }]}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={[s.emptyText, { color: colors.sub }]}>No attendance records yet today</Text>
            </View>
          ) : todayLogs.map(l => {
            const sc = STATUS_COLOR[l.status] || { bg: '#f1f5f9', color: '#475569' }
            return (
              <View key={l.id} style={[s.attCard, { backgroundColor: colors.card }]}>
                <View style={s.attRow}>
                  <View style={s.attAvatar}>
                    <Text style={s.attAvatarText}>
                      {(l.employee_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.attName, { color: colors.text }]} numberOfLines={1}>{l.employee_name}</Text>
                    <Text style={[s.attTimes, { color: colors.sub }]}>
                      In: {fmtTime(l.check_in)} · Out: {fmtTime(l.check_out)}
                    </Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusText, { color: sc.color }]}>
                      {(l.status || 'present').replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  nav:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  back:         { width: 40 },
  backText:     { fontSize: 28, lineHeight: 32 },
  navTitle:     { fontSize: 17, fontWeight: '700' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:       { padding: 16, paddingBottom: 40 },
  dateLabel:    { fontSize: 13, marginBottom: 16 },
  kpiGrid:      { flexDirection: 'row', gap: 10, marginBottom: 24 },
  kpiCard:      { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  kpiVal:       { fontSize: 28, fontWeight: '900' },
  kpiLabel:     { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },
  section:      { marginBottom: 24 },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  seeAll:       { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  emptyCard:    { borderRadius: 14, padding: 28, alignItems: 'center' },
  emptyIcon:    { fontSize: 32, marginBottom: 8 },
  emptyText:    { fontSize: 14 },
  leaveCard:    { borderRadius: 14, padding: 14, marginBottom: 8 },
  leaveTop:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  leaveAvatar:  { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center' },
  leaveAvatarText: { color: 'white', fontSize: 12, fontWeight: '700' },
  leaveName:    { fontSize: 14, fontWeight: '600' },
  leaveMeta:    { fontSize: 12, marginTop: 1 },
  leaveDates:   { fontSize: 12, marginLeft: 46 },
  pendingBadge: { backgroundColor: '#fef9c3', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  pendingText:  { fontSize: 11, color: '#854d0e', fontWeight: '600' },
  attCard:      { borderRadius: 14, padding: 12, marginBottom: 8 },
  attRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  attAvatar:    { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center' },
  attAvatarText:{ color: 'white', fontSize: 11, fontWeight: '700' },
  attName:      { fontSize: 13, fontWeight: '600' },
  attTimes:     { fontSize: 11, marginTop: 2 },
  statusBadge:  { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:   { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
})
