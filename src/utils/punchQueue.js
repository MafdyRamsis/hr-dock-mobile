// Attendance resilience mode (Fawry 2.7.0 parity): when a check-in/out can't
// reach the server, the punch is kept on the phone and sent automatically
// once the connection is back.
//
//  - Every punch gets a client_punch_id up front; the server de-duplicates on
//    it, so a retry after a timeout can never create a second punch.
//  - The device time and GPS are captured at the moment of the tap, not when
//    the punch finally syncs.
//  - Two taps of the same kind within a minute are stored once.
//  - A punch the server answers (accepted OR sent to HR review, 2xx/4xx) is
//    removed from the queue; only network failures / 5xx are retried.
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'hrdock_offline_punches_v1'
const DUP_WINDOW_MS = 60 * 1000

// RFC 4122 v4 (Math.random is fine for an idempotency key).
export const uuidv4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
})

async function readAll() {
  try { return JSON.parse(await AsyncStorage.getItem(KEY)) || [] } catch { return [] }
}
async function writeAll(items) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(items)) } catch {}
}

export async function pendingPunches(userId) {
  return (await readAll()).filter(p => !userId || p.user_id === userId)
}

// Returns the stored punch (or the existing one when it is a duplicate tap).
export async function enqueuePunch(userId, punch) {
  const items = await readAll()
  const t = Date.parse(punch.device_time)
  const dup = items.find(p => p.user_id === userId && p.kind === punch.kind && Math.abs(Date.parse(p.device_time) - t) < DUP_WINDOW_MS)
  if (dup) return dup
  const item = { ...punch, user_id: userId, client_punch_id: punch.client_punch_id || uuidv4(), queued_at: new Date().toISOString(), attempts: 0 }
  items.push(item)
  await writeAll(items)
  return item
}

// Network failure or a server error worth retrying?
export const isRetryable = err => !err?.response || err.response.status >= 500 || err.code === 'ECONNABORTED'

// Sends queued punches oldest-first. `post(path, body)` is the API client's
// post. Returns { sent, review, failed, remaining }.
export async function flushPunches(userId, post) {
  const items = await readAll()
  const mine = items.filter(p => p.user_id === userId).sort((a, b) => Date.parse(a.device_time) - Date.parse(b.device_time))
  const result = { sent: 0, review: 0, failed: 0, remaining: 0, messages: [] }
  const keep = items.filter(p => p.user_id !== userId)
  for (const p of mine) {
    try {
      const res = await post(p.kind === 'check_out' ? '/attendance/check-out' : '/attendance/check-in', {
        source: 'mobile', captured_offline: true, client_punch_id: p.client_punch_id, device_time: p.device_time,
        location_lat: p.location_lat, location_lng: p.location_lng, location_name: p.location_name, is_mock_location: p.is_mock_location,
      })
      if (res?.status === 202 || res?.data?.data?.punch_status === 'pending_review') { result.review++; result.messages.push(res.data?.message) }
      else result.sent++
    } catch (err) {
      if (isRetryable(err)) { keep.push({ ...p, attempts: (p.attempts || 0) + 1 }); result.remaining++ }
      else { result.failed++; result.messages.push(err.response?.data?.message) }
    }
  }
  await writeAll(keep)
  return result
}

export async function clearPunches(userId) {
  await writeAll((await readAll()).filter(p => p.user_id !== userId))
}
