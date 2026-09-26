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

const fmtAmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })

const getPlanMeta = tr => ({
  health:         { emoji: '🏥', color: '#0ea5e9', bg: '#f0f9ff', label: tr('Health Insurance', 'التأمين الصحي') },
  life:           { emoji: '🛡️', color: '#8b5cf6', bg: '#faf5ff', label: tr('Life Insurance', 'التأمين على الحياة') },
  transportation: { emoji: '🚌', color: '#f59e0b', bg: '#fffbeb', label: tr('Transportation', 'بدل انتقال', 'مواصلات') },
  mobile:         { emoji: '📱', color: '#10b981', bg: '#f0fdf4', label: tr('Mobile Allowance', 'بدل هاتف', 'بدل موبايل') },
  meal:           { emoji: '🍽️', color: '#f97316', bg: '#fff7ed', label: tr('Meal Allowance', 'بدل وجبة', 'بدل أكل') },
  gym:            { emoji: '💪', color: '#ec4899', bg: '#fdf2f8', label: tr('Gym / Wellness', 'نادٍ رياضي / صحة', 'جيم / صحة') },
  education:      { emoji: '🎓', color: '#6366f1', bg: '#eef2ff', label: tr('Education Support', 'دعم تعليمي') },
  other:          { emoji: '🎁', color: '#64748b', bg: '#f8fafc', label: tr('Other Benefit', 'ميزة أخرى', 'ميزة تانية') },
})

const getCompMeta = tr => ({
  housing:         { emoji: '🏠', color: '#0ea5e9', bg: '#f0f9ff', label: tr('Housing Allowance', 'بدل سكن') },
  transportation:  { emoji: '🚌', color: '#f59e0b', bg: '#fffbeb', label: tr('Transportation', 'بدل انتقال', 'مواصلات') },
  mobile:          { emoji: '📱', color: '#10b981', bg: '#f0fdf4', label: tr('Mobile Allowance', 'بدل هاتف', 'بدل موبايل') },
  meal:            { emoji: '🍽️', color: '#f97316', bg: '#fff7ed', label: tr('Meal Allowance', 'بدل وجبة', 'بدل أكل') },
  other_allowance: { emoji: '🎁', color: '#64748b', bg: '#f8fafc', label: tr('Other Allowance', 'بدل آخر', 'بدل تاني') },
})

const coverageLabel = (v, tr) => ({
  employee:          tr('Employee only', 'الموظف فقط', 'الموظف بس'),
  employee_only:     tr('Employee only', 'الموظف فقط', 'الموظف بس'),
  employee_spouse:   tr('Employee + Spouse', 'الموظف والزوج/الزوجة'),
  employee_children: tr('Employee + Children', 'الموظف والأبناء', 'الموظف والأولاد'),
  family:            tr('Family', 'الأسرة', 'العيلة'),
}[v] || v)

export default function BenefitsScreen() {
  const { user }   = useAuth()
  const { colors } = useTheme()
  const router     = useRouter()
  const { tr, date, cur } = useLang()
  const PLAN_META = getPlanMeta(tr)
  const COMP_META = getCompMeta(tr)
  const planMeta  = type => PLAN_META[type]  || PLAN_META.other
  const compMeta  = type => COMP_META[type]  || COMP_META.other_allowance
  const fmt       = d => d ? date(d) : '—'

  const [enrollments, setEnrollments] = useState([])
  const [components,  setComponents]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const empId = user?.employee_id
    try {
      // Without a resolved employee_id (e.g. an admin/hr_manager account not
      // linked to an employee record), skip the enrollments call entirely
      // rather than falling through to the backend's unscoped default,
      // which would dump every enrollment in the company onto this
      // "My Benefits" screen.
      if (!empId) { setEnrollments([]); setComponents([]); return }
      const [enRes, compRes] = await Promise.allSettled([
        api.get(`/benefits/enrollments?employee_id=${empId}`),
        api.get(`/payroll/components/${empId}`),
      ])
      if (enRes.status   === 'fulfilled') setEnrollments(enRes.value.data.data   || [])
      if (compRes.status === 'fulfilled') setComponents(compRes.value.data.data  || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [user])

  useEffect(() => { load() }, [])

  const allowances = components.filter(c => c.type !== 'deduction')
  const totalAllowances = allowances.reduce((s, c) => s + Number(c.amount || 0), 0)

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
        <Text style={[s.navTitle, { color: colors.text }]}>{tr('My Benefits', 'مزاياي', 'المزايا بتاعتي')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary strip */}
        {(enrollments.length > 0 || allowances.length > 0) && (
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { backgroundColor: colors.card }]}>
              <Text style={[s.summaryVal, { color: colors.text }]}>{enrollments.length}</Text>
              <Text style={[s.summaryLabel, { color: colors.sub }]}>{tr('Plans', 'الخطط')}</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: colors.card }]}>
              <Text style={[s.summaryVal, { color: colors.text }]}>{allowances.length}</Text>
              <Text style={[s.summaryLabel, { color: colors.sub }]}>{tr('Allowances', 'البدلات')}</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: '#0F1829' }]}>
              <Text style={[s.summaryVal, { color: 'white', fontSize: 14 }]}>{cur} {fmtAmt(totalAllowances)}</Text>
              <Text style={[s.summaryLabel, { color: 'rgba(255,255,255,0.6)' }]}>{tr('Monthly Allowances', 'البدلات الشهرية')}</Text>
            </View>
          </View>
        )}

        {/* Benefit plan enrollments */}
        {enrollments.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.sub }]}>{tr('Enrolled Benefit Plans', 'خطط المزايا المشترك بها', 'المزايا اللي انت مشترك فيها')}</Text>
            {enrollments.map(en => {
              const meta = planMeta(en.plan_type)
              return (
                <View key={en.id} style={[s.card, { backgroundColor: colors.card }]}>
                  <View style={s.cardRow}>
                    <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
                      <Text style={s.iconEmoji}>{meta.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cardTitle, { color: colors.text }]}>{en.plan_name}</Text>
                      <Text style={[s.cardSub, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <View style={[s.typeBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[s.typeText, { color: meta.color }]}>{tr('Active', 'سارية', 'شغّالة')}</Text>
                    </View>
                  </View>
                  <View style={[s.cardMeta, { borderTopColor: colors.border }]}>
                    <View style={s.metaItem}>
                      <Text style={[s.metaLabel, { color: colors.sub }]}>{tr('Coverage', 'التغطية')}</Text>
                      <Text style={[s.metaVal, { color: colors.text }]}>{en.coverage_type ? coverageLabel(en.coverage_type, tr) : '—'}</Text>
                    </View>
                    <View style={s.metaItem}>
                      <Text style={[s.metaLabel, { color: colors.sub }]}>{tr('Since', 'منذ', 'من')}</Text>
                      <Text style={[s.metaVal, { color: colors.text }]}>{fmt(en.start_date)}</Text>
                    </View>
                    <View style={s.metaItem}>
                      <Text style={[s.metaLabel, { color: colors.sub }]}>{tr('Until', 'حتى', 'لحد')}</Text>
                      <Text style={[s.metaVal, { color: colors.text }]}>{en.end_date ? fmt(en.end_date) : tr('Ongoing', 'مستمرة', 'مستمر')}</Text>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Payroll allowances */}
        {allowances.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.sub }]}>{tr('Salary Allowances', 'بدلات الراتب', 'بدلات المرتب')}</Text>
            {allowances.map(comp => {
              const meta = compMeta(comp.type)
              return (
                <View key={comp.id} style={[s.card, { backgroundColor: colors.card }]}>
                  <View style={s.cardRow}>
                    <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
                      <Text style={s.iconEmoji}>{meta.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cardTitle, { color: colors.text }]}>{comp.name}</Text>
                      <Text style={[s.cardSub, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <View style={s.amtWrap}>
                      <Text style={[s.amtVal, { color: colors.text }]}>{cur} {fmtAmt(comp.amount)}</Text>
                      <Text style={[s.amtFreq, { color: colors.sub }]}>{tr('/month', '/شهرياً', '/في الشهر')}</Text>
                    </View>
                  </View>
                  <View style={[s.cardMeta, { borderTopColor: colors.border }]}>
                    <View style={s.metaItem}>
                      <Text style={[s.metaLabel, { color: colors.sub }]}>{tr('Taxable', 'خاضع للضريبة', 'عليه ضريبة')}</Text>
                      <Text style={[s.metaVal, { color: colors.text }]}>{comp.is_taxable ? tr('Yes', 'نعم', 'أيوه') : tr('No', 'لا')}</Text>
                    </View>
                    <View style={s.metaItem}>
                      <Text style={[s.metaLabel, { color: colors.sub }]}>{tr('Effective', 'يسري من', 'ساري من')}</Text>
                      <Text style={[s.metaVal, { color: colors.text }]}>{fmt(comp.effective_from)}</Text>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {enrollments.length === 0 && allowances.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🎁</Text>
            <Text style={[s.emptyText, { color: colors.sub }]}>{tr('No benefits on record', 'لا توجد مزايا مسجلة', 'لسه مفيش مزايا متسجلة')}</Text>
          </View>
        )}
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
  scroll:       { padding: 16, paddingBottom: 40, gap: 12 },
  summaryRow:   { flexDirection: 'row', gap: 10, marginBottom: 4 },
  summaryCard:  { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  summaryVal:   { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  summaryLabel: { fontSize: 11, fontWeight: '500' },
  section:      { gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: ls(0.5), marginBottom: 2 },
  card:         { borderRadius: 16, padding: 14 },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconWrap:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconEmoji:    { fontSize: 22 },
  cardTitle:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardSub:      { fontSize: 12, fontWeight: '600' },
  typeBadge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeText:     { fontSize: 11, fontWeight: '700' },
  amtWrap:      { alignItems: 'flex-end' },
  amtVal:       { fontSize: 15, fontWeight: '800' },
  amtFreq:      { fontSize: 11 },
  cardMeta:     { flexDirection: 'row', gap: 16, borderTopWidth: 1, paddingTop: 10 },
  metaItem:     { flex: 1 },
  metaLabel:    { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  metaVal:      { fontSize: 12, fontWeight: '600' },
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyText:    { fontSize: 14 },
})
