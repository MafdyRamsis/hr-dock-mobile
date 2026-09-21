import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import api from '../src/services/api'
import { useAuth } from '../src/context/AuthContext'
import { useLang } from '../src/context/LanguageContext'

// Shown when the account was created by an administrator (temporary password)
// or the company's password-expiry policy requires a new one.
export default function ChangePasswordRequired() {
  const { user, updateUser, logout } = useAuth()
  const { t } = useLang()
  const [current, setCurrent] = useState('')
  const [next,    setNext]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [show,    setShow]    = useState(false)
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)

  const submit = async () => {
    if (!current || !next || !confirm) { setError(t('fill_all')); return }
    if (next.length < 8) { setError(t('pw_min')); return }
    if (next !== confirm) { setError(t('pw_mismatch')); return }
    setError(''); setSaving(true)
    try {
      await api.post('/auth/change-password', { current_password: current, new_password: next })
      updateUser({ ...user, must_change_password: false })
    } catch (e) {
      setError(e.response?.data?.message || t('pw_failed'))
    } finally {
      setSaving(false)
    }
  }

  const field = (label, value, onChange) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  )

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.title}>{t('setpw_title')}</Text>
            <Text style={s.subtitle}>
              {t('setpw_sub')}
            </Text>

            {field(t('setpw_current'), current, setCurrent)}
            {field(t('setpw_new'), next, setNext)}
            {field(t('setpw_confirm'), confirm, setConfirm)}

            <View style={s.showRow}>
              <Text style={s.showText}>{t('show_passwords')}</Text>
              <Switch value={show} onValueChange={setShow} />
            </View>

            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} onPress={submit} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>{t('save_continue')}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={logout} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 13 }}>{t('sign_out')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#0F1829' },
  scroll:      { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card:        { backgroundColor: 'white', borderRadius: 24, padding: 28, elevation: 10 },
  title:       { fontSize: 22, fontWeight: '800', color: '#0F1829', marginBottom: 4 },
  subtitle:    { fontSize: 14, color: '#64748b', marginBottom: 24 },
  field:       { marginBottom: 16 },
  label:       { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:       { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1e293b', backgroundColor: '#fafafa' },
  showRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  showText:    { fontSize: 13, color: '#64748b' },
  errorBox:    { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginVertical: 12 },
  errorText:   { color: '#dc2626', fontSize: 13 },
  btn:         { backgroundColor: '#0F1829', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: 'white', fontSize: 16, fontWeight: '700' },
})
