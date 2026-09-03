import { fireEvent, render, waitFor } from '@testing-library/react-native'
import LoginScreen from '../index'

const mockLogin = jest.fn()

jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, loginWithBiometric: jest.fn() }),
}))

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}))

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
  authenticateAsync: jest.fn(),
}))

describe('LoginScreen', () => {
  beforeEach(() => mockLogin.mockReset())

  it('requires all login fields', async () => {
    const { getByText } = render(<LoginScreen />)
    fireEvent.press(getByText('Sign In'))
    expect(getByText('Please fill in all fields.')).toBeTruthy()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('normalizes credentials and sends the workspace', async () => {
    mockLogin.mockResolvedValue({ id: 1 })
    const { getByPlaceholderText, getByText } = render(<LoginScreen />)
    fireEvent.changeText(getByPlaceholderText('e.g. hrdock8620'), 'tenant-one')
    fireEvent.changeText(getByPlaceholderText('you@company.eg'), 'USER@EXAMPLE.COM')
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'secret123')
    fireEvent.press(getByText('Sign In'))
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret123', 'tenant-one'))
  })
})
