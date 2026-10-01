jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {}
  return {
    getItem: jest.fn(async k => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k, v) => { store[k] = v }),
    __reset: () => { store = {} },
  }
})
import AsyncStorage from '@react-native-async-storage/async-storage'
import { enqueuePunch, flushPunches, pendingPunches, uuidv4, isRetryable } from '../punchQueue'

const at = min => new Date(Date.UTC(2026, 9, 1, 6, min)).toISOString()

describe('offline punch queue', () => {
  beforeEach(() => AsyncStorage.__reset())

  it('generates v4 uuids', () => {
    expect(uuidv4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('stores a double tap only once and keeps users apart', async () => {
    const a = await enqueuePunch('u1', { kind: 'check_in', device_time: at(0) })
    const b = await enqueuePunch('u1', { kind: 'check_in', device_time: at(0) })
    await enqueuePunch('u2', { kind: 'check_in', device_time: at(0) })
    expect(b.client_punch_id).toBe(a.client_punch_id)
    expect(await pendingPunches('u1')).toHaveLength(1)
    expect(await pendingPunches('u2')).toHaveLength(1)
  })

  it('sends oldest first with the same id and device time, keeps network failures', async () => {
    await enqueuePunch('u1', { kind: 'check_out', device_time: at(30) })
    await enqueuePunch('u1', { kind: 'check_in', device_time: at(0), location_lat: 30, location_lng: 31 })
    const calls = []
    const post = jest.fn(async (path, body) => {
      calls.push([path, body])
      if (path.endsWith('check-out')) { const e = new Error('Network Error'); throw e }
      return { status: 201, data: { data: {} } }
    })
    const r = await flushPunches('u1', post)
    expect(calls[0][0]).toBe('/attendance/check-in')
    expect(calls[0][1]).toMatchObject({ source: 'mobile', captured_offline: true, device_time: at(0), location_lat: 30 })
    expect(r).toMatchObject({ sent: 1, remaining: 1 })
    const left = await pendingPunches('u1')
    expect(left).toHaveLength(1)
    expect(left[0].attempts).toBe(1)
  })

  it('drops punches the server answered, including ones sent to HR review', async () => {
    await enqueuePunch('u1', { kind: 'check_in', device_time: at(0) })
    await enqueuePunch('u1', { kind: 'check_out', device_time: at(40) })
    const post = jest.fn()
      .mockResolvedValueOnce({ status: 202, data: { data: { punch_status: 'pending_review' }, message: 'Sent to HR' } })
      .mockRejectedValueOnce({ response: { status: 422, data: { message: 'No open check-in' } } })
    const r = await flushPunches('u1', post)
    expect(r).toMatchObject({ review: 1, failed: 1, remaining: 0 })
    expect(await pendingPunches('u1')).toHaveLength(0)
  })

  it('classifies retryable errors', () => {
    expect(isRetryable(new Error('Network Error'))).toBe(true)
    expect(isRetryable({ response: { status: 503 } })).toBe(true)
    expect(isRetryable({ response: { status: 403 } })).toBe(false)
  })
})
