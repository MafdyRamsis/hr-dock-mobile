import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import api from '../../src/services/api'
import Card from '../../src/components/Card'

const fmt    = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'
const fmtNum = n => n != null ? Number(n).toLocaleString('en-EG') : '—'

export default function PayslipsScreen() {
  const [runs,       setRuns]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected,   setSelected]   = useState(null)
  const [slipLoad,   setSlipLoad]   = useState(false)
  const [slip,       setSlip]       = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await api.get('/payroll/runs?limit=24')
      setRuns(r.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const openSlip = async (run) => {
    setSelected(run); setSlipLoad(true); setSlip(null)
    try {
      const r = await api.get(`/payroll/runs/${run.id}`)
      const slips = r.data.data?.payslips || []
      setSlip(slips[0] || null)
    } catch {}
    finally { setSlipLoad(false) }
  }

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}><ActivityIndicator color="#2BC4BE" size="large" /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2BC4BE" />}
      >
        <Text style={s.pageTitle}>Payslips</Text>

        {runs.length === 0 ? (
          <Card><Text style={s.empty}>No payslips available yet.</Text></Card>
        ) : runs.map((run, i) => (
          <TouchableOpacity key={run.id} onPress={() => openSlip(run)} activeOpacity={0.85}>
            <Card style={s.runCard}>
              <View style={s.runRow}>
                <View>
                  <Text style={s.runPeriod}>{fmt(run.period_start)} – {fmt(run.period_end)}</Text>
                  <Text style={s.runLabel}>{run.label || 'Monthly Payroll'}</Text>
                </View>
                <View style={s.runRight}>
                  <Text style={s.runStatus}>{run.status}</Text>
                  <Text style={s.runArrow}>›</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Payslip Detail Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Payslip</Text>
            <TouchableOpacity onPress={() => { setSelected(null); setSlip(null) }}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {slipLoad ? (
            <View style={s.center}><ActivityIndicator color="#2BC4BE" size="large" /></View>
          ) : slip ? (
            <ScrollView contentContainerStyle={s.slipScroll}>
              {/* Period */}
              <View style={s.slipHeader}>
                <Text style={s.slipPeriod}>{fmt(selected?.period_start)} – {fmt(selected?.period_end)}</Text>
                <Text style={s.slipEmp}>{slip.employee_name || slip.first_name + ' ' + slip.last_name}</Text>
              </View>

              {/* Net salary highlight */}
              <View style={s.netBox}>
                <Text style={s.netLabel}>Net Salary</Text>
                <Text style={s.netVal}>EGP {fmtNum(slip.net_salary)}</Text>
              </View>

              {/* Earnings */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Earnings</Text>
                <Row label="Basic Salary"      val={slip.basic_salary} />
                {slip.housing_allowance      > 0 && <Row label="Housing Allowance"   val={slip.housing_allowance} />}
                {slip.transport_allowance    > 0 && <Row label="Transport Allowance" val={slip.transport_allowance} />}
                {slip.mobile_allowance       > 0 && <Row label="Mobile Allowance"    val={slip.mobile_allowance} />}
                {slip.meal_allowance         > 0 && <Row label="Meal Allowance"      val={slip.meal_allowance} />}
                {slip.other_allowances       > 0 && <Row label="Other Allowances"    val={slip.other_allowances} />}
                {slip.overtime_pay           > 0 && <Row label="Overtime"            val={slip.overtime_pay} />}
                <Row label="Gross Salary" val={slip.gross_salary} bold />
              </View>

              {/* Deductions */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Deductions</Text>
                {slip.social_insurance  > 0 && <Row label="Social Insurance (11%)" val={slip.social_insurance}  minus />}
                {slip.income_tax        > 0 && <Row label="Income Tax"             val={slip.income_tax}        minus />}
                {slip.martyrs_fund      > 0 && <Row label="Martyrs Fund (1%)"      val={slip.martyrs_fund}      minus />}
                {slip.loan_deduction    > 0 && <Row label="Loan Deduction"         val={slip.loan_deduction}    minus />}
                {slip.other_deductions  > 0 && <Row label="Other Deductions"       val={slip.other_deductions}  minus />}
                <Row label="Total Deductions" val={slip.total_deductions} bold minus />
              </View>

              {/* Net */}
              <View style={s.netRow}>
                <Text style={s.netRowLabel}>Net Salary</Text>
                <Text style={s.netRowVal}>EGP {fmtNum(slip.net_salary)}</Text>
              </View>
            </ScrollView>
          ) : (
            <View style={s.center}><Text style={s.empty}>No payslip data found for this run.</Text></View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const Row = ({ label, val, bold, minus }) => (
  <View style={sr.row}>
    <Text style={[sr.label, bold && sr.bold]}>{label}</Text>
    <Text style={[sr.val, bold && sr.bold, minus && sr.minus]}>
      {minus ? '−' : ''} EGP {fmtNum(val)}
    </Text>
  </View>
)

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F0F4FA' },
  scroll:      { padding: 16, paddingBottom: 32 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:   { fontSize: 26, fontWeight: '900', color: '#0F1829', marginBottom: 16 },
  runCard:     { marginBottom: 8 },
  runRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  runPeriod:   { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  runLabel:    { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  runRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  runStatus:   { fontSize: 11, fontWeight: '600', color: '#2BC4BE', textTransform: 'capitalize' },
  runArrow:    { fontSize: 22, color: '#94a3b8' },
  empty:       { color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },
  modal:       { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: '#0F1829' },
  modalClose:  { fontSize: 22, color: '#64748b' },
  slipScroll:  { padding: 20, paddingBottom: 40 },
  slipHeader:  { marginBottom: 20 },
  slipPeriod:  { fontSize: 13, color: '#94a3b8', marginBottom: 4 },
  slipEmp:     { fontSize: 18, fontWeight: '800', color: '#0F1829' },
  netBox:      { backgroundColor: '#0F1829', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24 },
  netLabel:    { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 6 },
  netVal:      { color: 'white', fontSize: 32, fontWeight: '900' },
  section:     { marginBottom: 20 },
  sectionTitle:{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  netRow:      { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netRowLabel: { fontSize: 15, fontWeight: '700', color: '#166534' },
  netRowVal:   { fontSize: 18, fontWeight: '900', color: '#166534' },
})

const sr = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  label: { fontSize: 13, color: '#64748b' },
  val:   { fontSize: 13, color: '#1e293b', fontWeight: '500' },
  bold:  { fontWeight: '800', color: '#0F1829', fontSize: 14 },
  minus: { color: '#dc2626' },
})
