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

const STATUS_META = {
  pending:     { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  completed:   { bg: '#dcfce7', color: '#166534', label: 'Completed' },
  cancelled:   { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
}

const CYCLE_TYPES = {
  annual:      '📅 Annual',
  mid_year:    '🗓️ Mid-Year',
  probation:   '🔍 Probation',
  quarterly:   '📊 Quarterly',
  project:     '🚀 Project',
}

const STAR_COLOR = '#f59e0b'

function Stars({ rating, max = 5 }) {
  if (!rating) return <Text style={{ color: '#94a3b8', fontSize: 12 }}>Not rated</Text>
  const r = Math.round(Number(rating))
  return (
    <Text style={{ fontSize: 15, letterSpacing: 1 }}>
      {'★'.repeat(r)}{'☆'.repeat(Math.max(0, max - r))}
    </Text>
  )
}

export default function AppraisalsScreen() {
  const { user }   = useAuth()
  const { colors } = useTheme()
  const router     = useRouter()

  const [appraisals, setAppraisals] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded,   setExpanded]   = useState(null)

  const load = useCallback(async () => {
    try {
      const empId = user?.employee_id
      const url   = empId ? `/appraisals?employee_id=${empId}&limit=50` : '/appraisals?limit=50'
      const r     = await api.get(url)
      setAppraisals(r.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [user])

  useEffect(() => { load() }, [])

  const completed = appraisals.filter(a => a.status === 'completed')
  const avgRating = completed.length
    ? completed.reduce((s, a) => s + Number(a.overall_rating || 0), 0) / completed.length
    : null

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
        <Text style={[s.navTitle, { color: colors.text }]}>Appraisals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        {appraisals.length > 0 && (
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: colors.card }]}>
              <Text style={[s.statVal, { color: colors.text }]}>{appraisals.length}</Text>
              <Text style={[s.statLabel, { color: colors.sub }]}>Total</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: colors.card }]}>
              <Text style={[s.statVal, { color: '#166534' }]}>{completed.length}</Text>
              <Text style={[s.statLabel, { color: colors.sub }]}>Completed</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: colors.card }]}>
              {avgRating ? (
                <>
                  <Text style={[s.statVal, { color: STAR_COLOR }]}>{avgRating.toFixed(1)}</Text>
                  <Text style={[s.statLabel, { color: colors.sub }]}>Avg Rating</Text>
                </>
              ) : (
                <>
                  <Text style={[s.statVal, { color: colors.sub }]}>—</Text>
                  <Text style={[s.statLabel, { color: colors.sub }]}>Avg Rating</Text>
                </>
              )}
            </View>
          </View>
        )}

        {appraisals.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={[s.emptyText, { color: colors.sub }]}>No appraisals yet</Text>
          </View>
        ) : appraisals.map(ap => {
          const sm       = STATUS_META[ap.status] || STATUS_META.pending
          const isOpen   = expanded === ap.id
          const ratings  = ap.ratings ? (typeof ap.ratings === 'string' ? JSON.parse(ap.ratings) : ap.ratings) : null

          return (
            <TouchableOpacity
              key={ap.id}
              activeOpacity={0.85}
              onPress={() => setExpanded(isOpen ? null : ap.id)}
              style={[s.card, { backgroundColor: colors.card }]}
            >
              {/* Card header */}
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cycleName, { color: colors.text }]} numberOfLines={1}>
                    {ap.cycle_name}
                  </Text>
                  <Text style={[s.cycleType, { color: colors.sub }]}>
                    {CYCLE_TYPES[ap.cycle_type] || ap.cycle_type}
                  </Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: sm.bg }]}>
                  <Text style={[s.statusText, { color: sm.color }]}>{sm.label}</Text>
                </View>
              </View>

              {/* Rating row */}
              <View style={s.ratingRow}>
                <View>
                  <Text style={[s.ratingLabel, { color: colors.sub }]}>Overall Rating</Text>
                  <View style={s.starsRow}>
                    <Stars rating={ap.overall_rating} />
                    {ap.overall_rating ? (
                      <Text style={[s.ratingNum, { color: STAR_COLOR }]}>
                        {' '}{Number(ap.overall_rating).toFixed(1)} / 5
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text style={[s.chevron, { color: colors.sub }]}>{isOpen ? '▲' : '▼'}</Text>
              </View>

              {/* Expanded details */}
              {isOpen && (
                <View style={[s.details, { borderTopColor: colors.border }]}>

                  {/* Competency ratings */}
                  {ratings && Object.keys(ratings).length > 0 && (
                    <View style={s.detailBlock}>
                      <Text style={[s.detailTitle, { color: colors.text }]}>Competency Ratings</Text>
                      {Object.entries(ratings).map(([key, val]) => (
                        <View key={key} style={s.competencyRow}>
                          <Text style={[s.competencyName, { color: colors.text }]}>
                            {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </Text>
                          <View style={s.barWrap}>
                            <View style={[s.barFill, { width: `${(Number(val) / 5) * 100}%`, backgroundColor: STAR_COLOR }]} />
                          </View>
                          <Text style={[s.barNum, { color: colors.sub }]}>{Number(val).toFixed(1)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Self assessment */}
                  {ap.self_assessment ? (
                    <View style={s.detailBlock}>
                      <Text style={[s.detailTitle, { color: colors.text }]}>Self Assessment</Text>
                      <Text style={[s.detailBody, { color: colors.sub }]}>{ap.self_assessment}</Text>
                    </View>
                  ) : null}

                  {/* Manager comments */}
                  {ap.manager_comments ? (
                    <View style={s.detailBlock}>
                      <Text style={[s.detailTitle, { color: colors.text }]}>Manager Comments</Text>
                      <Text style={[s.detailBody, { color: colors.sub }]}>{ap.manager_comments}</Text>
                    </View>
                  ) : null}

                  {/* Recommendation */}
                  {ap.recommendation ? (
                    <View style={[s.recommendBadge, { backgroundColor: colors.bg }]}>
                      <Text style={[s.recommendLabel, { color: colors.sub }]}>Recommendation</Text>
                      <Text style={[s.recommendVal, { color: colors.text }]}>
                        {ap.recommendation.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </Text>
                    </View>
                  ) : null}

                  {ap.status === 'pending' && !ap.self_assessment && (
                    <Text style={[s.pendingNote, { color: colors.sub }]}>
                      Your appraisal is being prepared by HR. You'll be notified when it's ready for review.
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:           { flex: 1 },
  nav:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  back:           { width: 40 },
  backText:       { fontSize: 28, lineHeight: 32 },
  navTitle:       { fontSize: 17, fontWeight: '700' },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:         { padding: 16, paddingBottom: 40, gap: 10 },
  statsRow:       { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statCard:       { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statVal:        { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  statLabel:      { fontSize: 11 },
  empty:          { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:      { fontSize: 48, marginBottom: 12 },
  emptyText:      { fontSize: 14 },
  card:           { borderRadius: 16, padding: 16 },
  cardTop:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  cycleName:      { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cycleType:      { fontSize: 12 },
  statusBadge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:     { fontSize: 11, fontWeight: '700' },
  ratingRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingLabel:    { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  starsRow:       { flexDirection: 'row', alignItems: 'center' },
  ratingNum:      { fontSize: 13, fontWeight: '700' },
  chevron:        { fontSize: 12 },
  details:        { marginTop: 14, paddingTop: 14, borderTopWidth: 1, gap: 14 },
  detailBlock:    { gap: 6 },
  detailTitle:    { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  detailBody:     { fontSize: 13, lineHeight: 20 },
  competencyRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  competencyName: { flex: 1, fontSize: 12 },
  barWrap:        { width: 80, height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  barFill:        { height: 6, borderRadius: 3 },
  barNum:         { width: 28, fontSize: 11, textAlign: 'right' },
  recommendBadge: { borderRadius: 10, padding: 12 },
  recommendLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  recommendVal:   { fontSize: 14, fontWeight: '700' },
  pendingNote:    { fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
})
