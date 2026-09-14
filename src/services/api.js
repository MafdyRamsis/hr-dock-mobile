import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const DEFAULT_BASE_URL = 'https://hr-dock-backend-production.up.railway.app/api/v1'
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '')

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 })

api.interceptors.request.use(async (config) => {
  config.headers['X-HRDock-Channel'] = 'mobile'
  const token = await SecureStore.getItemAsync('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  async (err) => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('token')
      await SecureStore.deleteItemAsync('user')
    }
    return Promise.reject(err)
  }
)

export default api
