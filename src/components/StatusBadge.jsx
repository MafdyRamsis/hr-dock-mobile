import { View, Text } from 'react-native'

const MAP = {
  active:    { bg: '#E3FBF3', text: '#0E9F6E' },
  approved:  { bg: '#E3FBF3', text: '#0E9F6E' },
  pending:   { bg: '#FFF6DD', text: '#B77A00' },
  rejected:  { bg: '#FFE9E6', text: '#E14F4A' },
  cancelled: { bg: '#F1F1F8', text: '#6B6E85' },
  present:   { bg: '#E3FBF3', text: '#0E9F6E' },
  absent:    { bg: '#FFE9E6', text: '#E14F4A' },
  late:      { bg: '#FFF6DD', text: '#B77A00' },
  open:      { bg: '#F1E9FC', text: '#8854D0' },
  closed:    { bg: '#F1F1F8', text: '#6B6E85' },
  'in-progress': { bg: '#F1E9FC', text: '#8854D0' },
}

export default function StatusBadge({ status }) {
  const s = status?.toLowerCase().replace(/ /g, '-') || ''
  const c = MAP[s] || { bg: '#F1F1F8', text: '#6B6E85' }
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.text, textTransform: 'capitalize' }}>
        {status}
      </Text>
    </View>
  )
}
