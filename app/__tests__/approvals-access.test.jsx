import { pushTarget } from '../../src/utils/notifications'

jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }))
jest.mock('expo-device', () => ({}))
jest.mock('expo-constants', () => ({ expoConfig: {} }))
jest.mock('../../src/services/api', () => ({ patch: jest.fn() }))

describe('push taps open the right screen', () => {
  it('sends approval pushes to Approvals', () => {
    expect(pushTarget('approval_requested')).toBe('/(tabs)/approvals')
    expect(pushTarget('approval_escalated')).toBe('/(tabs)/approvals')
  })
  it('keeps decisions on Requests and the rest on Notifications', () => {
    expect(pushTarget('leave_decided')).toBe('/(tabs)/requests')
    expect(pushTarget('announcement')).toBe('/notifications')
    expect(pushTarget(undefined)).toBe('/notifications')
  })
})
