import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
  Alert, Platform
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../src/context/AuthContext'
import api from '../../src/services/api'
import Card from '../../src/components/Card'
import StatusBadge from '../../src/components/StatusBadge'

const fmt = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'
const iso = d => d ? d.split('T')[0] : ''

export default function LeaveScreen() {
  const { user } = useAuth()
  const [balances,  setBalances]  = useState([])
  const [requests,  setRequests]  = useState([])
  const [types,     setTypes]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [form,      setForm]      = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const [formErr,   setFormErr]   = useState('')

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

  const submitRequest = async () => {
    if (!form.start_date || !form.end_date) { setFormErr('Please select start and end dates.'); return }
    if (form.start_date > form.end_date)    { setFormErr('End date must be after start date.'); return }
    setFormErr(''); setSaving(true)
    try {
      await api.post('/leave/requests', { ...form })
      setShowForm(false)
      setForm({ leave_type_id: types[0]?.id || '', start_date: '', end_date: '', reason: '' })
      await load()
      Alert.alert('✅ Request submitted', 'Your leave request has been submitted successfully.')
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to submit request.')
    } finally { setSaving(false) }
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
        {/* Header */}
        <View style={s.header}>
          <Text style={s.pageTitle}>Leave</Text>
          <TouchableOpacity style={s.newBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
            <Text style={s.newBtnText}>+ New Request</Text>
          </TouchableOpacity>
        </View>

        {/* Balances */}
        {balances.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Your Balances</Text>
            {balances.map((b, i) => (
              <Card key={i} style={s.balCard}>
                <View style={s.balRow}>
                  <Text style={s.balName}>{b.name}</Text>
                  <View style={s.balNums}>
                    <Text style={s.balRemain}>{b.remaining}</Text>
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

        {/* Requests */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>My Requests</Text>
          {requests.length === 0 ? (
            <Card><Text style={s.empty}>No leave requests yet.</Text></Card>
          ) : requests.map((r, i) => (
            <Card key={i} style={s.reqCard}>
              <View style={s.reqTop}>
                <Text style={s.reqType}>{r.leave_type_name || r.leave_type}</Text>
                <StatusBadge status={r.status} />
              </View>
              <Text style={s.reqDates}>{fmt(r.start_date)} → {fmt(r.end_date)} · {r.days_requested} day{r.days_requested !== 1 ? 's' : ''}</Text>
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
                <TextInput
                  style={s.formInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  value={form.start_date}
                  onChangeText={v => setForm(f => ({ ...f, start_date: v }))}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={[s.formField, { flex: 1 }]}>
                <Text style={s.formLabel}>End Date</Text>
                <TextInput
                  style={s.formInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  value={form.end_date}
                  onChangeText={v => setForm(f => ({ ...f, end_date: v }))}
                />
              </View>
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>Reason (optional)</Text>
              <TextInput
                style={[s.formInput, s.formTextarea]}
                placeholder="Brief description…"
                placeholderTextColor="#94a3b8"
                value={form.reason}
                onChangeText={v => setForm(f => ({ ...f, reason: v }))}
                multiline
                numberOfLines={3}
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
  formInput:         { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1e293b', backgroundColor: '#fafafa' },
  formTextarea:      { minHeight: 80, textAlignVertical: 'top' },
  picker:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem:        { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fafafa' },
  pickerItemActive:  { borderColor: '#0F1829', backgroundColor: '#0F1829' },
  pickerItemText:    { fontSize: 13, color: '#475569', fontWeight: '500' },
  pickerItemTextActive: { color: 'white', fontWeight: '700' },
  errBox:            { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errText:           { color: '#dc2626', fontSize: 13 },
  submitBtn:         { backgroundColor: '#0F1829', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitDisabled:    { opacity: 0.6 },
  submitText:        { color: 'white', fontSize: 16, fontWeight: '700' },
})
