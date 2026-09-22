import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { useAuth } from '../../src/context/AuthContext'
import { useLang } from '../../src/context/LanguageContext'
import { GRADIENTS, useTheme } from '../../src/context/ThemeContext'

export default function LoginScreen() {
  const { login, loginWithBiometric, pending2fa, verify2fa, cancel2fa } = useAuth()
  const { t, lang, setLanguage } = useLang()
  const { colors, isDark } = useTheme()
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
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={GRADIENTS.coral} style={[s.blobTop, { opacity: isDark ? 0.24 : 0.28 }]} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} />
      <LinearGradient colors={GRADIENTS.lavender} style={[s.blobBottom, { opacity: isDark ? 0.18 : 0.22 }]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} />
      <LinearGradient colors={GRADIENTS.mint} style={[s.blobMid, { opacity: isDark ? 0.12 : 0.14 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.logoArea}>
            <LinearGradient colors={GRADIENTS.coral} style={s.logoBubble} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={s.logoBubbleText}>HR</Text>
            </LinearGradient>
            <View style={s.logoTextWrap}>
              <Text style={[s.logoDock, { color: colors.text }]}>Dock</Text>
              <Text style={[s.tagline, { color: colors.sub }]}>{t('tagline')}</Text>
            </View>
          </View>

          {pending2fa && (
            <View style={[s.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Text style={[s.title, { color: colors.text }]}>{t('twofa_title')}</Text>
              <Text style={[s.subtitle, { color: colors.sub }]}>{t('twofa_sub')}</Text>
              <View style={s.field}>
                <Text style={[s.label, { color: colors.sub }]}>{t('twofa_label')}</Text>
                <TextInput
                  style={[s.input, { borderColor: colors.border2, backgroundColor: colors.input, color: colors.text }]}
                  placeholder="123456"
                  placeholderTextColor={colors.muted}
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
              <TouchableOpacity onPress={submit2fa} disabled={loading} activeOpacity={0.85} style={s.btnWrap}>
                <LinearGradient colors={GRADIENTS.coral} style={[s.btn, loading && s.btnDisabled]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>{t('twofa_verify')}</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { cancel2fa(); setCode(''); setError('') }} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: colors.sub, fontSize: 13, fontWeight: '600' }}>{t('back_to_sign_in')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[s.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }, pending2fa && { display: 'none' }]}>
            <Text style={[s.title, { color: colors.text }]}>{t('welcome_back')}</Text>
            <Text style={[s.subtitle, { color: colors.sub }]}>{t('sign_in_sub')}</Text>

            <View style={s.field}>
              <Text style={[s.label, { color: colors.sub }]}>{t('workspace')}</Text>
              <TextInput
                style={[s.input, { borderColor: colors.border2, backgroundColor: colors.input, color: colors.text }]}
                placeholder={t('workspace_ph')}
                placeholderTextColor={colors.muted}
                value={workspace}
                onChangeText={setWorkspace}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={s.field}>
              <Text style={[s.label, { color: colors.sub }]}>{t('email')}</Text>
              <TextInput
                style={[s.input, { borderColor: colors.border2, backgroundColor: colors.input, color: colors.text }]}
                placeholder={t('email_ph')}
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={s.field}>
              <Text style={[s.label, { color: colors.sub }]}>{t('password')}</Text>
              <TextInput
                style={[s.input, { borderColor: colors.border2, backgroundColor: colors.input, color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
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

            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85} style={s.btnWrap}>
              <LinearGradient colors={GRADIENTS.coral} style={[s.btn, loading && s.btnDisabled]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={s.btnText}>{t('sign_in')}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {biometricReady && (
              <>
                <View style={s.dividerRow}>
                  <View style={[s.dividerLine, { backgroundColor: colors.border2 }]} />
                  <Text style={[s.dividerText, { color: colors.muted }]}>{t('or')}</Text>
                  <View style={[s.dividerLine, { backgroundColor: colors.border2 }]} />
                </View>
                <TouchableOpacity
                  style={[s.bioBtn, { borderColor: `${GRADIENTS.mint[0]}55`, backgroundColor: `${GRADIENTS.mint[0]}1A` }, bioLoading && s.btnDisabled]}
                  onPress={handleBiometric}
                  disabled={bioLoading}
                  activeOpacity={0.85}
                >
                  {bioLoading
                    ? <ActivityIndicator color={GRADIENTS.mint[0]} />
                    : <>
                        <Text style={s.bioIcon}>
                          {Platform.OS === 'ios' ? '🔒' : '👆'}
                        </Text>
                        <Text style={[s.bioBtnText, { color: GRADIENTS.mint[0] }]}>
                          {Platform.OS === 'ios' ? t('bio_face') : t('bio_finger')}
                        </Text>
                      </>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity onPress={() => setLanguage(lang === 'ar' ? 'en' : 'ar')} style={[s.langBtn, { backgroundColor: `${GRADIENTS.lavender[1]}22` }]} activeOpacity={0.8}>
            <Text style={[s.langText, { color: GRADIENTS.lavender[0] }]}>{lang === 'ar' ? 'English' : 'العربية'}</Text>
          </TouchableOpacity>

          <Text style={[s.footer, { color: colors.muted }]}>{t('footer')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F8F9FD' },
  blobTop:     { position: 'absolute', top: -90, right: -70, width: 260, height: 260, borderRadius: 130, opacity: 0.28 },
  blobBottom:  { position: 'absolute', bottom: -110, left: -90, width: 300, height: 300, borderRadius: 150, opacity: 0.22 },
  blobMid:     { position: 'absolute', top: '38%', right: -110, width: 220, height: 220, borderRadius: 110, opacity: 0.14 },
  scroll:      { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoArea:    { flexDirection: 'row', alignItems: 'center', marginBottom: 36, gap: 14 },
  logoBubble:  { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
  logoBubbleText: { fontSize: 22, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
  logoTextWrap:{ flex: 1 },
  logoDock:    { fontSize: 26, fontWeight: '900', color: '#1A1B2E', letterSpacing: -0.5 },
  tagline:     { fontSize: 12.5, color: '#8A8DA3', letterSpacing: 0.2, marginTop: 2 },
  card:        { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 28, padding: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', shadowColor: '#8890B5', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 8 },
  title:       { fontSize: 22, fontWeight: '900', color: '#1A1B2E', marginBottom: 4 },
  subtitle:    { fontSize: 14, color: '#8A8DA3', marginBottom: 26 },
  field:       { marginBottom: 16 },
  label:       { fontSize: 11.5, fontWeight: '700', color: '#6B6E85', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:       { borderWidth: 1.5, borderColor: '#E3E6F3', borderRadius: 16, padding: 14, fontSize: 15, color: '#1A1B2E', backgroundColor: '#F5F6FC' },
  errorBox:    { backgroundColor: '#FFE9E6', borderWidth: 1, borderColor: '#FFCFC9', borderRadius: 14, padding: 12, marginBottom: 16 },
  errorText:   { color: '#E14F4A', fontSize: 13, fontWeight: '600' },
  btnWrap:     { borderRadius: 16, marginTop: 6, shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 5 },
  btn:         { borderRadius: 16, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.65 },
  btnText:     { color: 'white', fontSize: 16, fontWeight: '800' },
  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E3E6F3' },
  dividerText: { fontSize: 12, color: '#B0B3C6', fontWeight: '700' },
  bioBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#D4F5E9', borderRadius: 16, padding: 14, backgroundColor: '#EBFBF5' },
  bioIcon:     { fontSize: 19 },
  bioBtnText:  { fontSize: 15, fontWeight: '800', color: '#0E9F6E' },
  langBtn:     { alignSelf: 'center', marginTop: 24, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, backgroundColor: 'rgba(136,84,208,0.1)' },
  langText:    { color: '#8854D0', fontSize: 13.5, fontWeight: '800' },
  footer:      { textAlign: 'center', marginTop: 18, color: '#B0B3C6', fontSize: 12 },
})
