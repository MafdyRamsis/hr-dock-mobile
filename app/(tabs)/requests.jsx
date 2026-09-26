import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert, Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme, GRADIENTS } from '../../src/context/ThemeContext'
import api from '../../src/services/api'
import StatusBadge from '../../src/components/StatusBadge'
import PillTag from '../../src/components/PillTag'
import GradientIconBubble from '../../src/components/GradientIconBubble'
import FeedItem from '../../src/components/FeedItem'
import Skeleton, { SkeletonCard, SkeletonRow } from '../../src/components/Skeleton'
import { ls } from '../../src/utils/rtl'
import { useLang } from '../../src/context/LanguageContext'
import { fmtTime } from '../../src/i18n/format'

const toISO  = d => d.toISOString().split('T')[0]

/* ── Permission types ── */
const PERMISSIONS = tr => [
  { key: 'wfh',       icon: '🏠', label: tr('Work From Home', 'العمل من المنزل', 'شغل من البيت'),   gradient: 'mint',     desc: tr('Request to work remotely', 'طلب العمل عن بُعد', 'اطلب تشتغل من البيت') },
  { key: 'overtime',  icon: '⏱️', label: tr('Overtime', 'العمل الإضافي', 'أوفر تايم'),          gradient: 'sunshine', desc: tr('Log extra hours worked', 'تسجيل ساعات العمل الإضافية', 'سجّل الساعات الزيادة') },
  { key: 'late',      icon: '🕐', label: tr('Late Arrival', 'إذن تأخير'),      gradient: 'coral',    desc: tr('Permission to arrive late', 'إذن بالحضور متأخرًا', 'هتيجي متأخر شوية') },
  { key: 'early',     icon: '🚪', label: tr('Early Departure', 'إذن انصراف مبكر', 'إذن خروج بدري'),   gradient: 'lavender', desc: tr('Permission to leave early', 'إذن بالانصراف مبكرًا', 'هتمشي بدري شوية') },
]

const SOLID = { mint: '#2ED573', sunshine: '#FFA801', coral: '#FF6B6B', lavender: '#8854D0' }

/* ── Helpdesk categories ── */
const CATEGORIES = tr => [
  { key: 'hr',      icon: '👤', label: tr('HR', 'الموارد البشرية', 'الـ HR'),         desc: tr('Policies, queries, general HR', 'السياسات والاستفسارات وشؤون الموظفين', 'اللوايح والاستفسارات وأي حاجة HR'), gradient: 'mint' },
  { key: 'it',      icon: '🖥️', label: tr('IT Support', 'الدعم الفني', 'الـ IT'), desc: tr('Equipment, access, software', 'الأجهزة والصلاحيات والبرامج'),   gradient: 'lavender' },
  { key: 'finance', icon: '💰', label: tr('Finance', 'المالية', 'الحسابات'),     desc: tr('Reimbursement, advances', 'استرداد المصروفات والسُّلف', 'المصروفات والسلف'),       gradient: 'sunshine' },
  { key: 'admin',   icon: '🏢', label: tr('Admin', 'الشؤون الإدارية'),       desc: tr('Office, facilities, supplies', 'المكتب والمرافق والمستلزمات'),  gradient: 'coral' },
  { key: 'doc',     icon: '📄', label: tr('Documents', 'المستندات', 'الورق'),   desc: tr('Certificates, salary letters', 'الشهادات وخطابات الراتب', 'الشهادات وخطابات المرتب'),  gradient: 'lavender' },
  { key: 'other',   icon: '📋', label: tr('Other', 'أخرى', 'حاجة تانية'),       desc: tr('Anything else', 'أي طلب آخر', 'أي حاجة تانية'),                 gradient: 'mint' },
]

const CAT_COLORS = { hr:'#2ED573', it:'#3b82f6', finance:'#FFA801', admin:'#FF6B6B', doc:'#8854D0', other:'#8A8DA3' }
const CAT_GRADIENT = { hr:'mint', it:'lavender', finance:'sunshine', admin:'coral', doc:'lavender', other:'mint' }

const PRIORITIES = tr => [
  { key: 'low', label: tr('Low', 'منخفضة', 'عادي'), color: '#2ED573' },
  { key: 'medium', label: tr('Medium', 'متوسطة', 'مهم'), color: '#FFA801' },
  { key: 'high', label: tr('High', 'عالية', 'مستعجل'), color: '#FF6B6B' },
]

// Subjects prefill the (editable) request subject, so they use the formal wording.
const QUICK = tr => [
  { category: 'doc', subject: tr('Employment Certificate', 'شهادة عمل'), icon: '📃' },
  { category: 'doc', subject: tr('Salary Certificate', 'مفردات مرتب'),     icon: '💵' },
  { category: 'doc', subject: tr('Experience Letter', 'شهادة خبرة'),      icon: '🏅' },
  { category: 'finance', subject: tr('Expense Reimbursement', 'مطالبة مصروفات'), icon: '🧾' },
  { category: 'hr',  subject: tr('Policy Clarification', 'استفسار عن سياسة'),   icon: '📘' },
  { category: 'it',  subject: tr('Equipment Request', 'طلب أجهزة'),      icon: '💻' },
]

/* ─────────────────── Permission Form ─────────────────── */
function PermissionModal({ type, employeeId, onClose, onDone }) {
  const { tr, date: fmtDay } = useLang()
  const perm  = PERMISSIONS(tr).find(p => p.key === type)
  const solid = SOLID[perm.gradient]
  const selectDate = tr('Select date', 'اختر التاريخ', 'اختار التاريخ')
  const doneLabel  = tr('Done', 'تم', 'تمام')
  const [date,    setDate]    = useState('')
  const [endDate, setEndDate] = useState('')
  const [hours,   setHours]   = useState('')
  const [time,    setTime]    = useState('')
  const [reason,  setReason]  = useState('')
  const [err,     setErr]     = useState('')
  const [saving,  setSaving]  = useState(false)

  // date picker
  const [pickerTarget,   setPickerTarget]   = useState(null)
  const [pickerDate,     setPickerDate]     = useState(new Date())
  const [showPicker,     setShowPicker]     = useState(false)
  // time picker
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [pickerTime,     setPickerTime]     = useState(new Date())

  const openPicker = (target) => {
    const cur = target === 'end' ? endDate : date
    setPickerDate(cur ? new Date(cur) : new Date())
    setPickerTarget(target)
    setShowPicker(true)
  }
  const onDateChange = (e, sel) => {
    if (Platform.OS === 'android') setShowPicker(false)
    if (e.type === 'dismissed' || !sel) return
    const iso = toISO(sel)
    if (pickerTarget === 'end') setEndDate(iso); else setDate(iso)
  }
  const onTimeChange = (e, sel) => {
    if (Platform.OS === 'android') setShowTimePicker(false)
    if (e.type === 'dismissed' || !sel) return
    setPickerTime(sel)
    setTime(fmtTime(sel))
  }

  const submit = async () => {
    if (!date) { setErr(tr('Please select a date.', 'يرجى اختيار التاريخ.', 'اختار التاريخ الأول.')); return }
    setErr(''); setSaving(true)
    try {
      if (type === 'wfh') {
        await api.post('/wfh', { employee_id: employeeId, date, end_date: endDate || undefined, reason })
      } else if (type === 'overtime') {
        if (!hours || isNaN(hours) || Number(hours) <= 0) { setErr(tr('Please enter valid hours.', 'يرجى إدخال عدد ساعات صحيح.', 'اكتب عدد ساعات صحيح.')); setSaving(false); return }
        await api.post('/overtime', { employee_id: employeeId, date, hours: Number(hours), reason })
      } else {
        // late / early → helpdesk ticket
        const label = type === 'late' ? 'Late Arrival' : 'Early Departure'
        const body  = `Date: ${date}${time ? `\nTime: ${time}` : ''}\nReason: ${reason || 'Not specified'}`
        await api.post('/helpdesk', { subject: `${label} Permission – ${date}`, description: body, priority: 'medium', category: 'hr' })
      }
      onDone()
      Alert.alert(tr('Submitted', 'تم الإرسال', 'اتبعت'), tr('Your permission request has been sent for approval.', 'تم إرسال طلب الإذن للموافقة.', 'طلب الإذن اتبعت، ومستني رد.'))
    } catch (e) {
      setErr(e.response?.data?.message || tr('Submission failed. Please try again.', 'تعذّر إرسال الطلب. حاول مرة أخرى.', 'معرفناش نبعت الطلب. يلا نجرّب تاني.'))
    } finally { setSaving(false) }
  }

  const DateBtn = ({ target, value, label }) => (
    <TouchableOpacity style={pf.dateBtn} onPress={() => openPicker(target)}>
      <Text style={pf.dateBtnLabel}>{label}</Text>
      <Text style={[pf.dateBtnVal, !value && pf.datePlaceholder]}>
        {value ? fmtDay(value) : selectDate} 📅
      </Text>
    </TouchableOpacity>
  )

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={pf.safe}>
        <View style={pf.header}>
          <GradientIconBubble icon={perm.icon} gradient={perm.gradient} size={48} radius={16} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={pf.title}>{perm.label}</Text>
            <Text style={pf.desc}>{perm.desc}</Text>
          </View>
          <TouchableOpacity onPress={onClose}><Text style={pf.close}>✕</Text></TouchableOpacity>
        </View>

        <ScrollView style={pf.scroll} keyboardShouldPersistTaps="handled">
          {/* Date */}
          <DateBtn target="start" value={date} label={tr('Date', 'التاريخ')} />

          {/* WFH: optional end date */}
          {type === 'wfh' && (
            <DateBtn target="end" value={endDate} label={tr('End Date (optional – for multi-day)', 'تاريخ النهاية (اختياري – لأكثر من يوم)', 'تاريخ النهاية (لو أكتر من يوم)')} />
          )}

          {/* iOS picker */}
          {showPicker && Platform.OS === 'ios' && (
            <View style={pf.iosPicker}>
              <View style={pf.iosPickerHeader}>
                <Text style={pf.iosPickerLabel}>{pickerTarget === 'end' ? tr('End Date', 'تاريخ النهاية') : tr('Date', 'التاريخ')}</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={pf.iosPickerDone}>{doneLabel}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={pickerDate} mode="date" display="spinner" onChange={onDateChange} textColor="#000000" themeVariant="light" />
            </View>
          )}
          {showPicker && Platform.OS === 'android' && (
            <DateTimePicker value={pickerDate} mode="date" display="default" onChange={onDateChange} />
          )}

          {/* Overtime: hours */}
          {type === 'overtime' && (
            <View style={pf.field}>
              <Text style={pf.label}>{tr('Hours of Overtime', 'ساعات العمل الإضافي', 'ساعات الأوفر تايم')}</Text>
              <TextInput
                style={pf.input}
                placeholder={tr('e.g. 2', 'مثال: 2', 'مثلًا 2')}
                placeholderTextColor="#B0B3C6"
                value={hours}
                onChangeText={setHours}
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Late / Early: expected time */}
          {(type === 'late' || type === 'early') && (
            <View style={pf.field}>
              <Text style={pf.label}>{type === 'late' ? tr('Expected Arrival Time', 'وقت الحضور المتوقع', 'هتوصل إمتى؟') : tr('Expected Departure Time', 'وقت الانصراف المتوقع', 'هتمشي إمتى؟')}</Text>
              <TouchableOpacity style={pf.dateBtn} onPress={() => { setPickerTime(new Date()); setShowTimePicker(true) }}>
                <Text style={pf.dateBtnLabel}>{type === 'late' ? tr('Arrival Time', 'وقت الحضور', 'وقت الوصول') : tr('Departure Time', 'وقت الانصراف', 'وقت الخروج')}</Text>
                <Text style={[pf.dateBtnVal, !time && pf.datePlaceholder]}>
                  {time || tr('Select time', 'اختر الوقت', 'اختار الوقت')} 🕐
                </Text>
              </TouchableOpacity>
              {showTimePicker && Platform.OS === 'ios' && (
                <View style={pf.iosPicker}>
                  <View style={pf.iosPickerHeader}>
                    <Text style={pf.iosPickerLabel}>{tr('Select Time', 'اختر الوقت', 'اختار الوقت')}</Text>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={pf.iosPickerDone}>{doneLabel}</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker value={pickerTime} mode="time" display="spinner" onChange={onTimeChange} textColor="#000000" themeVariant="light" />
                </View>
              )}
              {showTimePicker && Platform.OS === 'android' && (
                <DateTimePicker value={pickerTime} mode="time" display="default" onChange={onTimeChange} />
              )}
            </View>
          )}

          {/* Reason */}
          <View style={pf.field}>
            <Text style={pf.label}>{tr('Reason', 'السبب')}</Text>
            <TextInput
              style={[pf.input, pf.textarea]}
              placeholder={tr('Please explain your request…', 'يرجى توضيح طلبك…', 'اكتب تفاصيل طلبك…')}
              placeholderTextColor="#B0B3C6"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {!!err && <View style={pf.errBox}><Text style={pf.errText}>{err}</Text></View>}

          <TouchableOpacity onPress={submit} disabled={saving} activeOpacity={0.85}>
            <LinearGradient colors={GRADIENTS[perm.gradient]} style={[pf.btn, saving && pf.btnDis]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={pf.btnText}>{tr('Submit Request', 'إرسال الطلب', 'ابعت الطلب')}</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

/* ─────────────────── Main Screen ─────────────────── */
export default function RequestsScreen() {
  const { user } = useAuth()
  const { colors } = useTheme()
  const { tr, date } = useLang()
  const fmt = d => (d ? date(d) : '')
  const PERMS = PERMISSIONS(tr)
  const CATS  = CATEGORIES(tr)
  const PRIOS = PRIORITIES(tr)
  const [tickets,    setTickets]    = useState([])
  const [wfhList,    setWfhList]    = useState([])
  const [otList,     setOtList]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [employeeId, setEmployeeId] = useState(user?.employee_id || null)

  const [activePerm, setActivePerm] = useState(null) // wfh | overtime | late | early
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState({ category: 'hr', subject: '', description: '', priority: 'medium' })
  const [formErr,    setFormErr]    = useState('')

  const [loadError, setLoadError] = useState(false)

  // Kept in sync with the auth context directly (see load()'s comment) —
  // no more resolving it from an unscoped /employees list fetch.
  useEffect(() => { setEmployeeId(user?.employee_id || null) }, [user])

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      // Self-scope every source: without this, an admin/hr_manager/manager
      // account saw every helpdesk ticket and every WFH/overtime request in
      // the whole company on this "My Requests" screen (confirmed live
      // against production). The old "resolve my employee_id by matching
      // /employees against my email, else emps[0]" logic is also gone —
      // it silently fell back to a random, unrelated employee whenever the
      // email match failed, which then got submitted as the employee_id on
      // new WFH/overtime requests below. user.employee_id from the auth
      // context is already the source of truth for this (used the same way
      // elsewhere in the app, e.g. team.jsx).
      const empQS = user?.employee_id ? `?employee_id=${user.employee_id}` : ''
      const [tickRes, wfhRes, otRes] = await Promise.allSettled([
        api.get('/helpdesk?limit=50&mine=1'),
        api.get(`/wfh${empQS}`),
        api.get(`/overtime${empQS}`),
      ])
      if (tickRes.status === 'fulfilled') setTickets(tickRes.value.data.data || [])
      if (wfhRes.status  === 'fulfilled') setWfhList(wfhRes.value.data.data  || [])
      if (otRes.status   === 'fulfilled') setOtList(otRes.value.data.data    || [])
    } catch { setLoadError(true) }
    finally { setLoading(false); setRefreshing(false) }
  }, [user])

  useEffect(() => { load() }, [])

  const openForm = (preset = {}) => {
    setForm({ category: 'hr', subject: '', description: '', priority: 'medium', ...preset })
    setFormErr('')
    setShowForm(true)
  }

  const submit = async () => {
    if (!form.subject.trim())     { setFormErr(tr('Please enter a subject.', 'يرجى إدخال عنوان الطلب.', 'اكتب عنوان الطلب.')); return }
    if (!form.description.trim()) { setFormErr(tr('Please describe your request.', 'يرجى وصف طلبك.', 'اكتب تفاصيل طلبك.')); return }
    setFormErr(''); setSaving(true)
    try {
      await api.post('/helpdesk', { subject: form.subject.trim(), description: form.description.trim(), priority: form.priority, category: form.category })
      setShowForm(false)
      await load()
      Alert.alert(tr('Submitted', 'تم الإرسال', 'اتبعت'), tr('Your request has been sent to HR.', 'تم إرسال طلبك إلى الموارد البشرية.', 'طلبك وصل للـ HR، ومستني رد.'))
    } catch (e) {
      setFormErr(e.response?.data?.message || tr('Failed to submit.', 'تعذّر إرسال الطلب. حاول مرة أخرى.', 'معرفناش نبعت الطلب. يلا نجرّب تاني.'))
    } finally { setSaving(false) }
  }

  const allPermissions = [
    ...wfhList.map(x => ({ ...x, _type: 'wfh',      icon: '🏠', label: PERMS[0].label, gradient: 'mint' })),
    ...otList.map(x =>  ({ ...x, _type: 'overtime',  icon: '⏱️', label: PERMS[1].label, gradient: 'sunshine' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))


  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#8854D0" />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.pageTitle, { color: colors.text }]}>{tr('Requests', 'الطلبات', 'طلباتك')}</Text>

        {loadError && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>⚠️  {tr('Could not load requests — pull down to retry', 'تعذّر تحميل الطلبات — اسحب للأسفل لإعادة المحاولة', 'معرفناش نحمّل الطلبات — اسحب لتحت ونجرّب تاني')}</Text>
          </View>
        )}

        {/* ── Permission Requests ── */}
        <Text style={[s.sectionLabel, { color: colors.sub }]}>{tr('Permission Requests', 'طلبات الأذونات', 'الأذونات')}</Text>
        <View style={s.permGrid}>
          {PERMS.map(p => (
            <TouchableOpacity key={p.key} style={[s.permCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]} onPress={() => setActivePerm(p.key)} activeOpacity={0.85}>
              <GradientIconBubble icon={p.icon} gradient={p.gradient} size={40} radius={13} />
              <Text style={[s.permLabel, { color: SOLID[p.gradient] }]}>{p.label}</Text>
              <Text style={[s.permDesc, { color: colors.muted }]} numberOfLines={2}>{p.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent permissions list */}
        {allPermissions.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.sub }]}>{tr('Permission History', 'سجل الأذونات', 'أذوناتك اللي فاتت')}</Text>
            {allPermissions.slice(0, 6).map(p => (
              <FeedItem
                key={p.id}
                icon={p.icon}
                gradient={p.gradient}
                title={p.label}
                subtitle={`${fmt(p.date)}${p._type === 'overtime' && p.minutes ? ` · ${Math.round(p.minutes / 60)}${tr('h', ' ساعة')}` : ''}`}
                right={<StatusBadge status={p.status} />}
              />
            ))}
          </View>
        )}

        {/* ── HR / General Requests ── */}
        <View style={s.sectionRow}>
          <Text style={[s.sectionLabel, { color: colors.sub }]}>{tr('HR Requests', 'طلبات الموارد البشرية', 'طلبات الـ HR')}</Text>
          <TouchableOpacity onPress={() => openForm()} activeOpacity={0.85}>
            <LinearGradient colors={GRADIENTS.lavender} style={s.newBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.newBtnText}>+ {tr('New', 'جديد', 'اطلب')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Quick chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickScroll} contentContainerStyle={s.quickContent}>
          {QUICK(tr).map((q, i) => (
            <TouchableOpacity key={i} style={[s.quickChip, { backgroundColor: colors.card, borderColor: colors.glassBorder }]} onPress={() => openForm({ category: q.category, subject: q.subject })} activeOpacity={0.85}>
              <Text style={s.quickIcon}>{q.icon}</Text>
              <Text style={[s.quickLabel, { color: colors.sub }]}>{q.subject}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category grid */}
        <View style={s.catGrid}>
          {CATS.map(c => (
            <TouchableOpacity key={c.key} style={[s.catCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]} onPress={() => openForm({ category: c.key })} activeOpacity={0.85}>
              <GradientIconBubble icon={c.icon} gradient={CAT_GRADIENT[c.key]} size={36} radius={11} />
              <Text style={[s.catLabel, { color: colors.text }]}>{c.label}</Text>
              <Text style={[s.catDesc, { color: colors.muted }]} numberOfLines={2}>{c.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Helpdesk list */}
        {loading ? (
          <View style={{ marginTop: 8 }}>
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </View>
        ) : tickets.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>📭</Text>
            <Text style={[s.emptyTitle, { color: colors.text2 }]}>{tr('No requests yet', 'لا توجد طلبات بعد', 'لسه مفيش طلبات')}</Text>
            <Text style={[s.emptySub, { color: colors.muted }]}>{tr('Use the categories above to submit your first request to HR.', 'اختر أحد الأقسام أعلاه لإرسال أول طلب إلى الموارد البشرية.', 'اختار من الأقسام اللي فوق وابعت أول طلب للـ HR.')}</Text>
          </View>
        ) : (
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.sub }]}>{tr('All HR Requests', 'كل طلبات الموارد البشرية', 'كل طلباتك للـ HR')}</Text>
            {tickets.map(t => <TicketCard key={t.id} ticket={t} colors={colors} />)}
          </View>
        )}
      </ScrollView>

      {/* Permission Modal */}
      {activePerm && (
        <PermissionModal
          type={activePerm}
          employeeId={employeeId}
          onClose={() => setActivePerm(null)}
          onDone={() => { setActivePerm(null); load() }}
        />
      )}

      {/* HR Request Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={m.safe}>
          <View style={m.header}>
            <Text style={m.title}>{tr('New HR Request', 'طلب جديد للموارد البشرية', 'طلب جديد للـ HR')}</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={m.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={m.scroll} keyboardShouldPersistTaps="handled">
            <Text style={m.label}>{tr('Category', 'التصنيف', 'النوع')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CATS.map(c => {
                  const active = form.category === c.key
                  return (
                    <TouchableOpacity key={c.key} onPress={() => setForm(f => ({ ...f, category: c.key }))} activeOpacity={0.85}>
                      {active ? (
                        <LinearGradient colors={GRADIENTS[CAT_GRADIENT[c.key]]} style={m.catChip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                          <Text style={m.catChipIcon}>{c.icon}</Text>
                          <Text style={m.catChipActive}>{c.label}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={[m.catChip, m.catChipInactive]}>
                          <Text style={m.catChipIcon}>{c.icon}</Text>
                          <Text style={m.catChipText}>{c.label}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>

            <Text style={m.label}>{tr('Priority', 'الأولوية')}</Text>
            <View style={m.prioRow}>
              {PRIOS.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={[m.prioBtn, form.priority === p.key && { backgroundColor: p.color, borderColor: p.color }]}
                  onPress={() => setForm(f => ({ ...f, priority: p.key }))}
                >
                  <Text style={[m.prioBtnText, form.priority === p.key && m.prioBtnActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={m.label}>{tr('Subject', 'العنوان')}</Text>
            <TextInput style={m.input} placeholder={tr('What do you need?', 'ما الذي تحتاجه؟', 'محتاج إيه؟')} placeholderTextColor="#B0B3C6" value={form.subject} onChangeText={v => setForm(f => ({ ...f, subject: v }))} />
            <Text style={m.label}>{tr('Details', 'التفاصيل')}</Text>
            <TextInput style={[m.input, m.textarea]} placeholder={tr('Please provide details…', 'يرجى كتابة التفاصيل…', 'اكتب التفاصيل…')} placeholderTextColor="#B0B3C6" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline numberOfLines={5} textAlignVertical="top" />
            {!!formErr && <View style={m.errBox}><Text style={m.errText}>{formErr}</Text></View>}
            <TouchableOpacity onPress={submit} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={GRADIENTS.lavender} style={[m.submitBtn, saving && m.submitDis]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={m.submitText}>{tr('Submit Request', 'إرسال الطلب', 'ابعت الطلب')}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function TicketCard({ ticket: t, colors }) {
  const { tr, date } = useLang()
  const fmt = d => (d ? date(d) : '')
  const CATS = CATEGORIES(tr)
  const cat = CATS.find(c => c.key === t.category) || CATS[5]
  const color = CAT_COLORS[t.category] || '#8A8DA3'
  const prio = PRIORITIES(tr).find(p => p.key === t.priority)
  return (
    <View style={[tc.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
      <View style={tc.top}>
        <GradientIconBubble icon={cat.icon} gradient={CAT_GRADIENT[t.category] || 'mint'} size={38} radius={12} />
        <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
          <Text style={[tc.subject, { color: colors.text }]} numberOfLines={1}>{t.subject}</Text>
          <Text style={[tc.meta, { color: colors.muted }]}>{cat.label} · {fmt(t.created_at)}</Text>
        </View>
        <StatusBadge status={t.status} />
      </View>
      {t.description ? <Text style={[tc.desc, { color: colors.sub }]} numberOfLines={2}>{t.description}</Text> : null}
      {prio && (
        <View style={[tc.prioBadge, { backgroundColor: `${prio.color}18` }]}>
          <View style={[tc.prioDot, { backgroundColor: prio.color }]} />
          <Text style={[tc.prioText, { color: prio.color }]}>{prio.label}</Text>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  scroll:       { padding: 14, paddingBottom: 130 },
  pageTitle:    { fontSize: 26, fontWeight: '900', marginBottom: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: ls(0.5), marginBottom: 10 },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  section:      { marginBottom: 8 },
  newBtn:       { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText:   { color: 'white', fontWeight: '800', fontSize: 12 },

  permGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  permCard:     { width: '47%', borderRadius: 18, padding: 14, borderWidth: 1, shadowColor: '#8890B5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 1 },
  permLabel:    { fontSize: 13, fontWeight: '800', marginTop: 10, marginBottom: 3 },
  permDesc:     { fontSize: 11, lineHeight: 15 },

  quickScroll:  { marginBottom: 14, marginHorizontal: -4 },
  quickContent: { paddingHorizontal: 4, gap: 8 },
  quickChip:    { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', minWidth: 84, borderWidth: 1, shadowColor: '#8890B5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  quickIcon:    { fontSize: 16, marginBottom: 4 },
  quickLabel:   { fontSize: 10, fontWeight: '700', textAlign: 'center', maxWidth: 76 },

  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  catCard:      { width: '47%', borderRadius: 18, padding: 14, borderWidth: 1, shadowColor: '#8890B5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 1 },
  catLabel:     { fontSize: 12, fontWeight: '800', marginTop: 8, marginBottom: 2 },
  catDesc:      { fontSize: 10, lineHeight: 14 },

  errorBanner:  { backgroundColor: '#FFF6DD', borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FFE9AE' },
  errorText:    { fontSize: 12, color: '#92400e', fontWeight: '600', textAlign: 'center' },
  emptyBox:     { alignItems: 'center', paddingVertical: 30 },
  emptyIcon:    { fontSize: 40, marginBottom: 10 },
  emptyTitle:   { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  emptySub:     { fontSize: 13, textAlign: 'center', maxWidth: 240, lineHeight: 18 },
})

const tc = StyleSheet.create({
  card:      { borderRadius: 18, padding: 14, marginBottom: 8, borderWidth: 1, shadowColor: '#8890B5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  top:       { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  subject:   { fontSize: 13, fontWeight: '700', marginBottom: 1 },
  meta:      { fontSize: 11 },
  desc:      { fontSize: 12, lineHeight: 16, marginBottom: 6 },
  prioBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  prioDot:   { width: 5, height: 5, borderRadius: 3 },
  prioText:  { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
})

const pf = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: 'white' },
  header:         { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEF0F8' },
  title:          { fontSize: 16, fontWeight: '800', color: '#1A1B2E' },
  desc:           { fontSize: 12, color: '#8A8DA3' },
  close:          { fontSize: 22, color: '#8A8DA3' },
  scroll:         { padding: 20 },
  field:          { marginBottom: 16 },
  label:          { fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: ls(0.4), marginBottom: 8 },
  input:          { borderWidth: 1.5, borderColor: '#E3E6F3', borderRadius: 16, padding: 14, fontSize: 14, color: '#1A1B2E', backgroundColor: '#F5F6FC', marginBottom: 16 },
  textarea:       { minHeight: 90, textAlignVertical: 'top' },
  dateBtn:        { borderWidth: 1.5, borderColor: '#E3E6F3', borderRadius: 16, padding: 14, backgroundColor: '#F5F6FC', marginBottom: 16 },
  dateBtnLabel:   { fontSize: 10, fontWeight: '700', color: '#8A8DA3', textTransform: 'uppercase', letterSpacing: ls(0.4), marginBottom: 4 },
  dateBtnVal:     { fontSize: 14, fontWeight: '600', color: '#1A1B2E' },
  datePlaceholder:{ color: '#B0B3C6', fontWeight: '400' },
  iosPicker:      { backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E3E6F3' },
  iosPickerHeader:{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E3E6F3', backgroundColor: '#ffffff' },
  iosPickerLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  iosPickerDone:  { fontSize: 14, fontWeight: '700', color: '#8854D0' },
  errBox:         { backgroundColor: '#FFE9E6', borderWidth: 1, borderColor: '#FFCFC9', borderRadius: 14, padding: 12, marginBottom: 14 },
  errText:        { color: '#E14F4A', fontSize: 13, fontWeight: '600' },
  btn:            { borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 40 },
  btnDis:         { opacity: 0.6 },
  btnText:        { color: 'white', fontSize: 15, fontWeight: '800' },
})

const m = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: 'white' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEF0F8' },
  title:      { fontSize: 18, fontWeight: '800', color: '#1A1B2E' },
  close:      { fontSize: 22, color: '#8A8DA3' },
  scroll:     { padding: 20 },
  label:      { fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: ls(0.4), marginBottom: 8 },
  catChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  catChipInactive: { borderWidth: 1.5, borderColor: '#E3E6F3', backgroundColor: '#F5F6FC' },
  catChipIcon:{ fontSize: 13 },
  catChipText:{ fontSize: 12, fontWeight: '700', color: '#475569' },
  catChipActive:{ color: 'white', fontSize: 12, fontWeight: '800' },
  prioRow:    { flexDirection: 'row', gap: 8, marginBottom: 18 },
  prioBtn:    { flex: 1, borderWidth: 1.5, borderColor: '#E3E6F3', borderRadius: 12, paddingVertical: 9, alignItems: 'center', backgroundColor: '#F5F6FC' },
  prioBtnText:{ fontSize: 12, fontWeight: '600', color: '#475569' },
  prioBtnActive:{ color: 'white', fontWeight: '700' },
  input:      { borderWidth: 1.5, borderColor: '#E3E6F3', borderRadius: 16, padding: 14, fontSize: 14, color: '#1A1B2E', backgroundColor: '#F5F6FC', marginBottom: 18 },
  textarea:   { minHeight: 110, textAlignVertical: 'top' },
  errBox:     { backgroundColor: '#FFE9E6', borderWidth: 1, borderColor: '#FFCFC9', borderRadius: 14, padding: 12, marginBottom: 14 },
  errText:    { color: '#E14F4A', fontSize: 13, fontWeight: '600' },
  submitBtn:  { borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 40 },
  submitDis:  { opacity: 0.6 },
  submitText: { color: 'white', fontSize: 15, fontWeight: '800' },
})
