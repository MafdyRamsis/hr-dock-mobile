import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert, Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'
import api from '../../src/services/api'
import StatusBadge from '../../src/components/StatusBadge'
import Skeleton, { SkeletonCard, SkeletonRow } from '../../src/components/Skeleton'

const fmt    = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
const toISO  = d => d.toISOString().split('T')[0]
const fmtISO = s => s ? s.split('-').reverse().join('/') : 'Select date'

/* ── Permission types ── */
const PERMISSIONS = [
  { key: 'wfh',       icon: '🏠', label: 'Work From Home',   color: '#2BC4BE', desc: 'Request to work remotely' },
  { key: 'overtime',  icon: '⏱️', label: 'Overtime',          color: '#f59e0b', desc: 'Log extra hours worked' },
  { key: 'late',      icon: '🕐', label: 'Late Arrival',      color: '#E8583C', desc: 'Permission to arrive late' },
  { key: 'early',     icon: '🚪', label: 'Early Departure',   color: '#8b5cf6', desc: 'Permission to leave early' },
]

/* ── Helpdesk categories ── */
const CATEGORIES = [
  { key: 'hr',      icon: '👤', label: 'HR',         desc: 'Policies, queries, general HR' },
  { key: 'it',      icon: '🖥️', label: 'IT Support', desc: 'Equipment, access, software' },
  { key: 'finance', icon: '💰', label: 'Finance',     desc: 'Reimbursement, advances' },
  { key: 'admin',   icon: '🏢', label: 'Admin',       desc: 'Office, facilities, supplies' },
  { key: 'doc',     icon: '📄', label: 'Documents',   desc: 'Certificates, salary letters' },
  { key: 'other',   icon: '📋', label: 'Other',       desc: 'Anything else' },
]

const CAT_COLORS = { hr:'#2BC4BE', it:'#3b82f6', finance:'#16a34a', admin:'#f59e0b', doc:'#8b5cf6', other:'#64748b' }

const PRIORITIES = [
  { key: 'low', label: 'Low', color: '#22c55e' },
  { key: 'medium', label: 'Medium', color: '#f59e0b' },
  { key: 'high', label: 'High', color: '#ef4444' },
]

const QUICK = [
  { category: 'doc', subject: 'Employment Certificate', icon: '📃' },
  { category: 'doc', subject: 'Salary Certificate',     icon: '💵' },
  { category: 'doc', subject: 'Experience Letter',      icon: '🏅' },
  { category: 'finance', subject: 'Expense Reimbursement', icon: '🧾' },
  { category: 'hr',  subject: 'Policy Clarification',   icon: '📘' },
  { category: 'it',  subject: 'Equipment Request',      icon: '💻' },
]

/* ─────────────────── Permission Form ─────────────────── */
function PermissionModal({ type, employeeId, onClose, onDone }) {
  const perm = PERMISSIONS.find(p => p.key === type)
  const [date,    setDate]    = useState('')
  const [endDate, setEndDate] = useState('')
  const [hours,   setHours]   = useState('')
  const [time,    setTime]    = useState('')
  const [reason,  setReason]  = useState('')
  const [err,     setErr]     = useState('')
  const [saving,  setSaving]  = useState(false)

  // date picker
  const [pickerTarget, setPickerTarget] = useState(null)
  const [pickerDate,   setPickerDate]   = useState(new Date())
  const [showPicker,   setShowPicker]   = useState(false)

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

  const submit = async () => {
    if (!date) { setErr('Please select a date.'); return }
    setErr(''); setSaving(true)
    try {
      if (type === 'wfh') {
        await api.post('/wfh', { employee_id: employeeId, date, end_date: endDate || undefined, reason })
      } else if (type === 'overtime') {
        if (!hours || isNaN(hours) || Number(hours) <= 0) { setErr('Please enter valid hours.'); setSaving(false); return }
        await api.post('/overtime', { employee_id: employeeId, date, hours: Number(hours), reason })
      } else {
        // late / early → helpdesk ticket
        const label = type === 'late' ? 'Late Arrival' : 'Early Departure'
        const body  = `Date: ${date}${time ? `\nTime: ${time}` : ''}\nReason: ${reason || 'Not specified'}`
        await api.post('/helpdesk', { subject: `${label} Permission – ${date}`, description: body, priority: 'medium', category: 'hr' })
      }
      onDone()
      Alert.alert('Submitted', 'Your permission request has been sent for approval.')
    } catch (e) {
      setErr(e.response?.data?.message || 'Submission failed. Please try again.')
    } finally { setSaving(false) }
  }

  const DateBtn = ({ target, value, label }) => (
    <TouchableOpacity style={pf.dateBtn} onPress={() => openPicker(target)}>
      <Text style={pf.dateBtnLabel}>{label}</Text>
      <Text style={[pf.dateBtnVal, !value && pf.datePlaceholder]}>
        {value ? fmtISO(value) : 'Select date'} 📅
      </Text>
    </TouchableOpacity>
  )

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={pf.safe}>
        <View style={pf.header}>
          <View style={[pf.iconBox, { backgroundColor: `${perm.color}18` }]}>
            <Text style={pf.icon}>{perm.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={pf.title}>{perm.label}</Text>
            <Text style={pf.desc}>{perm.desc}</Text>
          </View>
          <TouchableOpacity onPress={onClose}><Text style={pf.close}>✕</Text></TouchableOpacity>
        </View>

        <ScrollView style={pf.scroll} keyboardShouldPersistTaps="handled">
          {/* Date */}
          <DateBtn target="start" value={date} label="Date" />

          {/* WFH: optional end date */}
          {type === 'wfh' && (
            <DateBtn target="end" value={endDate} label="End Date (optional – for multi-day)" />
          )}

          {/* iOS picker */}
          {showPicker && Platform.OS === 'ios' && (
            <View style={pf.iosPicker}>
              <View style={pf.iosPickerHeader}>
                <Text style={pf.iosPickerLabel}>{pickerTarget === 'end' ? 'End Date' : 'Date'}</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={pf.iosPickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={pickerDate} mode="date" display="spinner" onChange={onDateChange} minimumDate={new Date()} />
            </View>
          )}
          {showPicker && Platform.OS === 'android' && (
            <DateTimePicker value={pickerDate} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()} />
          )}

          {/* Overtime: hours */}
          {type === 'overtime' && (
            <View style={pf.field}>
              <Text style={pf.label}>Hours of Overtime</Text>
              <TextInput
                style={pf.input}
                placeholder="e.g. 2"
                placeholderTextColor="#94a3b8"
                value={hours}
                onChangeText={setHours}
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Late / Early: expected time */}
          {(type === 'late' || type === 'early') && (
            <View style={pf.field}>
              <Text style={pf.label}>{type === 'late' ? 'Expected Arrival Time' : 'Expected Departure Time'}</Text>
              <TextInput
                style={pf.input}
                placeholder="e.g. 10:00"
                placeholderTextColor="#94a3b8"
                value={time}
                onChangeText={setTime}
              />
            </View>
          )}

          {/* Reason */}
          <View style={pf.field}>
            <Text style={pf.label}>Reason</Text>
            <TextInput
              style={[pf.input, pf.textarea]}
              placeholder="Please explain your request…"
              placeholderTextColor="#94a3b8"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {!!err && <View style={pf.errBox}><Text style={pf.errText}>{err}</Text></View>}

          <TouchableOpacity
            style={[pf.btn, { backgroundColor: perm.color }, saving && pf.btnDis]}
            onPress={submit}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="white" /> : <Text style={pf.btnText}>Submit Request</Text>}
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

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const [tickRes, wfhRes, otRes, empRes] = await Promise.allSettled([
        api.get('/helpdesk?limit=50'),
        api.get('/wfh'),
        api.get('/overtime'),
        api.get('/employees'),
      ])
      if (tickRes.status === 'fulfilled') setTickets(tickRes.value.data.data || [])
      if (wfhRes.status  === 'fulfilled') setWfhList(wfhRes.value.data.data  || [])
      if (otRes.status   === 'fulfilled') setOtList(otRes.value.data.data    || [])
      if (empRes.status  === 'fulfilled') {
        const emps = empRes.value.data.data || []
        const me = emps.find(e => e.email === user?.email) || emps[0]
        if (me?.id) setEmployeeId(me.id)
      }
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
    if (!form.subject.trim())     { setFormErr('Please enter a subject.'); return }
    if (!form.description.trim()) { setFormErr('Please describe your request.'); return }
    setFormErr(''); setSaving(true)
    try {
      await api.post('/helpdesk', { subject: form.subject.trim(), description: form.description.trim(), priority: form.priority, category: form.category })
      setShowForm(false)
      await load()
      Alert.alert('Submitted', 'Your request has been sent to HR.')
    } catch (e) {
      setFormErr(e.response?.data?.message || 'Failed to submit.')
    } finally { setSaving(false) }
  }

  const allPermissions = [
    ...wfhList.map(x => ({ ...x, _type: 'wfh',      icon: '🏠', label: 'Work From Home', color: '#2BC4BE' })),
    ...otList.map(x =>  ({ ...x, _type: 'overtime',  icon: '⏱️', label: 'Overtime',       color: '#f59e0b' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2BC4BE" />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.pageTitle, { color: colors.text }]}>Requests</Text>

        {loadError && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>⚠️  Could not load requests — pull down to retry</Text>
          </View>
        )}

        {/* ── Permission Requests ── */}
        <Text style={[s.sectionLabel, { color: colors.sub }]}>Permission Requests</Text>
        <View style={s.permGrid}>
          {PERMISSIONS.map(p => (
            <TouchableOpacity key={p.key} style={[s.permCard, { backgroundColor: colors.card }]} onPress={() => setActivePerm(p.key)} activeOpacity={0.8}>
              <View style={[s.permIconBox, { backgroundColor: `${p.color}18` }]}>
                <Text style={s.permIcon}>{p.icon}</Text>
              </View>
              <Text style={[s.permLabel, { color: p.color }]}>{p.label}</Text>
              <Text style={s.permDesc} numberOfLines={2}>{p.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent permissions list */}
        {allPermissions.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.sub }]}>Permission History</Text>
            {allPermissions.slice(0, 6).map(p => (
              <View key={p.id} style={[s.permRow, { backgroundColor: colors.card }]}>
                <View style={[s.permRowDot, { backgroundColor: `${p.color}22` }]}>
                  <Text>{p.icon}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.permRowLabel, { color: colors.text2 }]}>{p.label}</Text>
                  <Text style={s.permRowDate}>
                    {fmt(p.date)}{p._type === 'overtime' && p.minutes ? ` · ${Math.round(p.minutes / 60)}h` : ''}
                  </Text>
                </View>
                <StatusBadge status={p.status} />
              </View>
            ))}
          </View>
        )}

        {/* ── HR / General Requests ── */}
        <View style={s.sectionRow}>
          <Text style={[s.sectionLabel, { color: colors.sub }]}>HR Requests</Text>
          <TouchableOpacity style={s.newBtn} onPress={() => openForm()} activeOpacity={0.85}>
            <Text style={s.newBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Quick chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickScroll} contentContainerStyle={s.quickContent}>
          {QUICK.map((q, i) => (
            <TouchableOpacity key={i} style={[s.quickChip, { backgroundColor: colors.card }]} onPress={() => openForm({ category: q.category, subject: q.subject })} activeOpacity={0.8}>
              <Text style={s.quickIcon}>{q.icon}</Text>
              <Text style={[s.quickLabel, { color: colors.sub }]}>{q.subject}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category grid */}
        <View style={s.catGrid}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c.key} style={[s.catCard, { backgroundColor: colors.card }]} onPress={() => openForm({ category: c.key })} activeOpacity={0.8}>
              <View style={[s.catIconBox, { backgroundColor: `${CAT_COLORS[c.key]}18` }]}>
                <Text style={s.catIcon}>{c.icon}</Text>
              </View>
              <Text style={[s.catLabel, { color: colors.text }]}>{c.label}</Text>
              <Text style={s.catDesc} numberOfLines={2}>{c.desc}</Text>
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
            <Text style={[s.emptyTitle, { color: colors.text2 }]}>No requests yet</Text>
            <Text style={s.emptySub}>Use the categories above to submit your first request to HR.</Text>
          </View>
        ) : (
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.sub }]}>All HR Requests</Text>
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
            <Text style={m.title}>New HR Request</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={m.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={m.scroll} keyboardShouldPersistTaps="handled">
            <Text style={m.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.key}
                    style={[m.catChip, form.category === c.key && { backgroundColor: CAT_COLORS[c.key], borderColor: CAT_COLORS[c.key] }]}
                    onPress={() => setForm(f => ({ ...f, category: c.key }))}
                  >
                    <Text style={m.catChipIcon}>{c.icon}</Text>
                    <Text style={[m.catChipText, form.category === c.key && m.catChipActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={m.label}>Priority</Text>
            <View style={m.prioRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={[m.prioBtn, form.priority === p.key && { backgroundColor: p.color, borderColor: p.color }]}
                  onPress={() => setForm(f => ({ ...f, priority: p.key }))}
                >
                  <Text style={[m.prioBtnText, form.priority === p.key && m.prioBtnActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={m.label}>Subject</Text>
            <TextInput style={m.input} placeholder="What do you need?" placeholderTextColor="#94a3b8" value={form.subject} onChangeText={v => setForm(f => ({ ...f, subject: v }))} />
            <Text style={m.label}>Details</Text>
            <TextInput style={[m.input, m.textarea]} placeholder="Please provide details…" placeholderTextColor="#94a3b8" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline numberOfLines={5} textAlignVertical="top" />
            {!!formErr && <View style={m.errBox}><Text style={m.errText}>{formErr}</Text></View>}
            <TouchableOpacity style={[m.submitBtn, saving && m.submitDis]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={m.submitText}>Submit Request</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function TicketCard({ ticket: t, colors }) {
  const cat = CATEGORIES.find(c => c.key === t.category) || CATEGORIES[5]
  const color = CAT_COLORS[t.category] || '#64748b'
  const prio = PRIORITIES.find(p => p.key === t.priority)
  return (
    <View style={[tc.card, { backgroundColor: colors.card }]}>
      <View style={tc.top}>
        <View style={[tc.catDot, { backgroundColor: `${color}18` }]}>
          <Text style={tc.catIcon}>{cat.icon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[tc.subject, { color: colors.text }]} numberOfLines={1}>{t.subject}</Text>
          <Text style={tc.meta}>{cat.label} · {fmt(t.created_at)}</Text>
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
  safe:         { flex: 1, backgroundColor: '#F0F4FA' },
  scroll:       { padding: 14, paddingBottom: 40 },
  pageTitle:    { fontSize: 26, fontWeight: '900', color: '#0F1829', marginBottom: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  section:      { marginBottom: 8 },
  newBtn:       { backgroundColor: '#0F1829', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  newBtnText:   { color: 'white', fontWeight: '700', fontSize: 12 },

  permGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  permCard:     { width: '47%', backgroundColor: 'white', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  permIconBox:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  permIcon:     { fontSize: 20 },
  permLabel:    { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  permDesc:     { fontSize: 11, color: '#94a3b8', lineHeight: 15 },

  permRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 8 },
  permRowDot:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  permRowLabel: { fontSize: 13, fontWeight: '600', color: '#0F1829', marginBottom: 2 },
  permRowDate:  { fontSize: 11, color: '#94a3b8' },

  quickScroll:  { marginBottom: 14, marginHorizontal: -4 },
  quickContent: { paddingHorizontal: 4, gap: 8 },
  quickChip:    { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', minWidth: 84, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  quickIcon:    { fontSize: 16, marginBottom: 4 },
  quickLabel:   { fontSize: 10, fontWeight: '600', color: '#374151', textAlign: 'center', maxWidth: 76 },

  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  catCard:      { width: '47%', backgroundColor: 'white', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  catIconBox:   { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catIcon:      { fontSize: 18 },
  catLabel:     { fontSize: 12, fontWeight: '700', color: '#0F1829', marginBottom: 2 },
  catDesc:      { fontSize: 10, color: '#94a3b8', lineHeight: 14 },

  errorBanner:  { backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#fcd34d' },
  errorText:    { fontSize: 12, color: '#92400e', fontWeight: '600', textAlign: 'center' },
  emptyBox:     { alignItems: 'center', paddingVertical: 30 },
  emptyIcon:    { fontSize: 40, marginBottom: 10 },
  emptyTitle:   { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  emptySub:     { fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 240, lineHeight: 18 },
})

const tc = StyleSheet.create({
  card:      { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  top:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  catDot:    { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catIcon:   { fontSize: 15 },
  subject:   { fontSize: 13, fontWeight: '700', color: '#0F1829', marginBottom: 1 },
  meta:      { fontSize: 11, color: '#94a3b8' },
  desc:      { fontSize: 12, color: '#64748b', lineHeight: 16, marginBottom: 6 },
  prioBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  prioDot:   { width: 5, height: 5, borderRadius: 3 },
  prioText:  { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
})

const pf = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: 'white' },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  iconBox:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  icon:           { fontSize: 22 },
  title:          { fontSize: 16, fontWeight: '800', color: '#0F1829' },
  desc:           { fontSize: 12, color: '#94a3b8' },
  close:          { fontSize: 22, color: '#64748b' },
  scroll:         { padding: 20 },
  field:          { marginBottom: 16 },
  label:          { fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  input:          { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 14, color: '#1e293b', backgroundColor: '#fafafa', marginBottom: 16 },
  textarea:       { minHeight: 90, textAlignVertical: 'top' },
  dateBtn:        { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, backgroundColor: '#fafafa', marginBottom: 16 },
  dateBtnLabel:   { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  dateBtnVal:     { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  datePlaceholder:{ color: '#94a3b8', fontWeight: '400' },
  iosPicker:      { backgroundColor: '#f8fafc', borderRadius: 14, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  iosPickerHeader:{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  iosPickerLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  iosPickerDone:  { fontSize: 14, fontWeight: '700', color: '#2BC4BE' },
  errBox:         { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 14 },
  errText:        { color: '#dc2626', fontSize: 13 },
  btn:            { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 40 },
  btnDis:         { opacity: 0.6 },
  btnText:        { color: 'white', fontSize: 15, fontWeight: '700' },
})

const m = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: 'white' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title:      { fontSize: 18, fontWeight: '800', color: '#0F1829' },
  close:      { fontSize: 22, color: '#64748b' },
  scroll:     { padding: 20 },
  label:      { fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  catChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fafafa' },
  catChipIcon:{ fontSize: 13 },
  catChipText:{ fontSize: 12, fontWeight: '600', color: '#475569' },
  catChipActive:{ color: 'white' },
  prioRow:    { flexDirection: 'row', gap: 8, marginBottom: 18 },
  prioBtn:    { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 9, alignItems: 'center', backgroundColor: '#fafafa' },
  prioBtnText:{ fontSize: 12, fontWeight: '600', color: '#475569' },
  prioBtnActive:{ color: 'white', fontWeight: '700' },
  input:      { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 14, color: '#1e293b', backgroundColor: '#fafafa', marginBottom: 18 },
  textarea:   { minHeight: 110, textAlignVertical: 'top' },
  errBox:     { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 14 },
  errText:    { color: '#dc2626', fontSize: 13 },
  submitBtn:  { backgroundColor: '#0F1829', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 40 },
  submitDis:  { opacity: 0.6 },
  submitText: { color: 'white', fontSize: 15, fontWeight: '700' },
})
