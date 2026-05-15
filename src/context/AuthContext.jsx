import { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restore = async () => {
      try {
        const t = await SecureStore.getItemAsync('token')
        const u = await SecureStore.getItemAsync('user')
        if (t && u) { setToken(t); setUser(JSON.parse(u)) }
      } catch {}
      finally { setLoading(false) }
    }
    restore()
  }, [])

  const login = async (email, password, company_id) => {
    const res = await api.post('/auth/login', { email, password, company_id })
    const { token: t, user: u } = res.data.data
    await SecureStore.setItemAsync('token', t)
    await SecureStore.setItemAsync('user', JSON.stringify(u))
    setToken(t)
    setUser(u)
    return u
  }

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
    setToken(t)
    setUser(JSON.parse(u))
  }

  const logout = async () => {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('user')
    setToken(null)
    setUser(null)
  }

  const updateUser = (u) => {
    setUser(u)
    SecureStore.setItemAsync('user', JSON.stringify(u))
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithBiometric, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
