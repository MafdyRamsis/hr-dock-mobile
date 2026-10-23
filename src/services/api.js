import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { I18nManager } from 'react-native'

const DEFAULT_BASE_URL = 'https://api.hr-dock.com/api/v1'
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '')

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 })

// AuthContext registers these so the UI state follows what the server says.
let onSessionExpired = null
let onPasswordExpired = null
export const setAuthHandlers = ({ sessionExpired, passwordExpired } = {}) => {
  onSessionExpired = sessionExpired || null
  onPasswordExpired = passwordExpired || null
}

// 401s from these endpoints are expected failures (wrong password / wrong code), not an expired session.
const AUTH_FLOW_URLS = ['/auth/login', '/auth/change-password', '/auth/2fa/', '/auth/logout']

api.interceptors.request.use(async (config) => {
  config.headers['X-HRDock-Channel'] = 'mobile'
  const token = await SecureStore.getItemAsync('token')
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Arabic app: the server sends message_ar with its confirmations too
// ("Sent for review", "Request submitted"…); show that instead of English.
const arabicMessage = d => {
  if (d && typeof d === 'object' && d.message_ar && I18nManager.isRTL) {
    d.message_en = d.message
    d.message = d.message_ar
  }
}

api.interceptors.response.use(
  r => { arabicMessage(r?.data); return r },
  async (err) => {
    const status = err.response?.status
    const url = err.config?.url || ''
    if (status === 401 && !AUTH_FLOW_URLS.some(u => url.startsWith(u))) {
      await SecureStore.deleteItemAsync('token')
      await SecureStore.deleteItemAsync('user')
      if (onSessionExpired) onSessionExpired()
    }
    if (status === 403 && /password has expired/i.test(err.response?.data?.message || '')) {
      if (onPasswordExpired) onPasswordExpired()
    }
    // Arabic app: show the server's Arabic message when it sent one (screens
    // display response.data.message). The app reloads on a language change, so
    // the layout direction tells us the language. Done after the English checks.
    const d = err.response?.data
    if (d && d.message_ar && I18nManager.isRTL) {
      d.message_en = d.message
      d.message = d.message_ar
    }
    return Promise.reject(err)
  }
)

export default api
