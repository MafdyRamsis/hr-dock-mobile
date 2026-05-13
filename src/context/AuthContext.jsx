import { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
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

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token: t, user: u } = res.data
    await SecureStore.setItemAsync('token', t)
    await SecureStore.setItemAsync('user', JSON.stringify(u))
    setToken(t)
    setUser(u)
    return u
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
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
