import { render } from '@testing-library/react-native'
import StatusBadge from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders a known status with its semantic colour', () => {
    const { getByText } = render(<StatusBadge status="Approved" />)
    expect(getByText('Approved')).toHaveStyle({ color: '#166534' })
  })

  it('renders an unknown status safely', () => {
    const { getByText } = render(<StatusBadge status="Queued" />)
    expect(getByText('Queued')).toHaveStyle({ color: '#475569' })
  })
})
