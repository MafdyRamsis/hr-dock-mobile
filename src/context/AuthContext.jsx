import { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import api, { setAuthHandlers } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,       setUser]       = useState(null)
  const [token,      setToken]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  // Set between a correct password and a correct 2FA code: { token, user }
  const [pending2fa, setPending2fa] = useState(null)

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
          if (!usable) { setToken(t); setUser(JSON.parse(u)) }
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
    if (!pending2fa) throw new Error('No sign-in in progress.')
    const res = await api.post(
      '/auth/2fa/validate',
      { code },
      { headers: { Authorization: `Bearer ${pending2fa.token}` } },
    )
    const fullToken = res.data?.token
    if (!fullToken) throw new Error('Verification failed. Please try again.')
    await finishLogin(fullToken, pending2fa.user)
  }

  const cancel2fa = () => setPending2fa(null)

  // Restores the session from SecureStore after a successful biometric prompt.
  // Returns true on success, throws on failure.
  const loginWithBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:          'Sign in to HR Dock',
      fallbackLabel:          'Use password',
      disableDeviceFallback:  false,
    })
    if (!result.success) throw new Error(result.error || 'Biometric authentication failed')
    const t = await SecureStore.getItemAsync('token')
    const u = await SecureStore.getItemAsync('user')
    if (!t || !u) throw new Error('No saved session. Please sign in with your password.')
    // Make sure the saved session is still valid on the server (offline is allowed).
    try {
      await api.get('/auth/me', { headers: { Authorization: `Bearer ${t}` } })
    } catch (err) {
      if (err.response?.status === 401) {
        await SecureStore.deleteItemAsync('token')
        await SecureStore.deleteItemAsync('user')
        throw new Error('Your session has expired. Please sign in with your password.')
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
    setToken(null)
    setUser(null)
    setPending2fa(null)
  }

  const updateUser = (u) => {
    setUser(u)
    SecureStore.setItemAsync('user', JSON.stringify(u))
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, pending2fa, login, verify2fa, cancel2fa, loginWithBiometric, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
