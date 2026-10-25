import React from 'react'
import { Alert } from 'react-native'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import RequestForm from '../request-form'
import NewRequest from '../new-request'
import Requests from '../(tabs)/requests'
import api from '../../src/services/api'

let mockAuth, mockParams, mockRouter
jest.mock('../../src/context/AuthContext', () => ({ useAuth: () => mockAuth }))
jest.mock('../../src/context/LanguageContext', () => ({ useLang: () => ({ tr: en => en, ar: false, date: v => v }) }))
jest.mock('../../src/context/ThemeContext', () => ({ useTheme: () => ({ colors: { bg: '#F5F4F0', card: '#fff', cardAlt: '#eee', text: '#132940', sub: '#56657A', muted: '#888', border: '#E3E1DA', input: '#fff', primary: '#0E7C83', primarySoft: '#E6F6F7' } }) }))
jest.mock('../../src/services/api', () => ({ get: jest.fn(), post: jest.fn(), patch: jest.fn() }))
jest.mock('expo-router', () => {
  const R = require('react')
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
    useFocusEffect: cb => R.useEffect(cb, [cb]),
  }
})
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }))

beforeEach(() => {
  mockAuth = { user: { id: 'u1', employee_id: 'emp-1', role: 'employee' }, can: () => true }
  mockParams = {}
  mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }
  api.get.mockReset(); api.post.mockReset(); api.patch.mockReset()
  api.get.mockResolvedValue({ data: { data: [] } })
  jest.spyOn(Alert, 'alert').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

test('New request lists Work mission and opens its form', () => {
  render(<NewRequest />)
  expect(screen.getByText('Time off')).toBeTruthy()
  fireEvent.press(screen.getByText('Work mission'))
  expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/request-form', params: { type: 'mission' } })
})

test('a full-day mission is sent to the missions API and the list opens on Pending', async () => {
  mockParams = { type: 'mission' }
  api.post.mockResolvedValue({ data: { data: { id: 'm1' } } })
  render(<RequestForm />)
  fireEvent.press(screen.getByText('Full day(s)'))
  fireEvent.changeText(screen.getByLabelText('Where'), 'Smart Village')
  fireEvent.press(screen.getByText('Submit mission'))
  await waitFor(() => expect(api.post).toHaveBeenCalled())
  const [path, body] = api.post.mock.calls[0]
  expect(path).toBe('/attendance/missions')
  expect(body).toMatchObject({ employee_id: 'emp-1', is_full_day: true, destination: 'Smart Village' })
  expect(body).not.toHaveProperty('from_time')
  expect(mockRouter.replace).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/(tabs)/requests', params: expect.objectContaining({ filter: 'pending' }) }))
})

test('the form shows what is missing instead of sending', async () => {
  mockParams = { type: 'mission' }
  render(<RequestForm />)
  fireEvent.press(screen.getByText('Submit mission'))
  expect(await screen.findByText(/Please fill in/)).toBeTruthy()
  expect(api.post).not.toHaveBeenCalled()
})

test('a request type switched off by HR cannot be opened', () => {
  mockParams = { type: 'expense' }
  mockAuth.can = f => f !== 'expenses'
  render(<RequestForm />)
  expect(screen.getByText(/not available for your account/)).toBeTruthy()
})

test('Requests shows missions and leave together, only my own', async () => {
  api.get.mockImplementation(path => {
    if (path.startsWith('/attendance/missions')) return Promise.resolve({ data: { data: [
      { id: 'm1', employee_id: 'emp-1', status: 'pending', date: '2026-10-25', is_full_day: true, destination: 'Smart Village', created_at: '2026-10-25T09:00:00Z' },
      { id: 'm2', employee_id: 'other', status: 'pending', date: '2026-10-25', destination: 'Secret', created_at: '2026-10-25T10:00:00Z' },
    ] } })
    if (path.startsWith('/leave/requests')) return Promise.resolve({ data: { data: [
      { id: 'l1', employee_id: 'emp-1', status: 'approved', leave_type_name: 'Annual Leave', start_date: '2026-10-01', end_date: '2026-10-02', created_at: '2026-09-20T09:00:00Z' },
    ] } })
    return Promise.resolve({ data: { data: [] } })
  })
  render(<Requests />)
  expect(await screen.findByText('Work mission')).toBeTruthy()
  expect(screen.getByText('Annual Leave')).toBeTruthy()
  expect(screen.queryByText(/Secret/)).toBeNull()
  fireEvent.press(screen.getByText('Approved · 1'))
  expect(screen.queryByText('Work mission')).toBeNull()
  expect(screen.getByText('Annual Leave')).toBeTruthy()
})
