import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal,
  Alert, Platform
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme, GRADIENTS } from '../../src/context/ThemeContext'
import api from '../../src/services/api'
import Card from '../../src/components/Card'
import StatusBadge from '../../src/components/StatusBadge'
import FeedItem from '../../src/components/FeedItem'

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
        // Explicit employee_id keeps "My Requests" self-scoped even for
        // admin/hr_manager/manager accounts — without it the backend
        // defaults those roles to company-wide (or whole-team) results.
        api.get(`/leave/requests?limit=20&employee_id=${empId}`),
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
      <View style={s.center}><ActivityIndicator color="#FFA801" size="large" /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#FFA801" />}
      >
        <View style={s.header}>
          <Text style={[s.pageTitle, { color: colors.text }]}>Leave</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['admin','hr_manager','manager'].includes(user?.role) && (
              <TouchableOpacity style={[s.calBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]} onPress={() => router.push('/leave-approvals')} activeOpacity={0.85}>
                <Text style={s.calBtnText}>✓ Approvals</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.calBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]} onPress={() => router.push('/holidays')} activeOpacity={0.85}>
              <Text style={s.calBtnText}>🗓 Holidays</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForm(true)} activeOpacity={0.85}>
              <LinearGradient colors={GRADIENTS.sunshine} style={s.newBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={s.newBtnText}>+ New</Text>
              </LinearGradient>
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
                    <Text style={[s.balTotal, { color: colors.muted }]}> / {b.allocated} days</Text>
                  </View>
                </View>
                <View style={[s.balBar, { backgroundColor: colors.cardAlt }]}>
                  <LinearGradient colors={GRADIENTS.sunshine} style={[s.balFill, { width: `${b.allocated ? Math.min(100, (b.used / b.allocated) * 100) : 0}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                </View>
                <Text style={[s.balUsed, { color: colors.muted }]}>{b.used} used · {b.remaining} remaining</Text>
              </Card>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.sub }]}>My Requests</Text>
          {requests.length === 0 ? (
            <Card><Text style={[s.empty, { color: colors.muted }]}>No leave requests yet.</Text></Card>
          ) : requests.map((r, i) => (
            <FeedItem
              key={i}
              icon="🏖️"
              gradient="lavender"
              title={r.leave_type_name || r.leave_type}
              subtitle={`${fmt(r.start_date)} → ${fmt(r.end_date)} · ${r.days_requested} day${r.days_requested !== 1 ? 's' : ''}`}
              right={<StatusBadge status={r.status} />}
            />
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
                {types.map(t => {
                  const active = form.leave_type_id === t.id
                  return (
                    <TouchableOpacity key={t.id} onPress={() => setForm(f => ({ ...f, leave_type_id: t.id }))} activeOpacity={0.85}>
                      {active ? (
                        <LinearGradient colors={GRADIENTS.sunshine} style={s.pickerItem} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                          <Text style={s.pickerItemTextActive}>{t.name}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={[s.pickerItem, s.pickerItemInactive]}>
                          <Text style={s.pickerItemText}>{t.name}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
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
                placeholderTextColor="#B0B3C6"
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

            <TouchableOpacity onPress={submitRequest} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={GRADIENTS.sunshine} style={[s.submitBtn, saving && s.submitDisabled]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={s.submitText}>Submit Request</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
  safe:              { flex: 1 },
  scroll:            { padding: 16, paddingBottom: 130 },
  center:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle:         { fontSize: 26, fontWeight: '900' },
  newBtn:            { borderRadius: 14, paddingHorizontal: 15, paddingVertical: 9 },
  newBtnText:        { color: 'white', fontWeight: '800', fontSize: 13 },
  calBtn:            { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, shadowColor: '#8890B5', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  calBtnText:        { fontWeight: '700', fontSize: 12, color: '#FFA801' },
  section:           { marginBottom: 8 },
  sectionTitle:      { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  balCard:           { marginBottom: 8 },
  balRow:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  balName:           { fontSize: 14, fontWeight: '700' },
  balNums:           { flexDirection: 'row', alignItems: 'baseline' },
  balRemain:         { fontSize: 20, fontWeight: '900' },
  balTotal:          { fontSize: 13 },
  balBar:            { height: 6, borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  balFill:           { height: 6, borderRadius: 3 },
  balUsed:           { fontSize: 11 },
  empty:             { textAlign: 'center', paddingVertical: 8 },


  modal:             { flex: 1, backgroundColor: 'white' },
  modalHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEF0F8' },
  modalTitle:        { fontSize: 18, fontWeight: '800', color: '#1A1B2E' },
  modalClose:        { fontSize: 22, color: '#8A8DA3' },
  modalScroll:       { padding: 20 },
  formField:         { marginBottom: 18 },
  formRow:           { flexDirection: 'row', marginBottom: 0 },
  formLabel:         { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  dateBtn:           { borderWidth: 1.5, borderColor: '#E3E6F3', borderRadius: 16, padding: 14, backgroundColor: '#F5F6FC', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateBtnText:       { fontSize: 15, color: '#1A1B2E', fontWeight: '500' },
  datePlaceholder:   { color: '#B0B3C6', fontWeight: '400' },
  dateIcon:          { fontSize: 16 },
  iosPickerWrap:     { backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#E3E6F3' },
  iosPickerHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E3E6F3' },
  iosPickerLabel:    { fontSize: 14, fontWeight: '600', color: '#374151' },
  iosPickerDone:     { fontSize: 15, fontWeight: '700', color: '#FFA801' },
  formTextarea:      { borderWidth: 1.5, borderColor: '#E3E6F3', borderRadius: 16, padding: 14, minHeight: 80, backgroundColor: '#F5F6FC', fontSize: 15, color: '#1A1B2E' },
  errBox:            { backgroundColor: '#FFE9E6', borderWidth: 1, borderColor: '#FFCFC9', borderRadius: 14, padding: 12, marginBottom: 16 },
  errText:           { color: '#E14F4A', fontSize: 13, fontWeight: '600' },
  submitBtn:         { borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitDisabled:    { opacity: 0.6 },
  submitText:        { color: 'white', fontSize: 16, fontWeight: '800' },
  picker:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem:        { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  pickerItemInactive:{ borderWidth: 1.5, borderColor: '#E3E6F3', backgroundColor: '#F5F6FC' },
  pickerItemText:    { fontSize: 13, color: '#475569', fontWeight: '600' },
  pickerItemTextActive: { color: 'white', fontWeight: '800', fontSize: 13 },
})
