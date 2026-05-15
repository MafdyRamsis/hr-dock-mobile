import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, Switch, Platform, I18nManager,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { useAuth } from '../src/context/AuthContext'
import { useTheme } from '../src/context/ThemeContext'
import Skeleton from '../src/components/Skeleton'
import api from '../src/services/api'

const fmtDate = d => {
  if (!d) return null
  const parts = d.split('T')[0].split('-')
  if (parts.length !== 3) return d
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function EmpRow({ icon, label, value, last, loading, colors }) {
  return (
    <View style={[er.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={er.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[er.label, { color: colors.sub }]}>{label}</Text>
        {loading
          ? <Skeleton width="55%" height={13} style={{ marginTop: 4 }} />
          : <Text style={[er.value, { color: colors.text2 }]} numberOfLines={1}>{value || '—'}</Text>
        }
      </View>
    </View>
  )
}

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const { colors, isDark, toggleTheme } = useTheme()
  const router = useRouter()

  const [showPassword,  setShowPassword]  = useState(false)
  const [pwForm,        setPwForm]        = useState({ current: '', next: '', confirm: '' })
  const [pwErr,         setPwErr]         = useState('')
  const [pwSaving,      setPwSaving]      = useState(false)
  const [bioEnabled,    setBioEnabled]    = useState(false)
  const [bioAvailable,  setBioAvailable]  = useState(false)
  const [emp,           setEmp]           = useState(null)
  const [empLoading,    setEmpLoading]    = useState(true)
  const [language,      setLanguage]      = useState('en')

  useEffect(() => {
    const checkBio = async () => {
      const hasHW    = await LocalAuthentication.hasHardwareAsync()
      const enrolled = await LocalAuthentication.isEnrolledAsync()
      setBioAvailable(hasHW && enrolled)
      if (hasHW && enrolled) {
        const enabled = await SecureStore.getItemAsync('biometric_enabled')
        setBioEnabled(enabled === 'true')
      }
    }
    const loadEmployee = async () => {
      try {
        const r = await api.get('/employees')
        const list = Array.isArray(r.data.data) ? r.data.data : (r.data.data?.rows || [])
        const me = list.find(e => e.email === user?.email) || list[0]
        if (!me) { setEmpLoading(false); return }
        // Fetch full record (includes date_of_birth, position_title, etc.)
        const detail = await api.get(`/employees/${me.id}`)
        const full = detail.data.data || me
        setEmp(full)
      } catch (e) { console.log('EMP ERR:', e?.response?.data) }
      finally { setEmpLoading(false) }
    }
    const loadLanguage = async () => {
      const saved = await SecureStore.getItemAsync('app_language')
      if (saved) setLanguage(saved)
    }
    checkBio()
    loadEmployee()
    loadLanguage()
  }, [])

  const changeLanguage = () => {
    Alert.alert(
      'Language / اللغة',
      'Choose your preferred language\nاختر لغتك المفضلة',
      [
        {
          text: 'English',
          onPress: async () => {
            await SecureStore.setItemAsync('app_language', 'en')
            setLanguage('en')
            I18nManager.forceRTL(false)
            Alert.alert('Language Changed', 'Please restart the app for changes to take effect.')
          },
        },
        {
          text: 'العربية',
          onPress: async () => {
            await SecureStore.setItemAsync('app_language', 'ar')
            setLanguage('ar')
            I18nManager.forceRTL(true)
            Alert.alert('تم تغيير اللغة', 'أعد تشغيل التطبيق لتطبيق التغييرات\nPlease restart the app for changes to take effect.')
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    )
  }

  const toggleBiometric = async (value) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify to enable biometric login',
        fallbackLabel: 'Cancel',
      })
      if (!result.success) return
      await SecureStore.setItemAsync('biometric_enabled', 'true')
      setBioEnabled(true)
      Alert.alert('Enabled', 'Biometric login is now active. You can use it on the next sign-in.')
    } else {
      await SecureStore.deleteItemAsync('biometric_enabled')
      setBioEnabled(false)
    }
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
    } catch (e) {
      setPwErr(e.response?.data?.message || 'Failed to change password.')
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
      <Text style={[s.menuLabel, { color: colors.text2 }, danger && s.menuDanger]}>{label}</Text>
      <Text style={[s.menuArrow, { color: colors.muted }]}>›</Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[s.navBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backArrow, { color: colors.text }]}>←</Text>
          <Text style={[s.backText,  { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.text }]}>Profile</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Avatar */}
        <View style={s.avatarBox}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.first_name?.[0]}{user?.last_name?.[0]}</Text>
          </View>
          <Text style={[s.name, { color: colors.text }]}>{user?.first_name} {user?.last_name}</Text>
          <Text style={[s.email, { color: colors.sub }]}>{user?.email}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{user?.role?.replace('_', ' ')}</Text>
          </View>
          <Text style={s.company}>{user?.company_name}</Text>
        </View>

        {/* Employee Info */}
        <Text style={[s.sectionTitle, { color: colors.sub }]}>Employee Information</Text>
        <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {empLoading ? (
            <>
              <EmpRow icon="🪪" label="Employee Code" value={null} loading colors={colors} />
              <EmpRow icon="🏢" label="Department"    value={null} loading colors={colors} />
              <EmpRow icon="💼" label="Position"      value={null} loading colors={colors} />
            </>
          ) : (
            <>
              <EmpRow icon="🪪" label="Employee Code" value={emp?.employee_number}            colors={colors} />
              <EmpRow icon="🏢" label="Department"    value={emp?.department_name}           colors={colors} />
              <EmpRow icon="💼" label="Position"      value={emp?.position_title}            colors={colors} />
              <EmpRow icon="📱" label="Mobile"        value={emp?.phone}                     colors={colors} />
              <EmpRow icon="🎂" label="Birth Date"    value={fmtDate(emp?.date_of_birth)}    colors={colors} />
              <EmpRow icon="📅" label="Hire Date"     value={fmtDate(emp?.hire_date)}        colors={colors} />
              <EmpRow icon="🪆" label="Gender"        value={emp?.gender}                    colors={colors} />
              <EmpRow icon="🪙" label="National ID"   value={emp?.national_id}               colors={colors} last />
            </>
          )}
        </View>

        {/* Account Info */}
        <Text style={[s.sectionTitle, { color: colors.sub }]}>Account</Text>
        <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <EmpRow icon="✉️" label="Email"   value={user?.email}                          colors={colors} />
          <EmpRow icon="🏷️" label="Role"    value={user?.role?.replace(/_/g, ' ')}       colors={colors} />
          <EmpRow icon="🏢" label="Company" value={user?.company_name}                   colors={colors} last />
        </View>

        {/* Settings */}
        <Text style={[s.sectionTitle, { color: colors.sub }]}>Settings</Text>
        <View style={[s.menuCard, { backgroundColor: colors.card }]}>
          <MenuItem icon="🔒" label="Change Password" onPress={() => setShowPassword(true)} />
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <View style={s.menuItem}>
            <Text style={s.menuIcon}>{isDark ? '🌙' : '☀️'}</Text>
            <Text style={[s.menuLabel, { color: colors.text2 }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#e2e8f0', true: '#2BC4BE' }}
              thumbColor="white"
            />
          </View>
          {bioAvailable && (
            <>
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <View style={s.menuItem}>
                <Text style={s.menuIcon}>{bioAvailable ? '👆' : '🔐'}</Text>
                <Text style={[s.menuLabel, { color: colors.text2 }]}>
                  {Platform.OS === 'ios' ? 'Face ID Login' : 'Fingerprint Login'}
                </Text>
                <Switch
                  value={bioEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: '#e2e8f0', true: '#2BC4BE' }}
                  thumbColor="white"
                />
              </View>
            </>
          )}
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={s.menuItem} onPress={changeLanguage} activeOpacity={0.7}>
            <Text style={s.menuIcon}>🌐</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.menuLabel, { color: colors.text2 }]}>Language</Text>
              <Text style={[s.menuSub, { color: colors.muted }]}>{language === 'ar' ? 'العربية' : 'English'}</Text>
            </View>
            <Text style={[s.menuArrow, { color: colors.muted }]}>›</Text>
          </TouchableOpacity>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="📢" label="Announcements" onPress={() => router.push('/announcements')} />
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <MenuItem icon="🚪" label="Sign Out" danger onPress={confirmLogout} />
        </View>

        <Text style={s.version}>HR Dock v1.0 · Employee Self-Service</Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPassword} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPassword(false)}>
        <SafeAreaView style={pw.safe}>
          <View style={pw.header}>
            <Text style={pw.title}>Change Password</Text>
            <TouchableOpacity onPress={() => { setShowPassword(false); setPwErr(''); setPwForm({ current: '', next: '', confirm: '' }) }}>
              <Text style={pw.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={pw.scroll} keyboardShouldPersistTaps="handled">
            {[
              { label: 'Current Password',     key: 'current',  ph: '••••••••' },
              { label: 'New Password',          key: 'next',     ph: 'At least 8 characters' },
              { label: 'Confirm New Password',  key: 'confirm',  ph: '••••••••' },
            ].map(({ label, key, ph }) => (
              <View key={key} style={pw.field}>
                <Text style={pw.label}>{label}</Text>
                <TextInput
                  style={pw.input}
                  placeholder={ph}
                  placeholderTextColor="#94a3b8"
                  value={pwForm[key]}
                  onChangeText={v => setPwForm(f => ({ ...f, [key]: v }))}
                  secureTextEntry
                />
              </View>
            ))}
            {!!pwErr && <View style={pw.errBox}><Text style={pw.errText}>{pwErr}</Text></View>}
            <TouchableOpacity style={[pw.btn, pwSaving && pw.btnDis]} onPress={submitPassword} disabled={pwSaving}>
              {pwSaving ? <ActivityIndicator color="white" /> : <Text style={pw.btnText}>Update Password</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F0F4FA' },
  navBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backArrow:   { fontSize: 20, color: '#0F1829' },
  backText:    { fontSize: 15, color: '#0F1829', fontWeight: '600' },
  navTitle:    { fontSize: 16, fontWeight: '800', color: '#0F1829' },
  scroll:      { padding: 16, paddingBottom: 40 },
  avatarBox:   { alignItems: 'center', marginBottom: 24 },
  avatar:      { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8583C', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:  { color: 'white', fontWeight: '800', fontSize: 28 },
  name:        { fontSize: 20, fontWeight: '800', color: '#0F1829', marginBottom: 4 },
  email:       { fontSize: 13, color: '#64748b', marginBottom: 8 },
  roleBadge:   { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 4 },
  roleText:    { fontSize: 12, fontWeight: '700', color: '#1e3a8a', textTransform: 'capitalize' },
  company:     { fontSize: 12, color: '#94a3b8' },
  infoCard:    { backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  infoLabel:   { fontSize: 13, color: '#64748b' },
  infoValue:   { fontSize: 13, fontWeight: '600', color: '#0F1829', textTransform: 'capitalize' },
  sectionTitle:{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  menuCard:    { backgroundColor: 'white', borderRadius: 14, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  menuItem:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIcon:    { fontSize: 18, width: 26, textAlign: 'center' },
  menuLabel:   { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '500' },
  menuSub:     { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  menuDanger:  { color: '#dc2626' },
  menuArrow:   { fontSize: 20, color: '#94a3b8' },
  divider:     { height: 1, backgroundColor: '#f1f5f9', marginLeft: 56 },
  version:     { textAlign: 'center', color: '#94a3b8', fontSize: 12 },
})

const er = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon:  { fontSize: 18, width: 28, textAlign: 'center' },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  value: { fontSize: 14, fontWeight: '600' },
})

const pw = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: 'white' },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title:   { fontSize: 18, fontWeight: '800', color: '#0F1829' },
  close:   { fontSize: 22, color: '#64748b' },
  scroll:  { padding: 20 },
  field:   { marginBottom: 16 },
  label:   { fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  input:   { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1e293b', backgroundColor: '#fafafa' },
  errBox:  { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errText: { color: '#dc2626', fontSize: 13 },
  btn:     { backgroundColor: '#0F1829', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  btnDis:  { opacity: 0.6 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
})
