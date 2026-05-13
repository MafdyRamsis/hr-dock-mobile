import { View, Text } from 'react-native'

const MAP = {
  active:    { bg: '#dcfce7', text: '#166534' },
  approved:  { bg: '#dcfce7', text: '#166534' },
  pending:   { bg: '#fef9c3', text: '#854d0e' },
  rejected:  { bg: '#fee2e2', text: '#991b1b' },
  cancelled: { bg: '#f1f5f9', text: '#475569' },
  present:   { bg: '#dcfce7', text: '#166534' },
  absent:    { bg: '#fee2e2', text: '#991b1b' },
  late:      { bg: '#fef9c3', text: '#854d0e' },
  open:      { bg: '#eff6ff', text: '#1e3a8a' },
  closed:    { bg: '#f1f5f9', text: '#475569' },
  'in-progress': { bg: '#eff6ff', text: '#1e3a8a' },
}

export default function StatusBadge({ status }) {
  const s = status?.toLowerCase().replace(/ /g, '-') || ''
  const c = MAP[s] || { bg: '#f1f5f9', text: '#475569' }
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.text, textTransform: 'capitalize' }}>
        {status}
      </Text>
    </View>
  )
}
