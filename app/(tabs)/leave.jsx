import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal,
  Alert, Platform
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'
import api from '../../src/services/api'
import Card from '../../src/components/Card'
import StatusBadge from '../../src/components/StatusBadge'

const toISO  = d => d.toISOString().split('T')[0]
const fmt    = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'

export default function LeaveScreen() {
  const { user } = useAuth()
  const { colors } = useTheme()
  const router = useRouter()
  const [balances,   setBalances]   = useState([])
  const [requests,   setRequests]   = useState([])
  const [types,      setTypes]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const [formErr,    setFormErr]    = useState('')

  // date picker state
  const [pickerTarget, setPickerTarget] = useState(null) // 'start' | 'end'
  const [pickerDate,   setPickerDate]   = useState(new Date())
  const [showPicker,   setShowPicker]   = useState(false)

  const load = useCallback(async () => {
    try {
      const empId = user?.employee_id || user?.id
      const [balRes, reqRes, typRes] = await Promise.allSettled([
        api.get(`/leave/balances/${empId}`),
        api.get('/leave/requests?limit=20'),
        api.get('/leave/types'),
      ])
      if (balRes.status === 'fulfilled') setBalances(balRes.value.data.data || [])
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value.data.data || [])
      if (typRes.status === 'fulfilled') {
        const t = typRes.value.data.data || []
        setTypes(t)
        if (t.length && !form.leave_type_id) setForm(f => ({ ...f, leave_type_id: t[0].id }))
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [user])

  useEffect(() => { load() }, [])

  const openPicker = (target) => {
    const existing = target === 'start' ? form.start_date : form.end_date
    setPickerDate(existing ? new Date(existing) : new Date())
    setPickerTarget(target)
    setShowPicker(true)
  }

  const onDateChange = (event, selected) => {
    if (Platform.OS === 'android') setShowPicker(false)
    if (event.type === 'dismissed') return
    if (!selected) return
    const iso = toISO(selected)
    setForm(f => pickerTarget === 'start' ? { ...f, start_date: iso } : { ...f, end_date: iso })
    if (Platform.OS === 'ios') setPickerDate(selected)
  }

  const submitRequest = async () => {
    if (!form.start_date || !form.end_date) { setFormErr('Please select start and end dates.'); return }
    if (form.start_date > form.end_date)    { setFormErr('End date must be after start date.'); return }
    setFormErr(''); setSaving(true)
    try {
      await api.post('/leave/requests', { ...form })
      setShowForm(false)
      setForm({ leave_type_id: types[0]?.id || '', start_date: '', end_date: '', reason: '' })
      await load()
      Alert.alert('Request submitted', 'Your leave request has been submitted successfully.')
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to submit request.')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <View style={s.center}><ActivityIndicator color="#2BC4BE" size="large" /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2BC4BE" />}
      >
        <View style={s.header}>
          <Text style={[s.pageTitle, { color: colors.text }]}>Leave</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['admin','hr_manager','manager'].includes(user?.role) && (
              <TouchableOpacity style={[s.calBtn, { backgroundColor: colors.card }]} onPress={() => router.push('/leave-approvals')} activeOpacity={0.85}>
                <Text style={s.calBtnText}>✓ Approvals</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.calBtn, { backgroundColor: colors.card }]} onPress={() => router.push('/holidays')} activeOpacity={0.85}>
              <Text style={s.calBtnText}>🗓 Holidays</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.newBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
              <Text style={s.newBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {balances.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.sub }]}>Your Balances</Text>
            {balances.map((b, i) => (
              <Card key={i} style={s.balCard}>
                <View style={s.balRow}>
                  <Text style={[s.balName, { color: colors.text2 }]}>{b.name}</Text>
                  <View style={s.balNums}>
                    <Text style={[s.balRemain, { color: colors.text }]}>{b.remaining}</Text>
                    <Text style={s.balTotal}> / {b.allocated} days</Text>
                  </View>
                </View>
                <View style={s.balBar}>
                  <View style={[s.balFill, { width: `${Math.min(100, (b.used / b.allocated) * 100)}%` }]} />
                </View>
                <Text style={s.balUsed}>{b.used} used · {b.remaining} remaining</Text>
              </Card>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.sub }]}>My Requests</Text>
          {requests.length === 0 ? (
            <Card><Text style={s.empty}>No leave requests yet.</Text></Card>
          ) : requests.map((r, i) => (
            <Card key={i} style={s.reqCard}>
              <View style={s.reqTop}>
                <Text style={[s.reqType, { color: colors.text2 }]}>{r.leave_type_name || r.leave_type}</Text>
                <StatusBadge status={r.status} />
              </View>
              <Text style={[s.reqDates, { color: colors.sub }]}>{fmt(r.start_date)} → {fmt(r.end_date)} · {r.days_requested} day{r.days_requested !== 1 ? 's' : ''}</Text>
              {r.reason ? <Text style={s.reqReason} numberOfLines={2}>{r.reason}</Text> : null}
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* New Request Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Leave Request</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={s.formField}>
              <Text style={s.formLabel}>Leave Type</Text>
              <View style={s.picker}>
                {types.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.pickerItem, form.leave_type_id === t.id && s.pickerItemActive]}
                    onPress={() => setForm(f => ({ ...f, leave_type_id: t.id }))}
                  >
                    <Text style={[s.pickerItemText, form.leave_type_id === t.id && s.pickerItemTextActive]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.formRow}>
              <View style={[s.formField, { flex: 1 }]}>
                <Text style={s.formLabel}>Start Date</Text>
                <TouchableOpacity style={s.dateBtn} onPress={() => openPicker('start')}>
                  <Text style={[s.dateBtnText, !form.start_date && s.datePlaceholder]}>
                    {form.start_date ? fmt(form.start_date) : 'Select date'}
                  </Text>
                  <Text style={s.dateIcon}>📅</Text>
                </TouchableOpacity>
              </View>
              <View style={{ width: 12 }} />
              <View style={[s.formField, { flex: 1 }]}>
                <Text style={s.formLabel}>End Date</Text>
                <TouchableOpacity style={s.dateBtn} onPress={() => openPicker('end')}>
                  <Text style={[s.dateBtnText, !form.end_date && s.datePlaceholder]}>
                    {form.end_date ? fmt(form.end_date) : 'Select date'}
                  </Text>
                  <Text style={s.dateIcon}>📅</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* iOS: inline picker shown below date buttons */}
            {showPicker && Platform.OS === 'ios' && (
              <View style={s.iosPickerWrap}>
                <View style={s.iosPickerHeader}>
                  <Text style={s.iosPickerLabel}>{pickerTarget === 'start' ? 'Start' : 'End'} Date</Text>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text style={s.iosPickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pickerDate}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                  textColor="#000000"
                  themeVariant="light"
                />
              </View>
            )}

            <View style={s.formField}>
              <Text style={s.formLabel}>Reason (optional)</Text>
              <TextInput
                style={s.formTextarea}
                placeholder="Brief description…"
                placeholderTextColor="#94a3b8"
                value={form.reason}
                onChangeText={v => setForm(f => ({ ...f, reason: v }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {!!formErr && (
              <View style={s.errBox}>
                <Text style={s.errText}>{formErr}</Text>
              </View>
            )}

            <TouchableOpacity style={[s.submitBtn, saving && s.submitDisabled]} onPress={submitRequest} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={s.submitText}>Submit Request</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Android date picker (shown as overlay) */}
      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#F0F4FA' },
  scroll:            { padding: 16, paddingBottom: 32 },
  center:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle:         { fontSize: 26, fontWeight: '900', color: '#0F1829' },
  newBtn:            { backgroundColor: '#0F1829', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  newBtnText:        { color: 'white', fontWeight: '700', fontSize: 13 },
  calBtn:            { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  calBtnText:        { fontWeight: '700', fontSize: 12, color: '#2BC4BE' },
  section:           { marginBottom: 8 },
  sectionTitle:      { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  balCard:           { marginBottom: 8 },
  balRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  balName:           { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  balNums:           { flexDirection: 'row', alignItems: 'baseline' },
  balRemain:         { fontSize: 20, fontWeight: '800', color: '#0F1829' },
  balTotal:          { fontSize: 13, color: '#94a3b8' },
  balBar:            { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  balFill:           { height: 6, backgroundColor: '#2BC4BE', borderRadius: 3 },
  balUsed:           { fontSize: 11, color: '#94a3b8' },
  reqCard:           { marginBottom: 8 },
  reqTop:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reqType:           { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  reqDates:          { fontSize: 13, color: '#64748b', marginBottom: 4 },
  reqReason:         { fontSize: 12, color: '#94a3b8' },
  empty:             { color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },
  modal:             { flex: 1, backgroundColor: 'white' },
  modalHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle:        { fontSize: 18, fontWeight: '800', color: '#0F1829' },
  modalClose:        { fontSize: 22, color: '#64748b' },
  modalScroll:       { padding: 20 },
  formField:         { marginBottom: 18 },
  formRow:           { flexDirection: 'row', marginBottom: 0 },
  formLabel:         { fontSize: 12, fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  dateBtn:           { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, backgroundColor: '#fafafa', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBtnText:       { fontSize: 15, color: '#1e293b', fontWeight: '500' },
  datePlaceholder:   { color: '#94a3b8', fontWeight: '400' },
  dateIcon:          { fontSize: 16 },
  iosPickerWrap:     { backgroundColor: '#ffffff', borderRadius: 14, marginBottom: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  iosPickerHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  iosPickerLabel:    { fontSize: 14, fontWeight: '600', color: '#374151' },
  iosPickerDone:     { fontSize: 15, fontWeight: '700', color: '#2BC4BE' },
  formTextarea:      { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, minHeight: 80, backgroundColor: '#fafafa', fontSize: 15, color: '#1e293b' },
  errBox:            { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errText:           { color: '#dc2626', fontSize: 13 },
  submitBtn:         { backgroundColor: '#0F1829', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitDisabled:    { opacity: 0.6 },
  submitText:        { color: 'white', fontSize: 16, fontWeight: '700' },
  picker:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem:        { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fafafa' },
  pickerItemActive:  { borderColor: '#0F1829', backgroundColor: '#0F1829' },
  pickerItemText:    { fontSize: 13, color: '#475569', fontWeight: '500' },
  pickerItemTextActive: { color: 'white', fontWeight: '700' },
})
