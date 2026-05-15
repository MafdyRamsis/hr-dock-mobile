import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import api from '../../src/services/api'
import Card from '../../src/components/Card'
import StatusBadge from '../../src/components/StatusBadge'

const fmt = d => d ? d.split('T')[0].split('-').reverse().join('/') : '—'

export default function MoreScreen() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [tickets,   setTickets]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)
  const [showTicket,  setShowTicket]   = useState(false)
  const [showPassword,setShowPassword] = useState(false)
  const [saving,      setSaving]       = useState(false)
  const [form,        setForm]         = useState({ subject: '', description: '', priority: 'medium' })
  const [formErr,     setFormErr]      = useState('')
  const [pwForm,      setPwForm]       = useState({ current: '', next: '', confirm: '' })
  const [pwErr,       setPwErr]        = useState('')
  const [pwSaving,    setPwSaving]     = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api.get('/helpdesk?limit=20')
      setTickets(r.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const submitTicket = async () => {
    if (!form.subject.trim())      { setFormErr('Please enter a subject.'); return }
    if (!form.description.trim())  { setFormErr('Please describe your request.'); return }
    setFormErr(''); setSaving(true)
    try {
      await api.post('/helpdesk', form)
      setShowTicket(false)
      setForm({ subject: '', description: '', priority: 'medium' })
      await load()
      Alert.alert('✅ Request submitted', 'Your request has been submitted to HR.')
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to submit request.')
    } finally { setSaving(false) }
  }

  const submitPassword = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { setPwErr('Please fill in all fields.'); return }
    if (pwForm.next.length < 8) { setPwErr('New password must be at least 8 characters.'); return }
    if (pwForm.next !== pwForm.confirm) { setPwErr('Passwords do not match.'); return }
    setPwErr(''); setPwSaving(true)
    try {
      await api.put('/auth/change-password', { current_password: pwForm.current, new_password: pwForm.next })
      setShowPassword(false)
      setPwForm({ current: '', next: '', confirm: '' })
      Alert.alert('Password changed', 'Your password has been updated successfully.')
    } catch (err) {
      setPwErr(err.response?.data?.message || 'Failed to change password.')
    } finally { setPwSaving(false) }
  }

  const confirmLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ])
  }

  const MenuItem = ({ icon, label, onPress, danger }) => (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.menuIcon}>{icon}</Text>
      <Text style={[s.menuLabel, danger && s.menuDanger]}>{label}</Text>
      <Text style={s.menuArrow}>›</Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#2BC4BE" />}
      >
        {/* Profile card */}
        <Card style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.first_name?.[0]}{user?.last_name?.[0]}</Text>
          </View>
          <Text style={s.profileName}>{user?.first_name} {user?.last_name}</Text>
          <Text style={s.profileEmail}>{user?.email}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{user?.role?.replace('_', ' ')}</Text>
          </View>
        </Card>

        {/* HR Requests */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>HR Requests</Text>
            <TouchableOpacity style={s.newBtn} onPress={() => setShowTicket(true)}>
              <Text style={s.newBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#2BC4BE" style={{ marginVertical: 20 }} />
          ) : tickets.length === 0 ? (
            <Card><Text style={s.empty}>No requests yet.</Text></Card>
          ) : tickets.map((t, i) => (
            <Card key={t.id || i} style={s.ticketCard}>
              <View style={s.ticketTop}>
                <Text style={s.ticketSubject} numberOfLines={1}>{t.subject}</Text>
                <StatusBadge status={t.status} />
              </View>
              <View style={s.ticketBottom}>
                <Text style={s.ticketDate}>{fmt(t.created_at)}</Text>
                <View style={[s.priorityDot, { backgroundColor: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#22c55e' }]} />
                <Text style={s.ticketPriority}>{t.priority}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Menu */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <MenuItem icon="🔔" label="Announcements"    onPress={() => router.push('/announcements')} />
            <View style={s.divider}/>
            <MenuItem icon="🔒" label="Change Password"  onPress={() => setShowPassword(true)} />
            <View style={s.divider}/>
            <MenuItem icon="🚪" label="Sign Out" danger  onPress={confirmLogout} />
          </Card>
        </View>

        <Text style={s.version}>HR Dock v1.0 · Employee Self-Service</Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPassword} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPassword(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => { setShowPassword(false); setPwErr(''); setPwForm({ current: '', next: '', confirm: '' }) }}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalScroll} keyboardShouldPersistTaps="handled">
            {[
              { label: 'Current Password', key: 'current', placeholder: '••••••••' },
              { label: 'New Password',     key: 'next',    placeholder: 'At least 8 characters' },
              { label: 'Confirm New Password', key: 'confirm', placeholder: '••••••••' },
            ].map(({ label, key, placeholder }) => (
              <View key={key} style={s.formField}>
                <Text style={s.formLabel}>{label}</Text>
                <TextInput
                  style={s.formInput}
                  placeholder={placeholder}
                  placeholderTextColor="#94a3b8"
                  value={pwForm[key]}
                  onChangeText={v => setPwForm(f => ({ ...f, [key]: v }))}
                  secureTextEntry
                />
              </View>
            ))}

            {!!pwErr && <View style={s.errBox}><Text style={s.errText}>{pwErr}</Text></View>}

            <TouchableOpacity style={[s.submitBtn, pwSaving && s.submitDisabled]} onPress={submitPassword} disabled={pwSaving}>
              {pwSaving ? <ActivityIndicator color="white" /> : <Text style={s.submitText}>Update Password</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* New Ticket Modal */}
      <Modal visible={showTicket} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTicket(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New HR Request</Text>
            <TouchableOpacity onPress={() => setShowTicket(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalScroll} keyboardShouldPersistTaps="handled">

            <View style={s.formField}>
              <Text style={s.formLabel}>Priority</Text>
              <View style={s.priorityRow}>
                {['low','medium','high'].map(p => (
                  <TouchableOpacity key={p}
                    style={[s.prioBtn, form.priority === p && s.prioBtnActive]}
                    onPress={() => setForm(f => ({ ...f, priority: p }))}>
                    <Text style={[s.prioBtnText, form.priority === p && s.prioBtnTextActive]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>Subject</Text>
              <TextInput style={s.formInput} placeholder="What do you need help with?" placeholderTextColor="#94a3b8"
                value={form.subject} onChangeText={v => setForm(f => ({ ...f, subject: v }))} />
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>Description</Text>
              <TextInput style={[s.formInput, s.formTextarea]}
                placeholder="Please describe your request in detail…"
                placeholderTextColor="#94a3b8"
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                multiline numberOfLines={5} textAlignVertical="top" />
            </View>

            {!!formErr && (
              <View style={s.errBox}><Text style={s.errText}>{formErr}</Text></View>
            )}

            <TouchableOpacity style={[s.submitBtn, saving && s.submitDisabled]} onPress={submitTicket} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={s.submitText}>Submit Request</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F0F4FA' },
  scroll:          { padding: 16, paddingBottom: 40 },
  profileCard:     { alignItems: 'center', paddingVertical: 24, marginBottom: 20 },
  avatar:          { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E8583C', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:      { color: 'white', fontWeight: '800', fontSize: 26 },
  profileName:     { fontSize: 20, fontWeight: '800', color: '#0F1829', marginBottom: 4 },
  profileEmail:    { fontSize: 13, color: '#64748b', marginBottom: 10 },
  roleBadge:       { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  roleText:        { fontSize: 12, fontWeight: '700', color: '#1e3a8a', textTransform: 'capitalize' },
  section:         { marginBottom: 20 },
  sectionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  newBtn:          { backgroundColor: '#0F1829', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  newBtnText:      { color: 'white', fontWeight: '700', fontSize: 12 },
  ticketCard:      { marginBottom: 8 },
  ticketTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketSubject:   { fontSize: 14, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  ticketBottom:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticketDate:      { fontSize: 12, color: '#94a3b8' },
  priorityDot:     { width: 6, height: 6, borderRadius: 3 },
  ticketPriority:  { fontSize: 12, color: '#64748b', textTransform: 'capitalize' },
  menuItem:        { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIcon:        { fontSize: 18, width: 28, textAlign: 'center' },
  menuLabel:       { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '500' },
  menuDanger:      { color: '#dc2626' },
  menuArrow:       { fontSize: 20, color: '#94a3b8' },
  divider:         { height: 1, backgroundColor: '#f1f5f9', marginLeft: 58 },
  empty:           { color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },
  version:         { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 8 },
  modal:           { flex: 1, backgroundColor: 'white' },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle:      { fontSize: 18, fontWeight: '800', color: '#0F1829' },
  modalClose:      { fontSize: 22, color: '#64748b' },
  modalScroll:     { padding: 20 },
  formField:       { marginBottom: 18 },
  formLabel:       { fontSize: 12, fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  formInput:       { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1e293b', backgroundColor: '#fafafa' },
  formTextarea:    { minHeight: 120 },
  priorityRow:     { flexDirection: 'row', gap: 10 },
  prioBtn:         { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fafafa' },
  prioBtnActive:   { borderColor: '#0F1829', backgroundColor: '#0F1829' },
  prioBtnText:     { fontSize: 13, color: '#475569', fontWeight: '500' },
  prioBtnTextActive:{ color: 'white', fontWeight: '700' },
  errBox:          { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errText:         { color: '#dc2626', fontSize: 13 },
  submitBtn:       { backgroundColor: '#0F1829', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitDisabled:  { opacity: 0.6 },
  submitText:      { color: 'white', fontSize: 16, fontWeight: '700' },
})
