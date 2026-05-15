import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { useAuth } from '../../src/context/AuthContext'

export default function LoginScreen() {
  const { login, loginWithBiometric } = useAuth()
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
      setBiometricReady(hasHW && enrolled && hasToken)
    } catch {}
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim() || !workspace.trim()) { setError('Please fill in all fields.'); return }
    setError(''); setLoading(true)
    try {
      await SecureStore.setItemAsync('workspace', workspace.trim())
      await login(email.trim().toLowerCase(), password, workspace.trim())
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleBiometric = async () => {
    setError(''); setBioLoading(true)
    try {
      await loginWithBiometric()
    } catch (err) {
      setError(err.message || 'Biometric authentication failed.')
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
            <Text style={s.tagline}>Employee Self-Service</Text>
          </View>

          <View style={s.card}>
            <Text style={s.title}>Welcome back</Text>
            <Text style={s.subtitle}>Sign in to your account</Text>

            <View style={s.field}>
              <Text style={s.label}>Workspace</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. hrdock8620"
                placeholderTextColor="#94a3b8"
                value={workspace}
                onChangeText={setWorkspace}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Email address</Text>
              <TextInput
                style={s.input}
                placeholder="you@company.eg"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Password</Text>
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
                : <Text style={s.btnText}>Sign In</Text>
              }
            </TouchableOpacity>

            {biometricReady && (
              <>
                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>or</Text>
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
                          {Platform.OS === 'ios' ? 'Sign in with Face ID' : 'Sign in with Fingerprint'}
                        </Text>
                      </>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={s.footer}>HR Dock · Empowering Your Workforce</Text>
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
  footer:      { textAlign: 'center', marginTop: 32, color: 'rgba(255,255,255,0.3)', fontSize: 12 },
})
