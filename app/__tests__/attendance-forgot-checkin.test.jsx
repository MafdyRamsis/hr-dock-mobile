import React from 'react'
import { Alert } from 'react-native'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import Attendance from '../(tabs)/attendance'
import api from '../../src/services/api'

let mockRouter, mockLogs
jest.mock('../../src/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', employee_id: 'emp-1', role: 'employee' }, can: () => true, cycleStartDay: 1 }) }))
jest.mock('../../src/context/LanguageContext', () => ({ useLang: () => ({ tr: en => en, ar: false, date: v => String(v), day: v => String(v), monthYear: () => 'Nov 2026' }) }))
jest.mock('../../src/context/ThemeContext', () => ({
  GRADIENTS: { mint: ['#0f0', '#0f0'], coral: ['#f00', '#f00'], hero: ['#000', '#000'], primary: ['#000', '#000'] },
  useTheme: () => ({ colors: { bg: '#F5F4F0', card: '#fff', cardAlt: '#eee', text: '#132940', sub: '#56657A', muted: '#888', border: '#E3E1DA', input: '#fff', primary: '#0E7C83', primarySoft: '#E6F6F7' } }),
}))
jest.mock('../../src/services/api', () => ({ get: jest.fn(), post: jest.fn() }))
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: async () => ({ status: 'denied' }) }))
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }) => children }))
jest.mock('../../src/utils/punchQueue', () => ({
  enqueuePunch: jest.fn(), flushPunches: jest.fn(async () => ({ sent: 0 })), pendingPunches: jest.fn(async () => []),
  isRetryable: () => false, uuidv4: () => 'id-1',
}))

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

beforeEach(() => {
  mockRouter = { push: jest.fn() }
  mockLogs = []
  api.get.mockReset(); api.post.mockReset()
  api.get.mockImplementation(async () => ({ data: { data: mockLogs } }))
  jest.spyOn(Alert, 'alert').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

test('with no check-in, the employee can still check out (after confirming) and is offered a missed-punch request', async () => {
  api.post.mockResolvedValue({ status: 200, data: { data: {} } })
  render(<Attendance />)
  fireEvent.press(await screen.findByText(/Forgot to check in\? Check out now/))
  const [, , buttons] = Alert.alert.mock.calls[0]
  buttons.find(b => b.text === 'Check out').onPress()
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/attendance/check-out', expect.objectContaining({ source: 'mobile' })))
  await waitFor(() => expect(Alert.alert.mock.calls.length).toBe(2))
  const [title, , next] = Alert.alert.mock.calls[1]
  expect(title).toBe('Check-out saved')
  next.find(b => b.text === 'Request now').onPress()
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/request-form', params: { type: 'missed' } })
})

test('after a check-out without check-in, Check In is gone and the missed-punch link shows', async () => {
  mockLogs = [{ employee_id: 'emp-1', date: todayStr(), check_in: null, check_out: new Date().toISOString(), status: 'present' }]
  render(<Attendance />)
  expect(await screen.findByText(/no check-in today/)).toBeTruthy()
  expect(screen.queryByText(/Forgot to check in/)).toBeNull()
  expect(screen.queryByText('Check In', { exact: true })).toBeTruthy() // the time-box label only
})
