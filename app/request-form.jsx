// One form screen for every request type. The fields, checks and the API
// call come from src/requests/catalog.js; this screen only draws them,
// loads pick-lists (leave types, shifts, loans…) and sends the request.
import { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAuth } from '../src/context/AuthContext'
import { useTheme } from '../src/context/ThemeContext'
import { useLang } from '../src/context/LanguageContext'
import api from '../src/services/api'
import { resolveType, initialValues, visibleFields, validate, buildSubmission, visibleTypes } from '../src/requests/catalog'
import { ScreenHeader, TextField, DateField, SelectField, Segment, PrimaryButton } from '../src/components/FormFields'
import { leaveTypeName } from '../src/i18n/leaveTypes'
import { localDateOf, fmtNum } from '../src/i18n/format'

const rows = r => { const d = r?.data?.data; return Array.isArray(d) ? d : d?.rows || [] }

// Pick-list loaders, keyed by a field's optionsFrom.
const LOADERS = {
  leaveTypes: async ({ ar, tr }) => rows(await api.get('/leave/types'))
    .filter(t => t.is_active !== false)
    .map(t => ({ value: t.id, label: leaveTypeName(t, { ar, tr }) })),
  missionTypes: async ({ ar }) => rows(await api.get('/attendance/mission-types'))
    .map(t => ({ value: t.id, label: (ar && t.name_ar) || t.name })),
  shifts: async ({ ar }) => rows(await api.get('/attendance/shifts'))
    .filter(s => s.is_active !== false)
    .map(s => ({ value: s.id, label: (ar && s.name_ar) || s.name, hint: s.start_time ? `${String(s.start_time).slice(0, 5)} – ${String(s.end_time || '').slice(0, 5)}` : undefined })),
  myLoans: async ({ employeeId, tr }) => rows(await api.get(`/loans?employee_id=${employeeId}`))
    .filter(l => ['approved', 'active'].includes(l.status))
    .map(l => ({ value: l.id, label: tr(`EGP ${fmtNum(l.amount)}`, `${fmtNum(l.amount)} ج.م`), hint: l.monthly_deduction ? tr(`${fmtNum(l.monthly_deduction)} a month now`, `القسط الحالي ${fmtNum(l.monthly_deduction)}`) : undefined })),
  myDocuments: async ({ employeeId, ar }) => rows(await api.get(`/employees/${employeeId}/documents`))
    .map(d => ({ value: d.id, label: (ar && d.type_name_ar) || d.type_name || d.name || d.file_name || d.title || '—', hint: d.file_name || d.document_number || undefined })),
  directReports: async ({ employeeId, role, ar }) => {
    const all = rows(await api.get('/employees?limit=5000&status=active'))
    const mine = role === 'manager' ? all.filter(e => e.manager_id === employeeId) : all.filter(e => e.id !== employeeId)
    return mine.map(e => ({ value: e.id, label: ((ar && `${e.first_name_ar || ''} ${e.last_name_ar || ''}`.trim()) || `${e.first_name || ''} ${e.last_name || ''}`.trim()), hint: e.employee_number ? `#${e.employee_number}` : undefined }))
  },
}

export default function RequestForm() {
  const { type: typeKey } = useLocalSearchParams()
  const router = useRouter()
  const { colors } = useTheme()
  const { tr, ar } = useLang()
  const { user, can = () => true } = useAuth() || {}
  const T = l => (l ? (ar ? l[1] : l[0]) : '')
  const employeeId = user?.employee_id
  const allowed = useMemo(() => visibleTypes({ can, role: user?.role }).map(t => t.key), [user?.role, can])
  const type = resolveType(String(typeKey || ''))
  const [values, setValues] = useState(() => (type ? initialValues(type, localDateOf(new Date())) : {}))
  const [options, setOptions] = useState({})
  const [loadingOpts, setLoadingOpts] = useState({})
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!type) return
    let alive = true
    for (const f of type.fields.filter(f => f.optionsFrom)) {
      setLoadingOpts(p => ({ ...p, [f.key]: true }))
      LOADERS[f.optionsFrom]({ employeeId, role: user?.role, ar, tr })
        .then(o => { if (alive) setOptions(p => ({ ...p, [f.key]: o })) })
        .catch(() => { if (alive) setOptions(p => ({ ...p, [f.key]: [] })) })
        .finally(() => { if (alive) setLoadingOpts(p => ({ ...p, [f.key]: false })) })
    }
    return () => { alive = false }
  }, [type?.key, employeeId])

  if (!type || !allowed.includes(type.key)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <ScreenHeader title={tr('New request', 'طلب جديد')} />
        <Text style={{ margin: 20, color: colors.sub, fontSize: 14 }}>
          {tr('This request type is not available for your account. Please contact HR.', 'نوع الطلب هذا غير متاح لحسابك. يرجى التواصل مع الموارد البشرية.')}
        </Text>
      </SafeAreaView>
    )
  }

  const set = key => v => { setErr(''); setValues(p => ({ ...p, [key]: v })) }

  const send = async () => {
    const problem = validate(type, values)
    if (problem) { setErr(T(problem)); return }
    if (!employeeId && !type.forOthers) { setErr(tr('Your account is not linked to an employee record. Please contact HR.', 'حسابك غير مرتبط بسجل موظف. يرجى التواصل مع الموارد البشرية.')); return }
    const sub = buildSubmission(type, values, { employeeId, ar })
    setSaving(true); setErr('')
    try {
      const r = await api[sub.method](sub.path, sub.body)
      const created = Array.isArray(r?.data?.data) ? r.data.data[0] : r?.data?.data
      const next = sub.then && sub.then(created)
      if (next) await api[next.method](next.path, next.body).catch(() => {})
      Alert.alert(
        tr('Request sent', 'تم إرسال الطلب'),
        type.key === 'helpdesk' || type.key === 'loan'
          ? tr('HR will reply to you. You can follow it in Requests.', 'ستتواصل معك الموارد البشرية. يمكنك متابعته في الطلبات.')
          : tr('It went for approval. You can follow it in Requests → Pending.', 'تم إرساله للموافقة. يمكنك متابعته في الطلبات ← قيد الانتظار.'),
      )
      router.replace({ pathname: '/(tabs)/requests', params: { filter: 'pending', sent: String(Date.now()) } })
    } catch (e) {
      setErr(e.response?.data?.message || tr('Could not send the request. Please try again.', 'تعذّر إرسال الطلب. حاول مرة أخرى.'))
    } finally { setSaving(false) }
  }

  const submit = () => {
    if (!type.confirm) return send()
    Alert.alert(T(type.label), T(type.confirm), [
      { text: tr('Cancel', 'إلغاء'), style: 'cancel' },
      { text: tr('Send', 'إرسال'), style: 'destructive', onPress: send },
    ])
  }

  // Lay out fields; two "half" fields in a row share a line.
  const fields = visibleFields(type, values).filter(f => !(f.hideIfNoOptions && !loadingOpts[f.key] && !(options[f.key] || []).length))
  const lines = []
  for (const f of fields) {
    const last = lines[lines.length - 1]
    if (f.half && last && last.length === 1 && last[0].half) last.push(f); else lines.push([f])
  }
  const draw = (f, style) => {
    const label = T(f.label)
    if (f.kind === 'date' || f.kind === 'time') return <DateField key={f.key} style={style} label={label} mode={f.kind} value={values[f.key]} onChange={set(f.key)} />
    if (f.kind === 'segment') return <Segment key={f.key} style={style} label={f.label ? label : undefined} value={values[f.key]} options={f.options.map(o => ({ value: o.value, label: T(o.label) }))} onChange={set(f.key)} />
    if (f.kind === 'select') return <SelectField key={f.key} style={style} label={label} value={values[f.key]} loading={!!loadingOpts[f.key]} emptyText={T(f.emptyText)} options={f.options ? f.options.map(o => ({ value: o.value, label: T(o.label) })) : (options[f.key] || [])} onChange={set(f.key)} />
    return <TextField key={f.key} style={style} label={label} value={values[f.key]} onChange={set(f.key)} placeholder={T(f.placeholder)} multiline={f.kind === 'multiline'} keyboardType={f.kind === 'number' ? 'decimal-pad' : undefined} maxLength={f.max} />
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title={T(type.label)} subtitle={T(type.intro || type.hint)} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          {lines.map((line, i) => line.length === 1 ? draw(line[0]) : (
            <View key={`l${i}`} style={{ flexDirection: 'row', gap: 10 }}>{line.map(f => draw(f, { flex: 1 }))}</View>
          ))}
          <View style={{ backgroundColor: colors.primarySoft, borderRadius: 12, padding: 12, marginTop: 2 }}>
            <Text style={{ fontSize: 13, lineHeight: 19, color: colors.isDark ? colors.text : '#0E6A70' }}>
              {type.key === 'helpdesk' || type.key === 'loan'
                ? tr('Goes to HR. You\'ll see it under Requests.', 'يُرسل للموارد البشرية. ستجده في الطلبات.')
                : type.forOthers
                  ? tr('Goes to HR for approval.', 'يُرسل للموارد البشرية للموافقة.')
                  : tr('Goes for approval. You\'ll see it under Requests → Pending.', 'يُرسل للموافقة. ستجده في الطلبات ← قيد الانتظار.')}
            </Text>
          </View>
          {!!err && (
            <View accessibilityLiveRegion="polite" style={{ backgroundColor: '#FFEDEA', borderRadius: 12, padding: 12, marginTop: 12 }}>
              <Text style={{ color: '#9E3322', fontSize: 13, lineHeight: 19 }}>{err}</Text>
            </View>
          )}
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <PrimaryButton label={type.key === 'mission' ? tr('Submit mission', 'إرسال المأمورية') : tr('Send request', 'إرسال الطلب')} onPress={submit} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
