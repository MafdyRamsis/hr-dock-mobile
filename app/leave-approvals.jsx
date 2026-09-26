import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '../src/context/ThemeContext'
import api from '../src/services/api'
import { useLang } from '../src/context/LanguageContext'
import { back } from '../src/utils/rtl'

const toDateStr = d => (d ? String(d).split('T')[0] : '')

const statusLabel = (st, tr) => ({
  pending:  tr('Pending', 'قيد المراجعة', 'مستني رد'),
  approved: tr('Approved', 'تمت الموافقة', 'اتوافق عليه'),
  rejected: tr('Rejected', 'مرفوض', 'اترفض'),
}[st] || st)

// Known leave types → Arabic; anything else shows as sent by the server
const leaveTypeLabel = (t, tr) => {
  const k = String(t || '').toLowerCase().replace(/\s*leave$/, '').trim()
  return ({
    annual:    tr('Annual Leave', 'إجازة سنوية', 'إجازة اعتيادي'),
    casual:    tr('Casual Leave', 'إجازة عارضة', 'إجازة عارضة'),
    sick:      tr('Sick Leave', 'إجازة مرضية'),
    unpaid:    tr('Unpaid Leave', 'إجازة بدون أجر', 'إجازة من غير مرتب'),
    maternity: tr('Maternity Leave', 'إجازة وضع'),
    hajj:      tr('Hajj Leave', 'إجازة حج'),
    wfh:       tr('Work from Home', 'العمل من المنزل', 'شغل من البيت'),
    'work from home': tr('Work from Home', 'العمل من المنزل', 'شغل من البيت'),
  }[k]) || t
}

// "3 days" in Arabic: 1 يوم / 2 يومان / 3–10 أيام / 11+ يوم
const daysText = (n, tr) => {
  if (!n) return '—'
  const v = Number(n)
  if (isNaN(v) || v % 1) return tr(`${n} day(s)`, `${n} يوم`)
  return tr(
    `${v} day${v === 1 ? '' : 's'}`,
    v === 1 ? 'يوم واحد' : v === 2 ? 'يومان' : v <= 10 ? `${v} أيام` : `${v} يومًا`,
    v === 1 ? 'يوم واحد' : v === 2 ? 'يومين' : v <= 10 ? `${v} أيام` : `${v} يوم`,
  )
}

const STATUS_STYLE = {
  pending:  { bg: '#fef9c3', color: '#854d0e' },
  approved: { bg: '#dcfce7', color: '#166534' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
}

export default function LeaveApprovalsScreen() {
  const { colors } = useTheme()
  const { tr, date } = useLang()
  const fmt        = d => (d ? date(toDateStr(d)) : '—')
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
      Alert.alert(
        status === 'approved' ? `✅ ${tr('Approved', 'تمت الموافقة', 'اتوافق عليه')}` : `❌ ${tr('Rejected', 'تم الرفض', 'اترفض')}`,
        tr('Leave request updated.', 'تم تحديث طلب الإجازة.', 'طلب الإجازة اتحدّث.'),
        [{ text: tr('OK', 'حسنًا', 'تمام') }],
      )
    } catch (e) {
      Alert.alert(
        tr('Error', 'خطأ', 'حصلت مشكلة'),
        e.response?.data?.message || tr('Failed. Please try again.', 'تعذّر إتمام العملية. يرجى المحاولة مرة أخرى.', 'معرفناش نكمّل. يلا نجرّب تاني.'),
        [{ text: tr('OK', 'حسنًا', 'تمام') }],
      )
    } finally { setActing(null) }
  }

  const handleApprove = (id) => {
    Alert.alert(
      tr('Approve Leave', 'الموافقة على الإجازة', 'موافقة على الإجازة'),
      tr('Are you sure you want to approve this request?', 'هل أنت متأكد من الموافقة على هذا الطلب؟', 'نوافق على الطلب ده؟'),
      [
        { text: tr('Cancel', 'إلغاء'), style: 'cancel' },
        { text: tr('Approve', 'موافقة', 'وافق'), onPress: () => act(id, 'approved') },
      ],
    )
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
        <TouchableOpacity onPress={() => router.back()} style={s.back} accessibilityLabel={tr('Back', 'رجوع')}>
          <Text style={[s.backText, { color: colors.text }]}>{back}</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.text }]}>{tr('Leave Approvals', 'اعتماد الإجازات', 'موافقات الإجازات')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter chips */}
      <View style={s.chips}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[s.chip, filter === f && s.chipActive]}>
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>
              {statusLabel(f, tr)}
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
              <Text style={[s.emptyText, { color: colors.sub }]}>{({
                pending:  tr('No pending requests', 'لا توجد طلبات قيد المراجعة', 'مفيش طلبات مستنياك'),
                approved: tr('No approved requests', 'لا توجد طلبات موافق عليها', 'لسه مفيش طلبات اتوافق عليها'),
                rejected: tr('No rejected requests', 'لا توجد طلبات مرفوضة', 'مفيش طلبات اترفضت'),
              })[filter]}</Text>
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
                    <Text style={[s.badgeText, { color: ss.color }]}>{statusLabel(r.status, tr)}</Text>
                  </View>
                </View>

                {/* Details */}
                <View style={[s.details, { borderTopColor: colors.border }]}>
                  <Row label={tr('Type', 'النوع')}    value={leaveTypeLabel(r.leave_type_name || r.leave_type, tr) || '—'} colors={colors} />
                  <Row label={tr('From', 'من')}      value={fmt(r.start_date)}  colors={colors} />
                  <Row label={tr('To', 'إلى', 'لحد')} value={fmt(r.end_date)}    colors={colors} />
                  <Row label={tr('Days', 'عدد الأيام', 'الأيام')} value={daysText(r.days, tr)} colors={colors} />
                  {r.reason ? <Row label={tr('Reason', 'السبب')} value={r.reason} colors={colors} /> : null}
                  {r.notes  ? <Row label={tr('Note', 'ملاحظة')}  value={r.notes}  colors={colors} /> : null}
                </View>

                {/* Actions — only for pending */}
                {r.status === 'pending' && (
                  <View style={s.actions}>
                    {isActing ? <ActivityIndicator color="#2563eb" style={{ flex: 1 }} /> : (
                      <>
                        <TouchableOpacity style={s.btnReject} onPress={() => handleReject(r.id)}>
                          <Text style={s.btnRejectText}>✕ {tr('Reject', 'رفض', 'ارفض')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.btnApprove} onPress={() => handleApprove(r.id)}>
                          <Text style={s.btnApproveText}>✓ {tr('Approve', 'موافقة', 'وافق')}</Text>
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
            <Text style={[s.modalTitle, { color: colors.text }]}>{tr('Rejection Reason', 'سبب الرفض')}</Text>
            <TextInput
              style={[s.textArea, { color: colors.text, borderColor: colors.border }]}
              placeholder={tr('Optional reason for rejection…', 'سبب الرفض (اختياري)…', 'سبب الرفض (لو فيه)…')}
              placeholderTextColor={colors.sub}
              multiline
              numberOfLines={4}
              value={rejectNote}
              onChangeText={setRejectNote}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowReject(false)}>
                <Text style={{ color: colors.sub, fontWeight: '600' }}>{tr('Cancel', 'إلغاء')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={confirmReject}>
                <Text style={{ color: 'white', fontWeight: '600' }}>{tr('Reject', 'رفض', 'ارفض')}</Text>
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
