import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, Share, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import api from '../../src/services/api'
import Card from '../../src/components/Card'
import Skeleton, { SkeletonCard } from '../../src/components/Skeleton'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme, GRADIENTS } from '../../src/context/ThemeContext'
import { useLang } from '../../src/context/LanguageContext'
import { fmtMonthYear, monthName, fmtDate } from '../../src/i18n/format'
import { ls, fwd } from '../../src/utils/rtl'

const fmtNum     = n => n != null ? Number(n).toLocaleString('en-US') : '—'
const runKey        = r => r ? `${r.year}-${String(r.month).padStart(2, '0')}` : ''

// Payslip line labels. Official documents stay in formal Arabic whatever the company tone.
const L = {
  basic:     ['Basic Salary', 'الأجر الأساسي'],
  housing:   ['Housing Allowance', 'بدل سكن'],
  transport: ['Transport Allowance', 'بدل انتقال'],
  mobile:    ['Mobile Allowance', 'بدل هاتف'],
  meal:      ['Meal Allowance', 'بدل وجبة'],
  otherAl:   ['Other Allowances', 'بدلات أخرى'],
  overtime:  ['Overtime', 'العمل الإضافي'],
  gross:     ['Gross Salary', 'إجمالي الراتب'],
  si:        ['Social Insurance (11%)', 'التأمينات الاجتماعية (11%)'],
  tax:       ['Income Tax', 'ضريبة كسب العمل'],
  martyrs:   ['Martyrs Fund (1%)', 'صندوق الشهداء (1%)'],
  loan:      ['Loan Deduction', 'قسط السلفة'],
  otherDed:  ['Other Deductions', 'استقطاعات أخرى'],
  totalDed:  ['Total Deductions', 'إجمالي الاستقطاعات'],
  net:       ['Net Salary', 'صافي الراتب'],
  earnings:  ['Earnings', 'المستحقات'],
  deductions:['Deductions', 'الاستقطاعات'],
  payslip:   ['Payslip', 'قسيمة الراتب'],
  employee:  ['Employee', 'الموظف'],
  period:    ['Period', 'الفترة'],
  none:      ['None', 'لا يوجد'],
  generated: ['Generated via HR Dock Employee Self-Service', 'صادرة من الخدمة الذاتية للموظفين – HR Dock'],
}
const lbl = (k, lang) => L[k][lang === 'ar' ? 1 : 0]
const cur = lang => (lang === 'ar' ? 'ج.م' : 'EGP')

const buildShareText = (slip, run, lang = 'en') => {
  const line  = (label, val, minus) =>
    `  ${label.padEnd(28)} ${minus ? '-' : ' '} ${cur(lang)} ${fmtNum(val)}`
  const sep   = '─'.repeat(42)

  const earnings = [
    slip.basic_salary          && line(lbl('basic', lang),        slip.basic_salary),
    slip.housing_allowance > 0 && line(lbl('housing', lang),   slip.housing_allowance),
    slip.transport_allowance>0 && line(lbl('transport', lang), slip.transport_allowance),
    slip.mobile_allowance  > 0 && line(lbl('mobile', lang),    slip.mobile_allowance),
    slip.meal_allowance    > 0 && line(lbl('meal', lang),      slip.meal_allowance),
    slip.other_allowances  > 0 && line(lbl('otherAl', lang),    slip.other_allowances),
    slip.overtime_pay      > 0 && line(lbl('overtime', lang),            slip.overtime_pay),
  ].filter(Boolean).join('\n')

  const deductions = [
    slip.social_insurance  > 0 && line(lbl('si', lang), slip.social_insurance,  true),
    slip.income_tax        > 0 && line(lbl('tax', lang),             slip.income_tax,         true),
    slip.martyrs_fund      > 0 && line(lbl('martyrs', lang),      slip.martyrs_fund,       true),
    slip.loan_deduction    > 0 && line(lbl('loan', lang),         slip.loan_deduction,     true),
    slip.other_deductions  > 0 && line(lbl('otherDed', lang),       slip.other_deductions,   true),
  ].filter(Boolean).join('\n')

  const name = slip.employee_name || `${slip.first_name || ''} ${slip.last_name || ''}`.trim()

  return [
    `HR Dock — ${lbl('payslip', lang)}`,
    '',
    `${lbl('employee', lang)}: ${name}`,
    `${lbl('period', lang)}: ${run ? fmtMonthYear(run.month - 1, run.year, lang) : '—'}`,
    '',
    sep,
    lbl('earnings', lang),
    sep,
    earnings,
    sep,
    line(lbl('gross', lang), slip.gross_salary),
    '',
    sep,
    lbl('deductions', lang),
    sep,
    deductions || `  ${lbl('none', lang)}`,
    sep,
    line(lbl('totalDed', lang), slip.total_deductions, true),
    '',
    sep,
    line(lbl('net', lang), slip.net_salary),
    sep,
    '',
    lbl('generated', lang),
  ].join('\n')
}

const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export const buildPayslipHtml = (slip, run, lang = 'en') => {
  const ar = lang === 'ar'
  const empName = (ar && `${slip.first_name_ar || ''} ${slip.last_name_ar || ''}`.trim()) || slip.employee_name || `${slip.first_name || ''} ${slip.last_name || ''}`.trim()
  const period  = run ? fmtMonthYear(run.month - 1, run.year, lang) : '—'
  const end = ar ? 'left' : 'right'
  const money = v => `${cur(lang)} ${Number(v || 0).toLocaleString('en-US')}`
  const row = (k, val, color='#1e293b', bold=false) =>
    val > 0 ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">${lbl(k, lang)}</td><td style="padding:6px 0;text-align:${end};font-size:13px;color:${color};font-weight:${bold?700:400}" dir="ltr">${money(val)}</td></tr>` : ''

  return `<!DOCTYPE html><html dir="${ar ? 'rtl' : 'ltr'}" lang="${lang}"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:${ar ? "'Noto Naskh Arabic','Noto Sans Arabic',Tahoma," : ''}Arial,sans-serif;margin:0;padding:24px;background:#F8F9FD;color:#1A1B2E}
.card{background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
h1{color:#1A1B2E;font-size:22px;margin:0 0 4px}
.sub{color:#8A8DA3;font-size:12px}
.net{background:#12121C;border-radius:16px;padding:18px;text-align:center;margin-bottom:16px}
.net-label{color:rgba(255,255,255,0.55);font-size:12px;margin-bottom:6px}
.net-val{color:white;font-size:28px;font-weight:900}
table{width:100%;border-collapse:collapse}
h3{font-size:${ar ? 13 : 11}px;color:#8A8DA3;text-transform:uppercase;letter-spacing:${ar ? 0 : '0.06em'};margin:0 0 8px}
.total td{border-top:1px solid #E3E6F3;padding-top:8px;font-weight:700;color:#1A1B2E}
.footer{text-align:center;font-size:10px;color:#8A8DA3;margin-top:24px}
</style></head><body>
<div class="card">
  <h1>${lbl('payslip', lang)}</h1>
  <div class="sub">${esc(period)} &nbsp;·&nbsp; ${esc(empName)}</div>
</div>
<div class="net"><div class="net-label">${lbl('net', lang)}</div><div class="net-val" dir="ltr">${money(slip.net_salary)}</div></div>
<div class="card">
  <h3>${lbl('earnings', lang)}</h3>
  <table>
    ${row('basic', slip.basic_salary)}
    ${row('housing', slip.housing_allowance)}
    ${row('transport', slip.transport_allowance)}
    ${row('mobile', slip.mobile_allowance)}
    ${row('meal', slip.meal_allowance)}
    ${row('otherAl', slip.other_allowances)}
    ${row('overtime', slip.overtime_pay)}
    <tr class="total"><td>${lbl('gross', lang)}</td><td style="text-align:${end}" dir="ltr">${money(slip.gross_salary)}</td></tr>
  </table>
</div>
<div class="card">
  <h3>${lbl('deductions', lang)}</h3>
  <table>
    ${row('si', slip.social_insurance, '#dc2626')}
    ${row('tax', slip.income_tax, '#dc2626')}
    ${row('martyrs', slip.martyrs_fund, '#dc2626')}
    ${row('loan', slip.loan_deduction, '#dc2626')}
    ${row('otherDed', slip.other_deductions, '#dc2626')}
    <tr class="total"><td>${lbl('totalDed', lang)}</td><td style="text-align:${end};color:#dc2626" dir="ltr">− ${money(slip.total_deductions)}</td></tr>
  </table>
</div>
<div class="footer">${lbl('generated', lang)} · ${fmtDate(new Date(), lang)}</div>
</body></html>`
}

export default function PayslipsScreen() {
  const { user }    = useAuth()
  const { colors }  = useTheme()
  const { lang, tr } = useLang()
  const runMonthLabel = r => (r ? fmtMonthYear(r.month - 1, r.year, lang) : '—')
  const MONTHS = Array.from({ length: 12 }, (_, i) => monthName(i, lang, true))
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
      // ?mine=1 forces this "My Payslips" screen to only ever see runs that
      // contain the caller's own payslip — without it, an admin/hr_manager/
      // manager account saw every payroll run in the company here.
      const r = await api.get('/payroll/runs?limit=48&mine=1')
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
      const r = await api.get(`/payroll/runs/${run.id}?mine=1`)
      const slips = r.data.data?.payslips || []
      // Defense in depth: even with ?mine=1, never blindly trust slips[0] —
      // this endpoint used to return every employee's payslip for the run
      // and the app displayed whichever one came back first, leaking a
      // different employee's confidential salary as "my payslip" (confirmed
      // live against production for admin accounts). Explicitly match our
      // own employee_id so a backend regression here can't resurface that.
      const mySlip = user?.employee_id
        ? (slips.find(p => p.employee_id === user.employee_id) || null)
        : (slips[0] || null)
      setSlip(mySlip)
    } catch {}
    finally { setSlipLoad(false) }
  }

  const shareSlip = async () => {
    if (!slip || !selected) return
    try {
      await Share.share({ message: buildShareText(slip, selected, lang), title: lbl('payslip', lang) })
    } catch {}
  }

  const downloadPdf = async () => {
    if (!slip || !selected) return
    setPdfLoading(true)
    try {
      const html = buildPayslipHtml(slip, selected, lang)
      const { uri } = await Print.printToFileAsync({ html, base64: false })
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: tr('Save or share payslip PDF', 'احفظ أو شارك قسيمة الراتب', 'احفظ القسيمة أو ابعتها') })
      } else {
        Alert.alert(tr('Saved', 'تم الحفظ', 'اتحفظت'), `${tr('PDF saved to', 'تم حفظ الملف في', 'الملف اتحفظ في')}: ${uri}`)
      }
    } catch (e) {
      Alert.alert(tr('Error', 'خطأ', 'حصلت مشكلة'), tr('Could not generate PDF. Please try again.', 'تعذّر إنشاء ملف PDF. حاول مرة أخرى.', 'معرفناش نعمل الـ PDF. يلا نجرّب تاني.'))
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
        <Text style={[s.pageTitle, { color: colors.text }]}>{tr('Payslips', 'قسائم الراتب', 'قسايم المرتب')}</Text>

        {runs.length === 0 ? (
          <Card><Text style={[s.empty, { color: colors.muted }]}>{tr('No payslips available yet.', 'لا توجد قسائم راتب بعد.', 'لسه مفيش قسايم مرتب.')}</Text></Card>
        ) : (
          <>
            {/* Current month featured card */}
            {latestRun && (
              <TouchableOpacity onPress={() => openSlip(latestRun)} activeOpacity={0.88}>
                <View style={s.featCard}>
                  <LinearGradient colors={GRADIENTS.navy} style={StyleSheet.absoluteFill} borderRadius={26} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                  <View style={s.featTop}>
                    <Text style={s.featLabel}>{tr('Latest Payslip', 'آخر قسيمة راتب', 'آخر قسيمة مرتب')}</Text>
                    <Text style={s.featStatus}>{statusLabel(latestRun.status, tr)}</Text>
                  </View>
                  <Text style={s.featMonth}>{runMonthLabel(latestRun)}</Text>
                  <View style={s.featFooter}>
                    <Text style={s.featAction}>{tr('Tap to view', 'اضغط للعرض', 'افتحها')} {fwd}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Year tabs */}
            {years.length > 0 && (
              <View style={s.section}>
                <Text style={[s.sectionTitle, { color: colors.sub }]}>{tr('History', 'السجل', 'اللي فات')}</Text>
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
            <Text style={s.modalTitle}>{lbl('payslip', lang)}</Text>
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
                    <Text style={s.shareText}>{tr('Share', 'مشاركة', 'ابعت')}</Text>
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
                <Text style={s.slipEmp}>{(lang === 'ar' && `${slip.first_name_ar || ''} ${slip.last_name_ar || ''}`.trim()) || slip.employee_name || `${slip.first_name || ''} ${slip.last_name || ''}`.trim()}</Text>
              </View>

              {/* Net salary highlight */}
              <View style={s.netBox}>
                <LinearGradient colors={GRADIENTS.navy} style={StyleSheet.absoluteFill} borderRadius={20} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={s.netLabel}>{lbl('net', lang)}</Text>
                <Text style={s.netVal}>{cur(lang)} {fmtNum(slip.net_salary)}</Text>
              </View>

              {/* Earnings */}
              <View style={s.section2}>
                <Text style={s.sectionTitle2}>{lbl('earnings', lang)}</Text>
                <Row label={lbl('basic', lang)}      val={slip.basic_salary} />
                {slip.housing_allowance      > 0 && <Row label={lbl('housing', lang)}   val={slip.housing_allowance} />}
                {slip.transport_allowance    > 0 && <Row label={lbl('transport', lang)} val={slip.transport_allowance} />}
                {slip.mobile_allowance       > 0 && <Row label={lbl('mobile', lang)}    val={slip.mobile_allowance} />}
                {slip.meal_allowance         > 0 && <Row label={lbl('meal', lang)}      val={slip.meal_allowance} />}
                {slip.other_allowances       > 0 && <Row label={lbl('otherAl', lang)}    val={slip.other_allowances} />}
                {slip.overtime_pay           > 0 && <Row label={lbl('overtime', lang)}            val={slip.overtime_pay} />}
                <Row label={lbl('gross', lang)} val={slip.gross_salary} bold />
              </View>

              {/* Deductions */}
              <View style={s.section2}>
                <Text style={s.sectionTitle2}>{lbl('deductions', lang)}</Text>
                {slip.social_insurance  > 0 && <Row label={lbl('si', lang)} val={slip.social_insurance}  minus />}
                {slip.income_tax        > 0 && <Row label={lbl('tax', lang)}             val={slip.income_tax}        minus />}
                {slip.martyrs_fund      > 0 && <Row label={lbl('martyrs', lang)}      val={slip.martyrs_fund}      minus />}
                {slip.loan_deduction    > 0 && <Row label={lbl('loan', lang)}         val={slip.loan_deduction}    minus />}
                {slip.other_deductions  > 0 && <Row label={lbl('otherDed', lang)}       val={slip.other_deductions}  minus />}
                <Row label={lbl('totalDed', lang)} val={slip.total_deductions} bold minus />
              </View>

              {/* Net */}
              <View style={s.netRow}>
                <Text style={s.netRowLabel}>{lbl('net', lang)}</Text>
                <Text style={s.netRowVal}>{cur(lang)} {fmtNum(slip.net_salary)}</Text>
              </View>
            </ScrollView>
          ) : (
            <View style={s.center}><Text style={s.empty}>{tr('No payslip data found for this run.', 'لا توجد بيانات قسيمة لهذا المسير.', 'مفيش بيانات قسيمة للشهر ده.')}</Text></View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const Row = ({ label, val, bold, minus }) => {
  const { lang } = useLang()
  return (
    <View style={sr.row}>
      <Text style={[sr.label, bold && sr.bold]}>{label}</Text>
      <Text style={[sr.val, bold && sr.bold, minus && sr.minus]}>
        {minus ? '−' : ''} {cur(lang)} {fmtNum(val)}
      </Text>
    </View>
  )
}

const statusLabel = (st, tr) => ({
  completed: tr('Completed', 'مكتمل', 'خلص'),
  released:  tr('Released', 'تم الصرف', 'اتصرف'),
  approved:  tr('Approved', 'معتمد', 'اتعتمد'),
  processing:tr('Processing', 'قيد المعالجة', 'بيتحسب'),
  draft:     tr('Draft', 'مسودة', 'مسودة'),
}[st] || (st || '').replace('_', ' '))

const s = StyleSheet.create({
  safe:             { flex: 1 },
  scroll:           { padding: 16, paddingBottom: 130 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:        { fontSize: 26, fontWeight: '900', marginBottom: 16 },
  empty:            { color: '#8A8DA3', textAlign: 'center', paddingVertical: 8 },

  featCard:         { borderRadius: 26, padding: 22, marginBottom: 20, overflow: 'hidden', shadowColor: '#12121C', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 6 },
  featTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  featLabel:        { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: ls(0.6) },
  featStatus:       { color: '#54E3C4', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  featMonth:        { color: 'white', fontSize: 28, fontWeight: '900', marginBottom: 4 },
  featPeriod:       { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  featFooter:       { marginTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 14 },
  featAction:       { color: '#54E3C4', fontSize: 13, fontWeight: '800' },

  section:          { marginBottom: 8 },
  sectionTitle:     { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: ls(0.5), marginBottom: 12 },

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
  sectionTitle2:    { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: ls(0.5), marginBottom: 10 },
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
