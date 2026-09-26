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
import { ls, fwd } from '../../src/utils/rtl'

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {pending2fa ? (
            <View style={[s.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Text style={[s.title, { color: colors.text }]}>{t('twofa_title')}</Text>
              <Text style={[s.subtitle, { color: colors.sub }]}>{t('twofa_sub')}</Text>
              <View style={s.field}>
                <Text style={[s.label, { color: colors.text2 }]}>{t('twofa_label')}</Text>
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
                <LinearGradient colors={GRADIENTS.coral} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.btn, loading && s.btnDisabled]}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>{t('twofa_verify')}</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { cancel2fa(); setCode(''); setError('') }} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: colors.sub, fontSize: 13, fontWeight: '600' }}>{t('back_to_sign_in')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ── Headline block — bold, left-aligned, flat (no card) ── */}
              <Text style={[s.headline, { color: colors.text }]}>{t('welcome_back')}</Text>

              <View style={[s.badge, { backgroundColor: `${colors.coral}14` }]}>
                <View style={[s.badgeDot, { backgroundColor: colors.coral }]} />
                <Text style={[s.badgeText, { color: colors.coral }]}>{t('tagline').toUpperCase()}</Text>
              </View>

              <Text style={[s.subtitle, s.subtitleSpaced, { color: colors.sub }]}>{t('sign_in_sub')}</Text>

              <View style={s.field}>
                <Text style={[s.label, { color: colors.text2 }]}>{t('workspace')}</Text>
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
                <Text style={[s.label, { color: colors.text2 }]}>{t('email')}</Text>
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
                <Text style={[s.label, { color: colors.text2 }]}>{t('password')}</Text>
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
                <LinearGradient colors={GRADIENTS.coral} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.btn, loading && s.btnDisabled]}>
                  {loading
                    ? <ActivityIndicator color="white" />
                    : <View style={s.btnRow}>
                        <Text style={s.btnText}>{t('sign_in')}</Text>
                        <Text style={s.btnText}>{fwd}</Text>
                      </View>
                  }
                </LinearGradient>
              </TouchableOpacity>

              {biometricReady && (
                <>
                  <View style={s.dividerRow}>
                    <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
                    <Text style={[s.dividerText, { color: colors.muted }]}>{t('or')}</Text>
                    <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
                  </View>
                  <TouchableOpacity
                    style={[s.bioBtn, { borderColor: colors.border2, backgroundColor: colors.card }, bioLoading && s.btnDisabled]}
                    onPress={handleBiometric}
                    disabled={bioLoading}
                    activeOpacity={0.85}
                  >
                    {bioLoading
                      ? <ActivityIndicator color={colors.mint} />
                      : <>
                          <Text style={s.bioIcon}>
                            {Platform.OS === 'ios' ? '🔒' : '👆'}
                          </Text>
                          <Text style={[s.bioBtnText, { color: colors.mint }]}>
                            {Platform.OS === 'ios' ? t('bio_face') : t('bio_finger')}
                          </Text>
                        </>
                    }
                  </TouchableOpacity>
                </>
              )}

              {/* ── Trust row — matches the web app's "Secure Access" strip ── */}
              <View style={s.trustDividerRow}>
                <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
              </View>
              <View style={s.trustRow}>
                <View style={[s.trustChip, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
                  <Text style={[s.trustText, { color: colors.sub }]}>🔒 {t('trust_encrypted')}</Text>
                </View>
                <View style={[s.trustChip, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
                  <Text style={[s.trustText, { color: colors.sub }]}>✓ {t('trust_compliant')}</Text>
                </View>
                <View style={[s.trustChip, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
                  <Text style={[s.trustText, { color: colors.sub }]}>⚡ {t('trust_fast')}</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setLanguage(lang === 'ar' ? 'en' : 'ar')} style={[s.langBtn, { backgroundColor: `${colors.lavender}16` }]} activeOpacity={0.8}>
                <Text style={[s.langText, { color: colors.lavender }]}>{lang === 'ar' ? 'English' : 'العربية'}</Text>
              </TouchableOpacity>

              <Text style={[s.footer, { color: colors.muted }]}>{t('footer')}</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  scroll:      { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 56 },
  headline:    { fontSize: 34, fontWeight: '800', letterSpacing: ls(-0.8), marginBottom: 12 },
  badge:       { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 },
  badgeDot:    { width: 5, height: 5, borderRadius: 3 },
  badgeText:   { fontSize: 10.5, fontWeight: '800', letterSpacing: ls(0.6) },
  subtitle:    { fontSize: 14.5 },
  subtitleSpaced: { marginBottom: 28 },
  card:        { borderRadius: 20, padding: 24, borderWidth: 1 },
  title:       { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  field:       { marginBottom: 16 },
  label:       { fontSize: 11.5, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: ls(0.5) },
  input:       { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15 },
  errorBox:    { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText:   { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  btnWrap:     { borderRadius: 14, marginTop: 6, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 5 },
  btn:         { borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.65 },
  btnText:     { color: 'white', fontSize: 16, fontWeight: '800' },
  btnRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '700' },
  bioBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, padding: 14 },
  bioIcon:     { fontSize: 19 },
  bioBtnText:  { fontSize: 15, fontWeight: '800' },
  trustDividerRow: { marginTop: 22, marginBottom: 14 },
  trustRow:    { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  trustChip:   { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  trustText:   { fontSize: 10, fontWeight: '700' },
  langBtn:     { alignSelf: 'center', marginTop: 24, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999 },
  langText:    { fontSize: 13.5, fontWeight: '800' },
  footer:      { textAlign: 'center', marginTop: 18, fontSize: 12 },
})
