import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert, Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../src/context/AuthContext'
import { useTheme } from '../src/context/ThemeContext'
import api from '../src/services/api'

const fmt    = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'
const toISO  = d => d.toISOString().split('T')[0]
const fmtNum = n => n != null ? Number(n).toLocaleString('en-EG', { minimumFractionDigits: 2 }) : '—'

const CATEGORIES = [
  { key: 'travel',        label: 'Travel',        icon: '✈️' },
  { key: 'accommodation', label: 'Hotel',          icon: '🏨' },
  { key: 'meals',         label: 'Meals',          icon: '🍽️' },
  { key: 'transport',     label: 'Transport',      icon: '🚗' },
  { key: 'communication', label: 'Communication',  icon: '📞' },
  { key: 'office',        label: 'Office',         icon: '🖊️' },
  { key: 'other',         label: 'Other',          icon: '📋' },
]

const STATUS_STYLE = {
  draft:            { bg: '#f1f5f9', color: '#475569' },
  submitted:        { bg: '#fef9c3', color: '#854d0e' },
  manager_approved: { bg: '#dbeafe', color: '#1e40af' },
  approved:         { bg: '#dcfce7', color: '#166534' },
  paid:             { bg: '#d1fae5', color: '#065f46' },
  rejected:         { bg: '#fee2e2', color: '#991b1b' },
}

export default function ExpensesScreen() {
  const { user }   = useAuth()
  const { colors } = useTheme()
  const router     = useRouter()

  const [expenses,   setExpenses]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState({ expense_date: toISO(new Date()), category: 'other', amount: '', description: '', receipt_number: '' })
  const [formErr,    setFormErr]    = useState('')

  const [showPicker, setShowPicker] = useState(false)
  const [pickerDate, setPickerDate] = useState(new Date())

  const load = useCallback(async () => {
    try {
      const empId = user?.employee_id
      const url   = empId ? `/expenses?employee_id=${empId}&limit=50` : '/expenses?limit=50'
      const r     = await api.get(url)
      setExpenses(r.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [user])

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.amount || isNaN(Number(form.amount))) { setFormErr('Please enter a valid amount.'); return }
    if (!form.description.trim())                   { setFormErr('Please add a description.'); return }
    setFormErr(''); setSaving(true)
    try {
      await api.post('/expenses', {
        employee_id:    user?.employee_id,
        expense_date:   form.expense_date,
        category:       form.category,
        amount:         Number(form.amount),
        description:    form.description,
        receipt_number: form.receipt_number || undefined,
      })
      setShowForm(false)
      setForm({ expense_date: toISO(new Date()), category: 'other', amount: '', description: '', receipt_number: '' })
      await load()
      Alert.alert('✅ Submitted', 'Your expense claim has been submitted.')
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to submit. Please try again.')
    } finally { setSaving(false) }
  }

  const onDateChange = (event, selected) => {
    if (Platform.OS === 'android') setShowPicker(false)
    if (event.type === 'dismissed' || !selected) return
    setPickerDate(selected)
    setForm(f => ({ ...f, expense_date: toISO(selected) }))
  }

  const totalPending = expenses
    .filter(e => ['submitted','manager_approved'].includes(e.status))
    .reduce((s, e) => s + Number(e.amount || 0), 0)

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
        <Text style={[s.navTitle, { color: colors.text }]}>Expenses</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(true)}>
          <Text style={s.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        {totalPending > 0 && (
          <View style={[s.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[s.summaryLabel, { color: colors.sub }]}>Pending Reimbursement</Text>
            <Text style={[s.summaryVal, { color: colors.text }]}>EGP {fmtNum(totalPending)}</Text>
          </View>
        )}

        {expenses.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🧾</Text>
            <Text style={[s.emptyText, { color: colors.sub }]}>No expense claims yet</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowForm(true)}>
              <Text style={s.emptyBtnText}>Submit your first claim</Text>
            </TouchableOpacity>
          </View>
        ) : expenses.map(e => {
          const ss = STATUS_STYLE[e.status] || STATUS_STYLE.draft
          const cat = CATEGORIES.find(c => c.key === e.category)
          return (
            <View key={e.id} style={[s.card, { backgroundColor: colors.card }]}>
              <View style={s.cardTop}>
                <Text style={s.catIcon}>{cat?.icon || '📋'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardDesc, { color: colors.text }]} numberOfLines={1}>{e.description}</Text>
                  <Text style={[s.cardMeta, { color: colors.sub }]}>{cat?.label || e.category} · {fmt(e.expense_date)}</Text>
                </View>
                <View>
                  <Text style={[s.cardAmt, { color: colors.text }]}>EGP {fmtNum(e.amount)}</Text>
                  <View style={[s.statusBadge, { backgroundColor: ss.bg }]}>
                    <Text style={[s.statusText, { color: ss.color }]}>{e.status?.replace('_', ' ')}</Text>
                  </View>
                </View>
              </View>
              {e.receipt_number ? (
                <Text style={[s.receipt, { color: colors.sub }]}>Receipt: {e.receipt_number}</Text>
              ) : null}
            </View>
          )
        })}
      </ScrollView>

      {/* New Expense Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Expense Claim</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalScroll} keyboardShouldPersistTaps="handled">

            {/* Date */}
            <Text style={s.label}>Expense Date</Text>
            <TouchableOpacity style={s.dateBtn} onPress={() => { setPickerDate(new Date(form.expense_date)); setShowPicker(true) }}>
              <Text style={s.dateBtnText}>{fmt(form.expense_date)}</Text>
              <Text>📅</Text>
            </TouchableOpacity>
            {showPicker && Platform.OS === 'ios' && (
              <DateTimePicker value={pickerDate} mode="date" display="spinner" onChange={onDateChange} maximumDate={new Date()} />
            )}

            {/* Category */}
            <Text style={[s.label, { marginTop: 14 }]}>Category</Text>
            <View style={s.catGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[s.catChip, form.category === c.key && s.catChipActive]}
                  onPress={() => setForm(f => ({ ...f, category: c.key }))}
                >
                  <Text style={s.catChipIcon}>{c.icon}</Text>
                  <Text style={[s.catChipLabel, form.category === c.key && s.catChipLabelActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <Text style={[s.label, { marginTop: 14 }]}>Amount (EGP)</Text>
            <TextInput
              style={s.input}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={v => setForm(f => ({ ...f, amount: v }))}
            />

            {/* Description */}
            <Text style={[s.label, { marginTop: 14 }]}>Description *</Text>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="What was this expense for?"
              placeholderTextColor="#94a3b8"
              value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Receipt */}
            <Text style={[s.label, { marginTop: 14 }]}>Receipt Number (optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. INV-2024-001"
              placeholderTextColor="#94a3b8"
              value={form.receipt_number}
              onChangeText={v => setForm(f => ({ ...f, receipt_number: v }))}
            />

            {!!formErr && (
              <View style={s.errBox}>
                <Text style={s.errText}>{formErr}</Text>
              </View>
            )}

            <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={s.submitText}>Submit Claim</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker value={pickerDate} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  nav:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  back:         { width: 40 },
  backText:     { fontSize: 28, lineHeight: 32 },
  navTitle:     { fontSize: 17, fontWeight: '700' },
  addBtn:       { backgroundColor: '#0F1829', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:   { color: 'white', fontWeight: '700', fontSize: 13 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:       { padding: 16, paddingBottom: 40, gap: 10 },
  summaryCard:  { borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 4 },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryVal:   { fontSize: 24, fontWeight: '900' },
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyText:    { fontSize: 14, marginBottom: 20 },
  emptyBtn:     { backgroundColor: '#0F1829', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: 'white', fontWeight: '700' },
  card:         { borderRadius: 14, padding: 14 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon:      { fontSize: 28 },
  cardDesc:     { fontSize: 14, fontWeight: '600' },
  cardMeta:     { fontSize: 12, marginTop: 2 },
  cardAmt:      { fontSize: 15, fontWeight: '800', textAlign: 'right' },
  statusBadge:  { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-end' },
  statusText:   { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  receipt:      { fontSize: 11, marginTop: 8, marginLeft: 38 },
  modal:        { flex: 1, backgroundColor: 'white' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: '#0F1829' },
  modalClose:   { fontSize: 22, color: '#64748b' },
  modalScroll:  { padding: 20 },
  label:        { fontSize: 12, fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  dateBtn:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 13, marginBottom: 4 },
  dateBtnText:  { fontSize: 15, color: '#1e293b', fontWeight: '500' },
  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fafafa' },
  catChipActive:{ borderColor: '#0F1829', backgroundColor: '#0F1829' },
  catChipIcon:  { fontSize: 15 },
  catChipLabel: { fontSize: 12, color: '#475569', fontWeight: '500' },
  catChipLabelActive: { color: 'white', fontWeight: '700' },
  input:        { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 13, fontSize: 15, color: '#1e293b', backgroundColor: '#fafafa', marginBottom: 4 },
  textarea:     { minHeight: 80, textAlignVertical: 'top' },
  errBox:       { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginTop: 10 },
  errText:      { color: '#dc2626', fontSize: 13 },
  submitBtn:    { backgroundColor: '#0F1829', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  submitText:   { color: 'white', fontSize: 16, fontWeight: '700' },
})
