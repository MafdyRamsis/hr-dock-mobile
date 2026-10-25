import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import api from '../../src/services/api'
import Card from '../../src/components/Card'
import Avatar from '../../src/components/Avatar'
import StatusBadge from '../../src/components/StatusBadge'
import { useLang } from '../../src/context/LanguageContext'
import { ls, chevron } from '../../src/utils/rtl'
import { personName } from '../../src/i18n/format'
import { closeLabel } from '../../src/utils/a11y'

const roleLabel = (role, tr) => ({
  employee:     tr('Employee', 'موظف'),
  manager:      tr('Manager', 'مدير'),
  hr_manager:   tr('HR Manager', 'مدير الموارد البشرية', 'مدير HR'),
  hr:           tr('HR', 'الموارد البشرية', 'HR'),
  admin:        tr('Admin', 'مسؤول النظام', 'أدمن'),
  super_admin:  tr('Super Admin', 'المسؤول الرئيسي', 'سوبر أدمن'),
}[role] || (role || '').replace(/_/g, ' '))

const priorityLabel = (p, tr) => ({
  low:    tr('Low', 'منخفضة', 'عادية'),
  medium: tr('Medium', 'متوسطة'),
  high:   tr('High', 'عالية', 'مستعجلة'),
}[p] || p)

export default function MoreScreen() {
  const { user, logout, can } = useAuth()
  const lead = ['manager', 'ceo', 'admin', 'hr_manager'].includes(user?.role)
  const executive = user?.role === 'ceo'
  const router = useRouter()
  const { t, tr, lang, date, setLanguage, ar } = useLang()
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
      // ?mine=1 keeps "HR Requests" scoped to the caller's own tickets —
      // without it, every role (including plain employees) saw every
      // ticket in the whole company here (confirmed live against
      // production).
      const r = await api.get('/helpdesk?limit=20&mine=1')
      setTickets(r.data.data || [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  const submitTicket = async () => {
    if (!form.subject.trim())      { setFormErr(tr('Please enter a subject.', 'يرجى إدخال الموضوع.', 'اكتب الموضوع الأول.')); return }
    if (!form.description.trim())  { setFormErr(tr('Please describe your request.', 'يرجى وصف طلبك.', 'اكتب تفاصيل طلبك.')); return }
    setFormErr(''); setSaving(true)
    try {
      await api.post('/helpdesk', form)
      setShowTicket(false)
      setForm({ subject: '', description: '', priority: 'medium' })
      await load()
      Alert.alert(tr('✅ Request submitted', '✅ تم إرسال الطلب', '✅ اتبعت'), tr('Your request has been submitted to HR.', 'تم إرسال طلبك إلى الموارد البشرية.', 'طلبك وصل لـ HR.'))
    } catch (err) {
      setFormErr(err.response?.data?.message || tr('Failed to submit request.', 'تعذّر إرسال الطلب.', 'معرفناش نبعت الطلب. يلا نجرّب تاني.'))
    } finally { setSaving(false) }
  }

  const submitPassword = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { setPwErr(t('fill_all')); return }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,50}$/.test(pwForm.next)) { /* same rule as the server */ setPwErr(t('pw_min')); return }
    if (pwForm.next !== pwForm.confirm) { setPwErr(t('pw_mismatch')); return }
    setPwErr(''); setPwSaving(true)
    try {
      // The backend only ever registered POST /auth/change-password — PUT
      // always 404'd, so this modal could never actually change a password.
      await api.post('/auth/change-password', { current_password: pwForm.current, new_password: pwForm.next })
      setShowPassword(false)
      setPwForm({ current: '', next: '', confirm: '' })
      Alert.alert(t('pw_changed_title'), t('pw_changed_msg'))
    } catch (err) {
      setPwErr(err.response?.data?.message || t('pw_failed'))
    } finally { setPwSaving(false) }
  }

  const confirmLogout = () => {
    Alert.alert(t('sign_out_title'), t('sign_out_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('sign_out_title'), style: 'destructive', onPress: logout },
    ])
  }

  // Bilingual on purpose, so it is readable whatever language is active.
  const changeLanguage = () => {
    Alert.alert(
      'Language / اللغة',
      'Choose your preferred language\nاختر لغتك المفضلة',
      [
        { text: 'English', onPress: () => setLanguage('en') }, // reloads the app if the layout direction changes
        { text: 'العربية', onPress: () => setLanguage('ar') },
        { text: 'Cancel / إلغاء', style: 'cancel' },
      ]
    )
  }

  const MenuItem = ({ icon, label, onPress, danger }) => (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={label}>
      <View style={s.menuIcon}><Ionicons name={icon} size={20} color={danger ? '#DC2626' : '#0E7C83'} /></View>
      <Text style={[s.menuLabel, danger && s.menuDanger]}>{label}</Text>
      <Text style={s.menuArrow}>{chevron}</Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#0E7C83" />}
      >
        {/* Profile card */}
        <Card style={s.profileCard}>
          <Avatar
            uri={user?.photo_url}
            firstName={user?.first_name}
            lastName={user?.last_name}
            size={72}
            backgroundColor="#E8583C"
            style={s.avatar}
          />
          <Text style={s.profileName}>{personName(user, ar)}</Text>
          <Text style={s.profileEmail}>{user?.email}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{roleLabel(user?.role, tr)}</Text>
          </View>
        </Card>

        {/* Language — near the top so employees find it easily */}
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <TouchableOpacity style={s.menuItem} onPress={changeLanguage} activeOpacity={0.7}>
            <View style={s.menuIcon}><Ionicons name="language-outline" size={20} color="#0E7C83" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.menuLabel}>{lang === 'ar' ? 'اللغة · Language' : 'Language · اللغة'}</Text>
              <Text style={s.menuSub}>{lang === 'ar' ? 'العربية' : 'English'}</Text>
            </View>
            <Text style={s.menuArrow}>{chevron}</Text>
          </TouchableOpacity>
        </Card>

        {/* My work */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{tr('My work', 'عملي')}</Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {can('leave') && <MenuItem icon="airplane-outline" label={tr('Leave balances', 'أرصدة الإجازات')} onPress={() => router.push('/leave-balance')} />}
            {lead && can('attendance') && <MenuItem icon="time-outline" label={tr('My attendance', 'حضوري')} onPress={() => router.push('/(tabs)/attendance')} />}
            {lead && can('payslips') && <MenuItem icon="wallet-outline" label={tr('My pay', 'راتبي')} onPress={() => router.push('/(tabs)/payslips')} />}
            {executive && can('requests') && <MenuItem icon="list-outline" label={tr('My requests', 'طلباتي')} onPress={() => router.push('/(tabs)/requests')} />}
            <MenuItem icon="flag-outline" label={tr('Goals', 'أهدافي')} onPress={() => router.push('/my-goals')} />
            <MenuItem icon="clipboard-outline" label={tr('Appraisals', 'تقييم الأداء')} onPress={() => router.push('/appraisals')} />
            <MenuItem icon="school-outline" label={tr('Training', 'التدريب')} onPress={() => router.push('/training')} />
            <MenuItem icon="gift-outline" label={tr('Benefits', 'المزايا')} onPress={() => router.push('/benefits')} />
            {can('expenses') && <MenuItem icon="receipt-outline" label={tr('Expenses', 'المصروفات')} onPress={() => router.push('/expenses')} />}
            {can('loans') && <MenuItem icon="card-outline" label={tr('Loans', 'السُلف والقروض')} onPress={() => router.push('/loans')} />}
            {can('documents') && <MenuItem icon="folder-open-outline" label={tr('My documents', 'مستنداتي')} onPress={() => router.push('/documents')} />}
            <MenuItem icon="person-circle-outline" label={tr('My space', 'مساحتي الشخصية')} onPress={() => router.push('/my-space')} />
          </Card>
        </View>

        {/* My team (managers, HR, admin) */}
        {lead && !executive && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{tr('My team', 'فريقي')}</Text>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <MenuItem icon="grid-outline" label={tr('Team today', 'الفريق اليوم')} onPress={() => router.push('/manager-dashboard')} />
              {can('team_approvals') && <MenuItem icon="checkmark-done-outline" label={tr('Leave approvals', 'موافقات الإجازات')} onPress={() => router.push('/leave-approvals')} />}
              <MenuItem icon="calendar-outline" label={tr('Coverage', 'التغطية')} onPress={() => router.push('/coverage')} />
              {can('performance_overview') && <MenuItem icon="trending-up-outline" label={tr('Performance', 'الأداء')} onPress={() => router.push('/(tabs)/performance')} />}
            </Card>
          </View>
        )}

        {/* Company */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{tr('Company', 'الشركة')}</Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {can('announcements') && <MenuItem icon="megaphone-outline" label={t('announcements')} onPress={() => router.push('/announcements')} />}
            <MenuItem icon="sunny-outline" label={tr('Holidays', 'العطلات الرسمية')} onPress={() => router.push('/holidays')} />
            {can('directory') && <MenuItem icon="people-outline" label={tr('Directory', 'دليل الموظفين')} onPress={() => router.push('/directory')} />}
            {can('pulse') && <MenuItem icon="heart-outline" label={tr('Recognition & wellbeing', 'التقدير ورفاهية الفريق')} onPress={() => router.push('/recognition')} />}
            {can('ai_assistant') && can('pulse') && <MenuItem icon="sparkles-outline" label={tr('Ask HR Dock (AI)', 'اسأل HR Dock')} onPress={() => router.push('/(tabs)/pulse')} />}
          </Card>
        </View>

        {/* Menu */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{tr('Account', 'الحساب', 'حسابك')}</Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <MenuItem icon="lock-closed-outline" label={t('change_password')}  onPress={() => setShowPassword(true)} />
            <View style={s.divider}/>
            <MenuItem icon="log-out-outline" label={t('sign_out_title')} danger  onPress={confirmLogout} />
          </Card>
        </View>

        <Text style={s.version}>{t('version_line')}</Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPassword} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPassword(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t('change_password')}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={closeLabel} onPress={() => { setShowPassword(false); setPwErr(''); setPwForm({ current: '', next: '', confirm: '' }) }}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalScroll} keyboardShouldPersistTaps="handled">
            {[
              { label: t('current_password'),     key: 'current', placeholder: '••••••••' },
              { label: t('new_password'),         key: 'next',    placeholder: t('pw_min_ph') },
              { label: t('confirm_new_password'), key: 'confirm', placeholder: '••••••••' },
            ].map(({ label, key, placeholder }) => (
              <View key={key} style={s.formField}>
                <Text style={s.formLabel}>{label}</Text>
                <TextInput
                  style={s.formInput}
                  placeholder={placeholder}
                  placeholderTextColor="#8494A6"
                  value={pwForm[key]}
                  onChangeText={v => setPwForm(f => ({ ...f, [key]: v }))}
                  secureTextEntry
                />
              </View>
            ))}

            {!!pwErr && <View style={s.errBox}><Text style={s.errText}>{pwErr}</Text></View>}

            <TouchableOpacity style={[s.submitBtn, pwSaving && s.submitDisabled]} onPress={submitPassword} disabled={pwSaving}>
              {pwSaving ? <ActivityIndicator color="white" /> : <Text style={s.submitText}>{t('update_password')}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* New Ticket Modal */}
      <Modal visible={showTicket} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTicket(false)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{tr('New HR Request', 'طلب موارد بشرية جديد', 'طلب HR جديد')}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={closeLabel} onPress={() => setShowTicket(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalScroll} keyboardShouldPersistTaps="handled">

            <View style={s.formField}>
              <Text style={s.formLabel}>{tr('Priority', 'الأولوية')}</Text>
              <View style={s.priorityRow}>
                {['low','medium','high'].map(p => (
                  <TouchableOpacity key={p}
                    style={[s.prioBtn, form.priority === p && s.prioBtnActive]}
                    onPress={() => setForm(f => ({ ...f, priority: p }))}>
                    <Text style={[s.prioBtnText, form.priority === p && s.prioBtnTextActive]}>
                      {priorityLabel(p, tr)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>{tr('Subject', 'الموضوع')}</Text>
              <TextInput style={s.formInput} placeholder={tr('What do you need help with?', 'بماذا يمكننا مساعدتك؟', 'محتاج مساعدة في إيه؟')} placeholderTextColor="#8494A6"
                value={form.subject} onChangeText={v => setForm(f => ({ ...f, subject: v }))} />
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>{tr('Description', 'الوصف', 'التفاصيل')}</Text>
              <TextInput style={[s.formInput, s.formTextarea]}
                placeholder={tr('Please describe your request in detail…', 'يرجى وصف طلبك بالتفصيل…', 'احكيلنا طلبك بالتفصيل…')}
                placeholderTextColor="#8494A6"
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                multiline numberOfLines={5} textAlignVertical="top" />
            </View>

            {!!formErr && (
              <View style={s.errBox}><Text style={s.errText}>{formErr}</Text></View>
            )}

            <TouchableOpacity style={[s.submitBtn, saving && s.submitDisabled]} onPress={submitTicket} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={s.submitText}>{tr('Submit Request', 'إرسال الطلب', 'ابعت الطلب')}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F5F4F0' },
  scroll:          { padding: 16, paddingBottom: 40 },
  profileCard:     { alignItems: 'center', paddingVertical: 24, marginBottom: 20 },
  avatar:          { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E8583C', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:      { color: 'white', fontWeight: '800', fontSize: 26 },
  profileName:     { fontSize: 20, fontWeight: '800', color: '#132940', marginBottom: 4 },
  profileEmail:    { fontSize: 13, color: '#56657A', marginBottom: 10 },
  roleBadge:       { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  roleText:        { fontSize: 12, fontWeight: '700', color: '#1e3a8a', textTransform: 'capitalize' },
  section:         { marginBottom: 20 },
  sectionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: '#56657A', textTransform: 'uppercase', letterSpacing: ls(0.5) },
  newBtn:          { backgroundColor: '#132940', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  newBtnText:      { color: 'white', fontWeight: '700', fontSize: 12 },
  ticketCard:      { marginBottom: 8 },
  ticketTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketSubject:   { fontSize: 14, fontWeight: '600', color: '#1F3550', flex: 1, marginRight: 8 },
  ticketBottom:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticketDate:      { fontSize: 12, color: '#8494A6' },
  priorityDot:     { width: 6, height: 6, borderRadius: 3 },
  ticketPriority:  { fontSize: 12, color: '#56657A', textTransform: 'capitalize' },
  menuItem:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 52, gap: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3E1DA' },
  menuIcon:        { width: 28, alignItems: 'center' },
  menuLabel:       { flex: 1, fontSize: 15, color: '#1F3550', fontWeight: '500' },
  menuSub:         { fontSize: 12, color: '#8494A6', marginTop: 1 },
  menuDanger:      { color: '#dc2626' },
  menuArrow:       { fontSize: 20, color: '#8494A6' },
  divider:         { height: 1, backgroundColor: '#EFEDE7', marginLeft: 58 },
  empty:           { color: '#8494A6', textAlign: 'center', paddingVertical: 8 },
  version:         { textAlign: 'center', color: '#8494A6', fontSize: 12, marginTop: 8 },
  modal:           { flex: 1, backgroundColor: 'white' },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EFEDE7' },
  modalTitle:      { fontSize: 18, fontWeight: '800', color: '#132940' },
  modalClose:      { fontSize: 22, color: '#56657A' },
  modalScroll:     { padding: 20 },
  formField:       { marginBottom: 18 },
  formLabel:       { fontSize: 12, fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: ls(0.4), marginBottom: 8 },
  formInput:       { borderWidth: 1.5, borderColor: '#E3E1DA', borderRadius: 12, padding: 14, fontSize: 15, color: '#1F3550', backgroundColor: '#fafafa' },
  formTextarea:    { minHeight: 120 },
  priorityRow:     { flexDirection: 'row', gap: 10 },
  prioBtn:         { flex: 1, borderWidth: 1.5, borderColor: '#E3E1DA', borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fafafa' },
  prioBtnActive:   { borderColor: '#132940', backgroundColor: '#132940' },
  prioBtnText:     { fontSize: 13, color: '#3D4D61', fontWeight: '500' },
  prioBtnTextActive:{ color: 'white', fontWeight: '700' },
  errBox:          { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errText:         { color: '#dc2626', fontSize: 13 },
  submitBtn:       { backgroundColor: '#132940', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitDisabled:  { opacity: 0.6 },
  submitText:      { color: 'white', fontSize: 16, fontWeight: '700' },
})
