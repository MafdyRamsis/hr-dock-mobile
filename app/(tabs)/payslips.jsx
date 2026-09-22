import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, Share, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import api from '../../src/services/api'
import Card from '../../src/components/Card'
import Skeleton, { SkeletonCard } from '../../src/components/Skeleton'
import { useTheme, GRADIENTS } from '../../src/context/ThemeContext'

const fmtNum     = n => n != null ? Number(n).toLocaleString('en-EG') : '—'
const fmt        = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'
const runMonthLabel = r => r ? new Date(r.year, r.month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'
const runKey        = r => r ? `${r.year}-${String(r.month).padStart(2, '0')}` : ''

const buildShareText = (slip, run) => {
  const line  = (label, val, minus) =>
    `  ${label.padEnd(28)} ${minus ? '-' : ' '} EGP ${fmtNum(val)}`
  const sep   = '─'.repeat(42)

  const earnings = [
    slip.basic_salary          && line('Basic Salary',        slip.basic_salary),
    slip.housing_allowance > 0 && line('Housing Allowance',   slip.housing_allowance),
    slip.transport_allowance>0 && line('Transport Allowance', slip.transport_allowance),
    slip.mobile_allowance  > 0 && line('Mobile Allowance',    slip.mobile_allowance),
    slip.meal_allowance    > 0 && line('Meal Allowance',      slip.meal_allowance),
    slip.other_allowances  > 0 && line('Other Allowances',    slip.other_allowances),
    slip.overtime_pay      > 0 && line('Overtime',            slip.overtime_pay),
  ].filter(Boolean).join('\n')

  const deductions = [
    slip.social_insurance  > 0 && line('Social Insurance (11%)', slip.social_insurance,  true),
    slip.income_tax        > 0 && line('Income Tax',             slip.income_tax,         true),
    slip.martyrs_fund      > 0 && line("Martyrs Fund (1%)",      slip.martyrs_fund,       true),
    slip.loan_deduction    > 0 && line('Loan Deduction',         slip.loan_deduction,     true),
    slip.other_deductions  > 0 && line('Other Deductions',       slip.other_deductions,   true),
  ].filter(Boolean).join('\n')

  const name = slip.employee_name || `${slip.first_name || ''} ${slip.last_name || ''}`.trim()

  return [
    '╔══════════════════════════════════════════╗',
    '║             HR DOCK  PAYSLIP             ║',
    '╚══════════════════════════════════════════╝',
    '',
    `Employee : ${name}`,
    `Period   : ${run ? `${MONTHS[run.month - 1]} ${run.year}` : '—'}`,
    '',
    sep,
    'EARNINGS',
    sep,
    earnings,
    sep,
    line('Gross Salary', slip.gross_salary),
    '',
    sep,
    'DEDUCTIONS',
    sep,
    deductions || '  None',
    sep,
    line('Total Deductions', slip.total_deductions, true),
    '',
    sep,
    line('NET SALARY', slip.net_salary),
    sep,
    '',
    'Generated via HR Dock Employee Self-Service',
  ].join('\n')
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const buildPayslipHtml = (slip, run) => {
  const empName = slip.employee_name || `${slip.first_name || ''} ${slip.last_name || ''}`.trim()
  const period  = run ? `${MONTHS[run.month - 1]} ${run.year}` : '—'
  const row = (label, val, color='#1e293b', bold=false) =>
    val > 0 ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">${label}</td><td style="padding:6px 0;text-align:right;font-size:13px;color:${color};font-weight:${bold?700:400}">EGP ${Number(val).toLocaleString('en-EG')}</td></tr>` : ''

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:Arial,sans-serif;margin:0;padding:24px;background:#F8F9FD;color:#1A1B2E}
.card{background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
h1{color:#1A1B2E;font-size:22px;margin:0 0 4px}
.sub{color:#8A8DA3;font-size:12px}
.net{background:#12121C;border-radius:16px;padding:18px;text-align:center;margin-bottom:16px}
.net-label{color:rgba(255,255,255,0.55);font-size:12px;margin-bottom:6px}
.net-val{color:white;font-size:28px;font-weight:900}
table{width:100%;border-collapse:collapse}
h3{font-size:11px;color:#8A8DA3;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px}
.total td{border-top:1px solid #E3E6F3;padding-top:8px;font-weight:700;color:#1A1B2E}
.footer{text-align:center;font-size:10px;color:#8A8DA3;margin-top:24px}
</style></head><body>
<div class="card">
  <h1>Payslip</h1>
  <div class="sub">${period} &nbsp;·&nbsp; ${empName}</div>
</div>
<div class="net"><div class="net-label">Net Salary</div><div class="net-val">EGP ${Number(slip.net_salary).toLocaleString('en-EG')}</div></div>
<div class="card">
  <h3>Earnings</h3>
  <table>
    ${row('Basic Salary', slip.basic_salary)}
    ${row('Housing Allowance', slip.housing_allowance)}
    ${row('Transport Allowance', slip.transport_allowance)}
    ${row('Mobile Allowance', slip.mobile_allowance)}
    ${row('Meal Allowance', slip.meal_allowance)}
    ${row('Other Allowances', slip.other_allowances)}
    ${row('Overtime', slip.overtime_pay)}
    <tr class="total"><td>Gross Salary</td><td style="text-align:right">EGP ${Number(slip.gross_salary).toLocaleString('en-EG')}</td></tr>
  </table>
</div>
<div class="card">
  <h3>Deductions</h3>
  <table>
    ${row('Social Insurance (11%)', slip.social_insurance, '#dc2626')}
    ${row('Income Tax', slip.income_tax, '#dc2626')}
    ${row('Martyrs Fund (1%)', slip.martyrs_fund, '#dc2626')}
    ${row('Loan Deduction', slip.loan_deduction, '#dc2626')}
    ${row('Other Deductions', slip.other_deductions, '#dc2626')}
    <tr class="total"><td>Total Deductions</td><td style="text-align:right;color:#dc2626">− EGP ${Number(slip.total_deductions).toLocaleString('en-EG')}</td></tr>
  </table>
</div>
<div class="footer">Generated via HR Dock Employee Self-Service · ${new Date().toLocaleDateString('en-GB')}</div>
</body></html>`
}

export default function PayslipsScreen() {
  const { colors } = useTheme()
  const [runs,       setRuns]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [slipLoad,    setSlipLoad]    = useState(false)
  const [slip,        setSlip]        = useState(null)
  const [activeYear,  setActiveYear]  = useState(new Date().getFullYear())
  const [pdfLoading,  setPdfLoading]  = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api.get('/payroll/runs?limit=48')
      const raw = r.data.data
      const list = Array.isArray(raw) ? raw : (raw?.rows || raw?.data || [])
      setRuns(list)
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

  const shareSlip = async () => {
    if (!slip || !selected) return
    try {
      await Share.share({ message: buildShareText(slip, selected), title: 'Payslip' })
    } catch {}
  }

  const downloadPdf = async () => {
    if (!slip || !selected) return
    setPdfLoading(true)
    try {
      const html = buildPayslipHtml(slip, selected)
      const { uri } = await Print.printToFileAsync({ html, base64: false })
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save or share payslip PDF' })
      } else {
        Alert.alert('Saved', `PDF saved to: ${uri}`)
      }
    } catch (e) {
      Alert.alert('Error', 'Could not generate PDF. Please try again.')
    } finally { setPdfLoading(false) }
  }

  // Build a map: "YYYY-MM" → run
  const runMap = {}
  runs.forEach(r => { if (r.year && r.month) runMap[runKey(r)] = r })

  const years = [...new Set(runs.map(r => r.year).filter(Boolean))].sort((a, b) => b - a)

  const latestRun = runs[0] || null

  // Default activeYear to the most recent year that has data
  const effectiveYear = years.includes(activeYear) ? activeYear : (years[0] || new Date().getFullYear())

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Skeleton width={120} height={28} borderRadius={8} style={{ marginBottom: 16 }} />
        <View style={{ backgroundColor: '#12121C', borderRadius: 26, padding: 22, marginBottom: 20, gap: 12 }}>
          <Skeleton width={100} height={11} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <Skeleton width={180} height={28} borderRadius={8} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <Skeleton width={140} height={12} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        </View>
        <Skeleton width={60}  height={13} borderRadius={6} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Skeleton width={60} height={34} borderRadius={20} />
          <Skeleton width={60} height={34} borderRadius={20} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} width="22%" height={52} borderRadius={16} />
          ))}
        </View>
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
        <Text style={[s.pageTitle, { color: colors.text }]}>Payslips</Text>

        {runs.length === 0 ? (
          <Card><Text style={[s.empty, { color: colors.muted }]}>No payslips available yet.</Text></Card>
        ) : (
          <>
            {/* Current month featured card */}
            {latestRun && (
              <TouchableOpacity onPress={() => openSlip(latestRun)} activeOpacity={0.88}>
                <View style={s.featCard}>
                  <LinearGradient colors={GRADIENTS.navy} style={StyleSheet.absoluteFill} borderRadius={26} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <View style={s.featTop}>
                    <Text style={s.featLabel}>Latest Payslip</Text>
                    <Text style={s.featStatus}>{(latestRun.status || '').replace('_', ' ')}</Text>
                  </View>
                  <Text style={s.featMonth}>{runMonthLabel(latestRun)}</Text>
                  <Text style={s.featPeriod}>
                    {MONTHS[latestRun.month - 1]} {latestRun.year} · {latestRun.employee_count || 1} employee{latestRun.employee_count !== 1 ? 's' : ''}
                  </Text>
                  <View style={s.featFooter}>
                    <Text style={s.featAction}>Tap to view →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Year tabs */}
            {years.length > 0 && (
              <View style={s.section}>
                <Text style={[s.sectionTitle, { color: colors.sub }]}>History</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.yearScroll} contentContainerStyle={s.yearContent}>
                  {years.map(y => {
                    const active = activeYear === y
                    return (
                      <TouchableOpacity key={y} onPress={() => setActiveYear(y)} activeOpacity={0.85}>
                        {active ? (
                          <LinearGradient colors={GRADIENTS.mint} style={s.yearTab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Text style={s.yearTabTextActive}>{y}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={[s.yearTab, { backgroundColor: colors.card, borderColor: colors.glassBorder, borderWidth: 1.5 }]}>
                            <Text style={[s.yearTabText, { color: colors.sub }]}>{y}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>

                {/* Month grid */}
                <View style={s.monthGrid}>
                  {MONTHS.map((name, idx) => {
                    const key = `${effectiveYear}-${String(idx + 1).padStart(2, '0')}`
                    const run = runMap[key]
                    const now = new Date()
                    const isFuture = effectiveYear > now.getFullYear() ||
                      (effectiveYear === now.getFullYear() && idx > now.getMonth())
                    return (
                      <TouchableOpacity
                        key={name}
                        onPress={() => run && openSlip(run)}
                        disabled={!run}
                        activeOpacity={0.8}
                        style={s.monthCellWrap}
                      >
                        {run ? (
                          <LinearGradient colors={GRADIENTS.mint} style={s.monthCell} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <Text style={s.monthNameActive}>{name}</Text>
                            <View style={[s.monthDot, { backgroundColor: 'white' }]} />
                          </LinearGradient>
                        ) : (
                          <View style={[s.monthCell, { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1.5 }]}>
                            <Text style={[s.monthName, { color: isFuture ? colors.muted : colors.sub }]}>{name}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Payslip Detail Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Payslip</Text>
            <View style={s.modalActions}>
              {slip && (
                <>
                  <TouchableOpacity style={s.pdfBtn} onPress={downloadPdf} disabled={pdfLoading}>
                    {pdfLoading ? <ActivityIndicator size="small" color="#FF6B6B" /> : <>
                      <Text style={s.pdfIcon}>⬇</Text>
                      <Text style={s.pdfText}>PDF</Text>
                    </>}
                  </TouchableOpacity>
                  <TouchableOpacity style={s.shareBtn} onPress={shareSlip}>
                    <Text style={s.shareIcon}>↑</Text>
                    <Text style={s.shareText}>Share</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={() => { setSelected(null); setSlip(null) }}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {slipLoad ? (
            <View style={s.center}><ActivityIndicator color="#2ED573" size="large" /></View>
          ) : slip ? (
            <ScrollView contentContainerStyle={s.slipScroll}>
              {/* Period */}
              <View style={s.slipHeader}>
                <Text style={s.slipMonth}>{runMonthLabel(selected)}</Text>
                <Text style={s.slipPeriod}>
                  {MONTHS[selected?.month - 1]} {selected?.year}
                </Text>
                <Text style={s.slipEmp}>{slip.employee_name || `${slip.first_name || ''} ${slip.last_name || ''}`.trim()}</Text>
              </View>

              {/* Net salary highlight */}
              <View style={s.netBox}>
                <LinearGradient colors={GRADIENTS.navy} style={StyleSheet.absoluteFill} borderRadius={20} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={s.netLabel}>Net Salary</Text>
                <Text style={s.netVal}>EGP {fmtNum(slip.net_salary)}</Text>
              </View>

              {/* Earnings */}
              <View style={s.section2}>
                <Text style={s.sectionTitle2}>Earnings</Text>
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
              <View style={s.section2}>
                <Text style={s.sectionTitle2}>Deductions</Text>
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
  safe:             { flex: 1 },
  scroll:           { padding: 16, paddingBottom: 130 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:        { fontSize: 26, fontWeight: '900', marginBottom: 16 },
  empty:            { color: '#8A8DA3', textAlign: 'center', paddingVertical: 8 },

  featCard:         { borderRadius: 26, padding: 22, marginBottom: 20, overflow: 'hidden', shadowColor: '#12121C', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 6 },
  featTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  featLabel:        { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  featStatus:       { color: '#54E3C4', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  featMonth:        { color: 'white', fontSize: 28, fontWeight: '900', marginBottom: 4 },
  featPeriod:       { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  featFooter:       { marginTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 14 },
  featAction:       { color: '#54E3C4', fontSize: 13, fontWeight: '800' },

  section:          { marginBottom: 8 },
  sectionTitle:     { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  yearScroll:       { marginBottom: 16, marginHorizontal: -4 },
  yearContent:      { paddingHorizontal: 4, gap: 8 },
  yearTab:          { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 999 },
  yearTabText:      { fontSize: 14, fontWeight: '700' },
  yearTabTextActive:{ color: 'white', fontSize: 14, fontWeight: '800' },


  monthGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  monthCellWrap:    { width: '22%' },
  monthCell:        { aspectRatio: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  monthName:        { fontSize: 13, fontWeight: '700' },
  monthNameActive:  { color: 'white', fontSize: 13, fontWeight: '800' },
  monthDot:         { width: 5, height: 5, borderRadius: 3, marginTop: 4 },

  modal:            { flex: 1, backgroundColor: 'white' },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEF0F8' },
  modalTitle:       { fontSize: 18, fontWeight: '800', color: '#1A1B2E' },
  modalActions:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pdfBtn:           { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFE9E6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#FFCFC9', minWidth: 64, justifyContent: 'center' },
  pdfIcon:          { fontSize: 14, color: '#E14F4A', fontWeight: '800' },
  pdfText:          { fontSize: 13, color: '#E14F4A', fontWeight: '700' },
  shareBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E3FBF3', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#D4F5E9' },
  shareIcon:        { fontSize: 14, color: '#0E9F6E', fontWeight: '800' },
  shareText:        { fontSize: 13, color: '#0E9F6E', fontWeight: '700' },
  modalClose:       { fontSize: 22, color: '#8A8DA3' },
  slipScroll:       { padding: 20, paddingBottom: 40 },
  slipHeader:       { marginBottom: 20 },
  slipMonth:        { fontSize: 22, fontWeight: '900', color: '#1A1B2E', marginBottom: 2 },
  slipPeriod:       { fontSize: 12, color: '#8A8DA3', marginBottom: 6 },
  slipEmp:          { fontSize: 15, fontWeight: '600', color: '#475569' },
  netBox:           { borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 24, overflow: 'hidden' },
  netLabel:         { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 6 },
  netVal:           { color: 'white', fontSize: 32, fontWeight: '900' },
  section2:         { marginBottom: 20 },
  sectionTitle2:    { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  netRow:           { backgroundColor: '#E3FBF3', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netRowLabel:      { fontSize: 15, fontWeight: '700', color: '#0E9F6E' },
  netRowVal:        { fontSize: 18, fontWeight: '900', color: '#0E9F6E' },
})

const sr = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F6FC' },
  label: { fontSize: 13, color: '#64748b' },
  val:   { fontSize: 13, color: '#1e293b', fontWeight: '500' },
  bold:  { fontWeight: '800', color: '#1A1B2E', fontSize: 14 },
  minus: { color: '#E14F4A' },
})
