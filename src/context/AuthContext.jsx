import { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { I18nManager } from 'react-native'
import api, { setAuthHandlers } from '../services/api'

// The app reloads on a language change, so the layout direction tells us the language.
const L = (en, ar) => (I18nManager.isRTL ? ar : en)

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,       setUser]       = useState(null)
  const [token,      setToken]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  // Set between a correct password and a correct 2FA code: { token, user }
  const [pending2fa, setPending2fa] = useState(null)
  // Mobile permissions set by HR/Admin (Fawry 2.7.0 parity). null = not
  // loaded yet → everything visible; the server enforces the switches anyway.
  const [features,   setFeatures]   = useState(null)
  const [cycleStartDay, setCycleStartDay] = useState(1)

  useEffect(() => {
    if (!token) { setFeatures(null); setCycleStartDay(1); return }
    let alive = true
    api.get('/mobile-access/me')
      .then(r => {
        const f = r.data?.data?.features || null
        if (alive) setFeatures(f)
        if (alive) setCycleStartDay(r.data?.data?.cycle_start_day || 1)
        if (f) SecureStore.setItemAsync('mobile_features', JSON.stringify(f)).catch(() => {})
      })
      .catch(async () => {
        // Offline: use the last known permissions.
        const cached = await SecureStore.getItemAsync('mobile_features').catch(() => null)
        if (alive && cached) setFeatures(JSON.parse(cached))
      })
    return () => { alive = false }
  }, [token])
  const can = (feature) => ['workforce_overview','payroll_forecast','performance_overview'].includes(feature)
    ? features?.[feature] === true : !features || features[feature] !== false

  // Keep UI state in step with what the API layer learns (expired session / expired password).
  useEffect(() => {
    setAuthHandlers({
      sessionExpired:  () => { setToken(null); setUser(null); setPending2fa(null) },
      passwordExpired: () => setUser(u => (u ? { ...u, must_change_password: true } : u)),
    })
    return () => setAuthHandlers({})
  }, [])

  useEffect(() => {
    const restore = async () => {
      try {
        const t = await SecureStore.getItemAsync('token')
        const u = await SecureStore.getItemAsync('user')
        if (t && u) {
          // App lock: when biometric unlock is enabled (and usable), do not restore the
          // session silently. The sign-in screen offers biometric unlock instead.
          const bioOn = (await SecureStore.getItemAsync('biometric_enabled')) === 'true'
          const usable = bioOn
            && (await LocalAuthentication.hasHardwareAsync())
            && (await LocalAuthentication.isEnrolledAsync())
          if (!usable) {
            const saved = JSON.parse(u)
            setToken(t); setUser(saved)
            // Sessions saved before sign-in returned employee_id / Arabic names: fill them in once,
            // otherwise every "my own record" screen finds nobody.
            if (!('employee_id' in saved) || !('first_name_ar' in saved)) {
              api.get('/auth/me').then(async r => {
                const me = r.data?.data || {}
                const next = { ...saved, employee_id: me.employee_id ?? null, first_name_ar: me.first_name_ar ?? null, last_name_ar: me.last_name_ar ?? null }
                setUser(next)
                await SecureStore.setItemAsync('user', JSON.stringify(next))
              }).catch(() => {})
            }
          }
        }
      } catch {}
      finally { setLoading(false) }
    }
    restore()
  }, [])

  const finishLogin = async (t, u) => {
    await SecureStore.setItemAsync('token', t)
    await SecureStore.setItemAsync('user', JSON.stringify(u))
    setToken(t)
    setUser(u)
    setPending2fa(null)
  }

  // Returns { requires2fa } — when true, call verify2fa(code) next.
  const login = async (email, password, company_id) => {
    const res = await api.post('/auth/login', { email, password, company_id })
    const { token: t, user: u, requires_2fa } = res.data.data
    if (requires_2fa) {
      setPending2fa({ token: t, user: u })
      return { requires2fa: true }
    }
    await finishLogin(t, u)
    return { requires2fa: false, user: u }
  }

  const verify2fa = async (code) => {
    if (!pending2fa) throw new Error(L('No sign-in in progress.', 'لا توجد عملية تسجيل دخول جارية.'))
    const res = await api.post(
      '/auth/2fa/validate',
      { code },
      { headers: { Authorization: `Bearer ${pending2fa.token}` } },
    )
    const fullToken = res.data?.token
    if (!fullToken) throw new Error(L('Verification failed. Please try again.', 'فشل التحقق. يرجى المحاولة مرة أخرى.'))
    await finishLogin(fullToken, pending2fa.user)
  }

  const cancel2fa = () => setPending2fa(null)

  // Restores the session from SecureStore after a successful biometric prompt.
  // Returns true on success, throws on failure.
  const loginWithBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:          L('Sign in to HR Dock', 'تسجيل الدخول إلى HR Dock'),
      fallbackLabel:          L('Use password', 'استخدم كلمة المرور'),
      disableDeviceFallback:  false,
    })
    if (!result.success) throw new Error(L('Fingerprint / face check did not succeed. Try again or sign in with your password.', 'لم ينجح التحقق بالبصمة أو الوجه. حاول مرة أخرى أو سجّل الدخول بكلمة المرور.'))
    const t = await SecureStore.getItemAsync('token')
    const u = await SecureStore.getItemAsync('user')
    if (!t || !u) throw new Error(L('No saved session. Please sign in with your password.', 'لا توجد جلسة محفوظة. يرجى تسجيل الدخول بكلمة المرور.'))
    // Make sure the saved session is still valid on the server (offline is allowed).
    try {
      await api.get('/auth/me', { headers: { Authorization: `Bearer ${t}` } })
    } catch (err) {
      if (err.response?.status === 401) {
        await SecureStore.deleteItemAsync('token')
        await SecureStore.deleteItemAsync('user')
        throw new Error(L('Your session has expired. Please sign in with your password.', 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول بكلمة المرور.'))
      }
    }
    setToken(t)
    setUser(JSON.parse(u))
    return true
  }

  const logout = async () => {
    // Best effort: stop pushes to this device and revoke the token server-side.
    try {
      await api.patch('/auth/push-token', { push_token: null }, { timeout: 4000 })
      await api.post('/auth/logout', null, { timeout: 4000 })
    } catch {}
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('user')
    await SecureStore.deleteItemAsync('mobile_features').catch(() => {})
    setToken(null)
    setUser(null)
    setPending2fa(null)
  }

  const updateUser = (u) => {
    setUser(u)
    SecureStore.setItemAsync('user', JSON.stringify(u))
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, pending2fa, login, verify2fa, cancel2fa, loginWithBiometric, logout, updateUser, features, can, cycleStartDay }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
