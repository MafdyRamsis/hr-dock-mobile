import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../src/context/AuthContext'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError('Please enter your email and password.'); return }
    setError(''); setLoading(true)
    try {
      await login(email.trim().toLowerCase(), password)
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logoArea}>
            <View style={s.logoBox}>
              <Text style={s.logoHR}>HR</Text>
              <Text style={s.logoDock}>Dock</Text>
            </View>
            <Text style={s.tagline}>Employee Self-Service</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.title}>Welcome back</Text>
            <Text style={s.subtitle}>Sign in to your account</Text>

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
  footer:      { textAlign: 'center', marginTop: 32, color: 'rgba(255,255,255,0.3)', fontSize: 12 },
})
