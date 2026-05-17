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

const fmt    = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'
const fmtNum = n => n != null ? Number(n).toLocaleString('en-EG', { minimumFractionDigits: 2 }) : '—'

const STATUS_STYLE = {
  active:    { bg: '#dbeafe', color: '#1e40af' },
  completed: { bg: '#dcfce7', color: '#166534' },
  cancelled: { bg: '#f1f5f9', color: '#475569' },
  pending:   { bg: '#fef9c3', color: '#854d0e' },
}

export default function LoansScreen() {
  const { user }   = useAuth()
  const { colors } = useTheme()
  const router     = useRouter()

  const [loans,      setLoans]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const empId = user?.employee_id
      const url   = empId ? `/loans?employee_id=${empId}` : '/loans'
      const r     = await api.get(url)
      setLoans(r.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [user])

  useEffect(() => { load() }, [])

  const activeLoans = loans.filter(l => l.status === 'active')
  const totalRemaining = activeLoans.reduce((s, l) => s + Number(l.remaining_amount || 0), 0)
  const totalMonthly   = activeLoans.reduce((s, l) => s + Number(l.monthly_deduction || 0), 0)

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
        <Text style={[s.navTitle, { color: colors.text }]}>Loans</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card if active loans exist */}
        {activeLoans.length > 0 && (
          <View style={s.summaryCard}>
            <View style={s.summaryRow}>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>Outstanding Balance</Text>
                <Text style={s.summaryVal}>EGP {fmtNum(totalRemaining)}</Text>
              </View>
              <View style={[s.summaryDivider]} />
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>Monthly Deduction</Text>
                <Text style={[s.summaryVal, { color: '#E8583C' }]}>EGP {fmtNum(totalMonthly)}</Text>
              </View>
            </View>
          </View>
        )}

        {loans.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💳</Text>
            <Text style={[s.emptyText, { color: colors.sub }]}>No loans on record</Text>
          </View>
        ) : loans.map(loan => {
          const ss = STATUS_STYLE[loan.status] || STATUS_STYLE.active
          const pct = loan.amount > 0 ? Math.min(100, (Number(loan.paid_amount) / Number(loan.amount)) * 100) : 0
          return (
            <View key={loan.id} style={[s.card, { backgroundColor: colors.card }]}>
              {/* Header */}
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.loanReason, { color: colors.text }]} numberOfLines={1}>
                    {loan.reason || 'Loan'}
                  </Text>
                  <Text style={[s.loanDate, { color: colors.sub }]}>Started {fmt(loan.start_date)}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: ss.bg }]}>
                  <Text style={[s.statusText, { color: ss.color }]}>{loan.status}</Text>
                </View>
              </View>

              {/* Amounts */}
              <View style={s.amtRow}>
                <View style={s.amtItem}>
                  <Text style={[s.amtLabel, { color: colors.sub }]}>Total</Text>
                  <Text style={[s.amtVal, { color: colors.text }]}>EGP {fmtNum(loan.amount)}</Text>
                </View>
                <View style={s.amtItem}>
                  <Text style={[s.amtLabel, { color: colors.sub }]}>Paid</Text>
                  <Text style={[s.amtVal, { color: '#16a34a' }]}>EGP {fmtNum(loan.paid_amount)}</Text>
                </View>
                <View style={s.amtItem}>
                  <Text style={[s.amtLabel, { color: colors.sub }]}>Remaining</Text>
                  <Text style={[s.amtVal, { color: '#dc2626' }]}>EGP {fmtNum(loan.remaining_amount)}</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={[s.progressLabel, { color: colors.sub }]}>
                {pct.toFixed(0)}% repaid · EGP {fmtNum(loan.monthly_deduction)}/month
              </Text>
            </View>
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
  scroll:         { padding: 16, paddingBottom: 40, gap: 12 },
  summaryCard:    { backgroundColor: '#0F1829', borderRadius: 18, padding: 20, marginBottom: 4 },
  summaryRow:     { flexDirection: 'row', alignItems: 'center' },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.15)' },
  summaryLabel:   { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  summaryVal:     { color: 'white', fontSize: 18, fontWeight: '900' },
  empty:          { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:      { fontSize: 48, marginBottom: 12 },
  emptyText:      { fontSize: 14 },
  card:           { borderRadius: 16, padding: 16 },
  cardTop:        { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  loanReason:     { fontSize: 15, fontWeight: '700' },
  loanDate:       { fontSize: 12, marginTop: 2 },
  statusBadge:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:     { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  amtRow:         { flexDirection: 'row', marginBottom: 12 },
  amtItem:        { flex: 1, alignItems: 'center' },
  amtLabel:       { fontSize: 11, marginBottom: 3 },
  amtVal:         { fontSize: 13, fontWeight: '700' },
  progressBg:     { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  progressFill:   { height: 6, backgroundColor: '#2BC4BE', borderRadius: 3 },
  progressLabel:  { fontSize: 11, textAlign: 'center' },
})
