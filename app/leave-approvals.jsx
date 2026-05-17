import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/context/ThemeContext'
import api from '../src/services/api'

const fmt = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'

const STATUS_STYLE = {
  pending:  { bg: '#fef9c3', color: '#854d0e' },
  approved: { bg: '#dcfce7', color: '#166534' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
}

export default function LeaveApprovalsScreen() {
  const { colors } = useTheme()
  const router     = useRouter()
  const [requests,   setRequests]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter,     setFilter]     = useState('pending')
  const [acting,     setActing]     = useState(null)
  const [showReject, setShowReject] = useState(false)
  const [rejectId,   setRejectId]   = useState(null)
  const [rejectNote, setRejectNote] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/leave/requests?status=${filter}&limit=100`)
      const raw = res.data.data
      setRequests(Array.isArray(raw) ? raw : (raw?.rows || []))
    } catch { setRequests([]) }
    finally { setLoading(false); setRefreshing(false) }
  }, [filter])

  useEffect(() => { setLoading(true); load() }, [filter])

  const act = async (id, status, notes = '') => {
    setActing(id)
    try {
      await api.patch(`/leave/requests/${id}/review`, { status, notes: notes || undefined })
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
      Alert.alert(status === 'approved' ? '✅ Approved' : '❌ Rejected', 'Leave request updated.')
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed. Please try again.')
    } finally { setActing(null) }
  }

  const handleApprove = (id) => {
    Alert.alert('Approve Leave', 'Are you sure you want to approve this request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => act(id, 'approved') },
    ])
  }

  const handleReject = (id) => {
    setRejectId(id); setRejectNote(''); setShowReject(true)
  }

  const confirmReject = () => {
    setShowReject(false)
    act(rejectId, 'rejected', rejectNote)
  }

  const FILTERS = ['pending', 'approved', 'rejected']

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Nav */}
      <View style={[s.nav, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={[s.backText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.text }]}>Leave Approvals</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter chips */}
      <View style={s.chips}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[s.chip, filter === f && s.chipActive]}>
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#2563eb" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
          showsVerticalScrollIndicator={false}
        >
          {requests.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={[s.emptyText, { color: colors.sub }]}>No {filter} requests</Text>
            </View>
          )}
          {requests.map(r => {
            const ss = STATUS_STYLE[r.status] || STATUS_STYLE.pending
            const isActing = acting === r.id
            return (
              <View key={r.id} style={[s.card, { backgroundColor: colors.card }]}>
                {/* Header row */}
                <View style={s.cardHeader}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>
                      {(r.employee_name || r.first_name || '?').split(' ').map(w => w[0]).slice(0,2).join('')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.empName, { color: colors.text }]}>{r.employee_name || `${r.first_name} ${r.last_name}`}</Text>
                    <Text style={[s.empSub, { color: colors.sub }]}>{r.department_name || r.department || ''}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: ss.bg }]}>
                    <Text style={[s.badgeText, { color: ss.color }]}>{r.status}</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={[s.details, { borderTopColor: colors.border }]}>
                  <Row label="Type"    value={r.leave_type_name || r.leave_type || '—'} colors={colors} />
                  <Row label="From"    value={fmt(r.start_date)}  colors={colors} />
                  <Row label="To"      value={fmt(r.end_date)}    colors={colors} />
                  <Row label="Days"    value={`${r.days || '—'} day(s)`} colors={colors} />
                  {r.reason ? <Row label="Reason" value={r.reason} colors={colors} /> : null}
                  {r.notes  ? <Row label="Note"   value={r.notes}  colors={colors} /> : null}
                </View>

                {/* Actions — only for pending */}
                {r.status === 'pending' && (
                  <View style={s.actions}>
                    {isActing ? <ActivityIndicator color="#2563eb" style={{ flex: 1 }} /> : (
                      <>
                        <TouchableOpacity style={s.btnReject} onPress={() => handleReject(r.id)}>
                          <Text style={s.btnRejectText}>✕ Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.btnApprove} onPress={() => handleApprove(r.id)}>
                          <Text style={s.btnApproveText}>✓ Approve</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* Rejection reason modal */}
      <Modal visible={showReject} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Rejection Reason</Text>
            <TextInput
              style={[s.textArea, { color: colors.text, borderColor: colors.border }]}
              placeholder="Optional reason for rejection…"
              placeholderTextColor={colors.sub}
              multiline
              numberOfLines={4}
              value={rejectNote}
              onChangeText={setRejectNote}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowReject(false)}>
                <Text style={{ color: colors.sub, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={confirmReject}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const Row = ({ label, value, colors }) => (
  <View style={s.row}>
    <Text style={[s.rowLabel, { color: colors.sub }]}>{label}</Text>
    <Text style={[s.rowValue, { color: colors.text }]}>{value}</Text>
  </View>
)

const s = StyleSheet.create({
  safe:         { flex: 1 },
  nav:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  back:         { width: 40 },
  backText:     { fontSize: 28, lineHeight: 32 },
  navTitle:     { fontSize: 17, fontWeight: '700' },
  chips:        { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#e2e8f0' },
  chipActive:   { backgroundColor: '#1e3a8a' },
  chipText:     { fontSize: 13, fontWeight: '500', color: '#475569' },
  chipTextActive: { color: 'white' },
  scroll:       { padding: 16, gap: 12, paddingBottom: 32 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:        { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:    { fontSize: 40, marginBottom: 12 },
  emptyText:    { fontSize: 14 },
  card:         { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar:       { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: 'white', fontSize: 13, fontWeight: '700' },
  empName:      { fontSize: 14, fontWeight: '600' },
  empSub:       { fontSize: 12, marginTop: 2 },
  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText:    { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  details:      { borderTopWidth: 1, paddingTop: 12, gap: 6 },
  row:          { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel:     { fontSize: 12 },
  rowValue:     { fontSize: 12, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  actions:      { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  btnApprove:   { flex: 1, backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnApproveText: { color: 'white', fontWeight: '700', fontSize: 14 },
  btnReject:    { flex: 1, backgroundColor: '#fef2f2', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  btnRejectText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:        { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 16 },
  modalTitle:   { fontSize: 16, fontWeight: '700' },
  textArea:     { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel:  { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f1f5f9' },
  modalConfirm: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#dc2626' },
})
