import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { useAuth } from '../../src/context/AuthContext'
import { useLang } from '../../src/context/LanguageContext'

export default function LoginScreen() {
  const { login, loginWithBiometric, pending2fa, verify2fa, cancel2fa } = useAuth()
  const { t, lang, setLanguage } = useLang()
  const [code, setCode] = useState('')
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [workspace,      setWorkspace]      = useState('')
  const [error,          setError]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [biometricReady, setBiometricReady] = useState(false)
  const [bioLoading,     setBioLoading]     = useState(false)

  useEffect(() => {
    SecureStore.getItemAsync('workspace').then(v => { if (v) setWorkspace(v) })
    checkBiometric()
  }, [])

  const checkBiometric = async () => {
    try {
      const enabled   = await SecureStore.getItemAsync('biometric_enabled')
      if (enabled !== 'true') return
      const hasHW     = await LocalAuthentication.hasHardwareAsync()
      const enrolled  = await LocalAuthentication.isEnrolledAsync()
      const hasToken  = !!(await SecureStore.getItemAsync('token'))
      const ready = hasHW && enrolled && hasToken
      setBiometricReady(ready)
      if (ready) handleBiometric() // app lock: prompt straight away
    } catch {}
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim() || !workspace.trim()) { setError(t('fill_all')); return }
    setError(''); setLoading(true)
    try {
      await SecureStore.setItemAsync('workspace', workspace.trim())
      await login(email.trim().toLowerCase(), password, workspace.trim())
    } catch (err) {
      setError(err.response?.data?.message || t('login_failed'))
    } finally {
      setLoading(false)
    }
  }

  const submit2fa = async () => {
    if (code.trim().length < 6) { setError(t('twofa_short')); return }
    setError(''); setLoading(true)
    try {
      await verify2fa(code.trim())
      setCode('')
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('twofa_invalid'))
    } finally {
      setLoading(false)
    }
  }

  const handleBiometric = async () => {
    setError(''); setBioLoading(true)
    try {
      await loginWithBiometric()
    } catch (err) {
      setError(err.message || t('bio_failed'))
    } finally {
      setBioLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.logoArea}>
            <View style={s.logoBox}>
              <Text style={s.logoHR}>HR</Text>
              <Text style={s.logoDock}>Dock</Text>
            </View>
            <Text style={s.tagline}>{t('tagline')}</Text>
          </View>

          {pending2fa && (
            <View style={s.card}>
              <Text style={s.title}>{t('twofa_title')}</Text>
              <Text style={s.subtitle}>{t('twofa_sub')}</Text>
              <View style={s.field}>
                <Text style={s.label}>{t('twofa_label')}</Text>
                <TextInput
                  style={s.input}
                  placeholder="123456"
                  placeholderTextColor="#94a3b8"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>
              {!!error && (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={submit2fa}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>{t('twofa_verify')}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { cancel2fa(); setCode(''); setError('') }} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontSize: 13 }}>{t('back_to_sign_in')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[s.card, pending2fa && { display: 'none' }]}>
            <Text style={s.title}>{t('welcome_back')}</Text>
            <Text style={s.subtitle}>{t('sign_in_sub')}</Text>

            <View style={s.field}>
              <Text style={s.label}>{t('workspace')}</Text>
              <TextInput
                style={s.input}
                placeholder={t('workspace_ph')}
                placeholderTextColor="#94a3b8"
                value={workspace}
                onChangeText={setWorkspace}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t('email')}</Text>
              <TextInput
                style={s.input}
                placeholder={t('email_ph')}
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t('password')}</Text>
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="white" />
                : <Text style={s.btnText}>{t('sign_in')}</Text>
              }
            </TouchableOpacity>

            {biometricReady && (
              <>
                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>{t('or')}</Text>
                  <View style={s.dividerLine} />
                </View>
                <TouchableOpacity
                  style={[s.bioBtn, bioLoading && s.btnDisabled]}
                  onPress={handleBiometric}
                  disabled={bioLoading}
                  activeOpacity={0.85}
                >
                  {bioLoading
                    ? <ActivityIndicator color="#0F1829" />
                    : <>
                        <Text style={s.bioIcon}>
                          {Platform.OS === 'ios' ? '🔒' : '👆'}
                        </Text>
                        <Text style={s.bioBtnText}>
                          {Platform.OS === 'ios' ? t('bio_face') : t('bio_finger')}
                        </Text>
                      </>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity onPress={() => setLanguage(lang === 'ar' ? 'en' : 'ar')} style={s.langBtn} activeOpacity={0.7}>
            <Text style={s.langText}>{lang === 'ar' ? 'English' : 'العربية'}</Text>
          </TouchableOpacity>

          <Text style={s.footer}>{t('footer')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#0F1829' },
  scroll:      { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoArea:    { alignItems: 'center', marginBottom: 40 },
  logoBox:     { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  logoHR:      { fontSize: 42, fontWeight: '900', color: '#E8583C', letterSpacing: -1 },
  logoDock:    { fontSize: 42, fontWeight: '900', color: '#2BC4BE', letterSpacing: -1 },
  tagline:     { fontSize: 13, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 },
  card:        { backgroundColor: 'white', borderRadius: 24, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },
  title:       { fontSize: 22, fontWeight: '800', color: '#0F1829', marginBottom: 4 },
  subtitle:    { fontSize: 14, color: '#64748b', marginBottom: 28 },
  field:       { marginBottom: 16 },
  label:       { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:       { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1e293b', backgroundColor: '#fafafa' },
  errorBox:    { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText:   { color: '#dc2626', fontSize: 13 },
  btn:         { backgroundColor: '#0F1829', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: 'white', fontSize: 16, fontWeight: '700' },
  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  bioBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, backgroundColor: '#f8fafc' },
  bioIcon:     { fontSize: 20 },
  bioBtnText:  { fontSize: 15, fontWeight: '700', color: '#0F1829' },
  langBtn:     { alignSelf: 'center', marginTop: 24, paddingVertical: 8, paddingHorizontal: 16 },
  langText:    { color: '#2BC4BE', fontSize: 14, fontWeight: '700' },
  footer:      { textAlign: 'center', marginTop: 16, color: 'rgba(255,255,255,0.3)', fontSize: 12 },
})
