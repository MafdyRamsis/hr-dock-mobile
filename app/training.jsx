import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../src/context/AuthContext'
import { useTheme } from '../src/context/ThemeContext'
import api from '../src/services/api'

const fmt = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'

const STATUS_STYLE = {
  planned:    { bg: '#f1f5f9', color: '#475569', icon: '📅' },
  in_progress:{ bg: '#dbeafe', color: '#1e40af', icon: '▶️' },
  completed:  { bg: '#dcfce7', color: '#166534', icon: '✅' },
  cancelled:  { bg: '#fee2e2', color: '#991b1b', icon: '❌' },
  expired:    { bg: '#fef9c3', color: '#854d0e', icon: '⚠️' },
}

const TYPE_ICONS = {
  internal: '🏢',
  external: '🌐',
  online:   '💻',
  on_job:   '🔧',
  other:    '📚',
}

export default function TrainingScreen() {
  const { user }   = useAuth()
  const { colors } = useTheme()
  const router     = useRouter()

  const [records,    setRecords]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter,     setFilter]     = useState('all')

  const load = useCallback(async () => {
    try {
      const empId = user?.employee_id
      const url   = empId ? `/training?employee_id=${empId}&limit=100` : '/training?limit=100'
      const r     = await api.get(url)
      setRecords(r.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [user])

  useEffect(() => { load() }, [])

  const FILTERS = ['all', 'planned', 'in_progress', 'completed']

  const filtered = filter === 'all' ? records : records.filter(r => r.status === filter)

  const completedCount = records.filter(r => r.status === 'completed').length
  const upcomingCount  = records.filter(r => r.status === 'planned').length

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={s.center}><ActivityIndicator color="#2563eb" size="large" /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Nav */}
      <View style={[s.nav, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={[s.backText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.text }]}>Training</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        {records.length > 0 && (
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: colors.card }]}>
              <Text style={[s.statVal, { color: colors.text }]}>{completedCount}</Text>
              <Text style={[s.statLabel, { color: colors.sub }]}>Completed</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: colors.card }]}>
              <Text style={[s.statVal, { color: colors.text }]}>{upcomingCount}</Text>
              <Text style={[s.statLabel, { color: colors.sub }]}>Upcoming</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: colors.card }]}>
              <Text style={[s.statVal, { color: colors.text }]}>{records.length}</Text>
              <Text style={[s.statLabel, { color: colors.sub }]}>Total</Text>
            </View>
          </View>
        )}

        {/* Filter chips */}
        <View style={s.chips}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[s.chip, filter === f && s.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.chipText, filter === f && s.chipTextActive]}>
                {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🎓</Text>
            <Text style={[s.emptyText, { color: colors.sub }]}>
              {filter === 'all' ? 'No training records yet' : `No ${filter.replace('_',' ')} courses`}
            </Text>
          </View>
        ) : filtered.map(rec => {
          const ss = STATUS_STYLE[rec.status] || STATUS_STYLE.planned
          return (
            <View key={rec.id} style={[s.card, { backgroundColor: colors.card }]}>
              <View style={s.cardTop}>
                <Text style={s.typeIcon}>{TYPE_ICONS[rec.training_type] || '📚'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.courseName, { color: colors.text }]} numberOfLines={2}>{rec.course_name}</Text>
                  {rec.provider ? (
                    <Text style={[s.provider, { color: colors.sub }]}>{rec.provider}</Text>
                  ) : null}
                </View>
                <View style={[s.statusBadge, { backgroundColor: ss.bg }]}>
                  <Text style={[s.statusText, { color: ss.color }]}>{ss.icon} {rec.status?.replace('_',' ')}</Text>
                </View>
              </View>

              <View style={[s.datesRow, { borderTopColor: colors.border }]}>
                {rec.completion_date ? (
                  <View style={s.dateItem}>
                    <Text style={[s.dateLabel, { color: colors.sub }]}>Completed</Text>
                    <Text style={[s.dateVal, { color: colors.text }]}>{fmt(rec.completion_date)}</Text>
                  </View>
                ) : null}
                {rec.expiry_date ? (
                  <View style={s.dateItem}>
                    <Text style={[s.dateLabel, { color: colors.sub }]}>Expires</Text>
                    <Text style={[s.dateVal, { color: new Date(rec.expiry_date) < new Date() ? '#dc2626' : colors.text }]}>
                      {fmt(rec.expiry_date)}
                    </Text>
                  </View>
                ) : null}
                {rec.certificate_number ? (
                  <View style={s.dateItem}>
                    <Text style={[s.dateLabel, { color: colors.sub }]}>Certificate</Text>
                    <Text style={[s.dateVal, { color: colors.text }]}>{rec.certificate_number}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  nav:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  back:        { width: 40 },
  backText:    { fontSize: 28, lineHeight: 32 },
  navTitle:    { fontSize: 17, fontWeight: '700' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:      { padding: 16, paddingBottom: 40 },
  statsRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:    { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statVal:     { fontSize: 26, fontWeight: '900' },
  statLabel:   { fontSize: 11, marginTop: 2 },
  chips:       { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  chip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#e2e8f0' },
  chipActive:  { backgroundColor: '#1e3a8a' },
  chipText:    { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: 'white' },
  empty:       { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:   { fontSize: 48, marginBottom: 12 },
  emptyText:   { fontSize: 14 },
  card:        { borderRadius: 16, padding: 14, marginBottom: 10 },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  typeIcon:    { fontSize: 26, marginTop: 2 },
  courseName:  { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  provider:    { fontSize: 12 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0 },
  statusText:  { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  datesRow:    { flexDirection: 'row', borderTopWidth: 1, paddingTop: 10, gap: 12, flexWrap: 'wrap' },
  dateItem:    { minWidth: 80 },
  dateLabel:   { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  dateVal:     { fontSize: 12, fontWeight: '600' },
})
