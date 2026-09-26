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
import { useLang } from '../src/context/LanguageContext'
import { ls, back } from '../src/utils/rtl'

const getStatusMeta = tr => ({
  pending:     { bg: '#fef9c3', color: '#854d0e', label: tr('Pending', 'قيد الانتظار', 'مستني') },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: tr('In Progress', 'قيد التنفيذ', 'شغالين عليه') },
  completed:   { bg: '#dcfce7', color: '#166534', label: tr('Completed', 'مكتمل', 'خلص') },
  cancelled:   { bg: '#fee2e2', color: '#991b1b', label: tr('Cancelled', 'ملغي', 'اتلغى') },
})

const getCycleTypes = tr => ({
  annual:      '📅 ' + tr('Annual', 'سنوي'),
  mid_year:    '🗓️ ' + tr('Mid-Year', 'نصف سنوي', 'نص السنة'),
  probation:   '🔍 ' + tr('Probation', 'فترة الاختبار'),
  quarterly:   '📊 ' + tr('Quarterly', 'ربع سنوي'),
  project:     '🚀 ' + tr('Project', 'مشروع'),
})

const humanize = v => String(v).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const recommendationLabel = (v, tr) => ({
  promote:            tr('Promote', 'ترقية'),
  promotion:          tr('Promotion', 'ترقية'),
  retain:             tr('Retain', 'الاستمرار'),
  confirm:            tr('Confirm', 'التثبيت'),
  confirm_employment: tr('Confirm Employment', 'تثبيت التعيين'),
  extend_probation:   tr('Extend Probation', 'مد فترة الاختبار'),
  salary_increase:    tr('Salary Increase', 'زيادة الراتب', 'زيادة المرتب'),
  training:           tr('Training', 'تدريب'),
  pip:                tr('Performance Improvement Plan', 'خطة تحسين الأداء'),
  improvement_plan:   tr('Improvement Plan', 'خطة تحسين الأداء'),
  terminate:          tr('Terminate', 'إنهاء الخدمة'),
  no_change:          tr('No Change', 'بدون تغيير'),
}[v] || humanize(v))

const STAR_COLOR = '#f59e0b'

// A malformed `ratings` JSON string from the backend would otherwise throw
// uncaught during render and crash this screen.
const safeParseRatings = raw => {
  if (!raw) return null
  if (typeof raw !== 'string') return raw
  try { return JSON.parse(raw) } catch { return null }
}

function Stars({ rating, max = 5 }) {
  const { tr } = useLang()
  if (!rating) return <Text style={{ color: '#94a3b8', fontSize: 12 }}>{tr('Not rated', 'لم يُقيَّم بعد', 'لسه متقيّمش')}</Text>
  const r = Math.round(Number(rating))
  return (
    <Text style={{ fontSize: 15, letterSpacing: ls(1) }}>
      {'★'.repeat(r)}{'☆'.repeat(Math.max(0, max - r))}
    </Text>
  )
}

export default function AppraisalsScreen() {
  const { user }   = useAuth()
  const { colors } = useTheme()
  const router     = useRouter()
  const { tr }     = useLang()
  const STATUS_META = getStatusMeta(tr)
  const CYCLE_TYPES = getCycleTypes(tr)

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
          <Text style={[s.backText, { color: colors.text }]}>{back}</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.text }]}>{tr('Appraisals', 'تقييمات الأداء')}</Text>
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
              <Text style={[s.statLabel, { color: colors.sub }]}>{tr('Total', 'الإجمالي')}</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: colors.card }]}>
              <Text style={[s.statVal, { color: '#166534' }]}>{completed.length}</Text>
              <Text style={[s.statLabel, { color: colors.sub }]}>{tr('Completed', 'مكتملة', 'خلصت')}</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: colors.card }]}>
              {avgRating ? (
                <>
                  <Text style={[s.statVal, { color: STAR_COLOR }]}>{avgRating.toFixed(1)}</Text>
                  <Text style={[s.statLabel, { color: colors.sub }]}>{tr('Avg Rating', 'متوسط التقييم')}</Text>
                </>
              ) : (
                <>
                  <Text style={[s.statVal, { color: colors.sub }]}>—</Text>
                  <Text style={[s.statLabel, { color: colors.sub }]}>{tr('Avg Rating', 'متوسط التقييم')}</Text>
                </>
              )}
            </View>
          </View>
        )}

        {appraisals.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={[s.emptyText, { color: colors.sub }]}>{tr('No appraisals yet', 'لا توجد تقييمات أداء بعد', 'لسه مفيش تقييمات')}</Text>
          </View>
        ) : appraisals.map(ap => {
          const sm       = STATUS_META[ap.status] || STATUS_META.pending
          const isOpen   = expanded === ap.id
          const ratings  = safeParseRatings(ap.ratings)

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
                  <Text style={[s.ratingLabel, { color: colors.sub }]}>{tr('Overall Rating', 'التقييم العام')}</Text>
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
                      <Text style={[s.detailTitle, { color: colors.text }]}>{tr('Competency Ratings', 'تقييم الكفاءات')}</Text>
                      {Object.entries(ratings).map(([key, val]) => (
                        <View key={key} style={s.competencyRow}>
                          <Text style={[s.competencyName, { color: colors.text }]}>
                            {humanize(key)}
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
                      <Text style={[s.detailTitle, { color: colors.text }]}>{tr('Self Assessment', 'التقييم الذاتي')}</Text>
                      <Text style={[s.detailBody, { color: colors.sub }]}>{ap.self_assessment}</Text>
                    </View>
                  ) : null}

                  {/* Manager comments */}
                  {ap.manager_comments ? (
                    <View style={s.detailBlock}>
                      <Text style={[s.detailTitle, { color: colors.text }]}>{tr('Manager Comments', 'ملاحظات المدير')}</Text>
                      <Text style={[s.detailBody, { color: colors.sub }]}>{ap.manager_comments}</Text>
                    </View>
                  ) : null}

                  {/* Recommendation */}
                  {ap.recommendation ? (
                    <View style={[s.recommendBadge, { backgroundColor: colors.bg }]}>
                      <Text style={[s.recommendLabel, { color: colors.sub }]}>{tr('Recommendation', 'التوصية')}</Text>
                      <Text style={[s.recommendVal, { color: colors.text }]}>
                        {recommendationLabel(ap.recommendation, tr)}
                      </Text>
                    </View>
                  ) : null}

                  {ap.status === 'pending' && !ap.self_assessment && (
                    <Text style={[s.pendingNote, { color: colors.sub }]}>
                      {tr("Your appraisal is being prepared by HR. You'll be notified when it's ready for review.", 'تقوم إدارة الموارد البشرية بإعداد تقييمك، وسيصلك إشعار عندما يصبح جاهزاً للمراجعة.', 'الـ HR بيجهّزوا تقييمك، وهيوصلك إشعار أول ما يبقى جاهز للمراجعة.')}
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
  detailTitle:    { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: ls(0.4) },
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
