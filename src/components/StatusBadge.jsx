import { View, Text } from 'react-native'

/* Electric semantic colors — rendered as a translucent tint of the solid
   color so the same values read correctly on both a white (light) and
   near-black (dark) card without needing separate light/dark maps. */
const MAP = {
  active:    '#22D3D8',
  approved:  '#22D3D8',
  pending:   '#FFB020',
  rejected:  '#FF4D8D',
  cancelled: '#8B90AC',
  present:   '#22D3D8',
  absent:    '#FF4D8D',
  late:      '#FFB020',
  open:      '#B26CFF',
  closed:    '#8B90AC',
  'in-progress': '#B26CFF',
}

export default function StatusBadge({ status }) {
  const s = status?.toLowerCase().replace(/ /g, '-') || ''
  const c = MAP[s] || '#8B90AC'
  return (
    <View style={{ backgroundColor: `${c}26`, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c, textTransform: 'capitalize' }}>
        {status}
      </Text>
    </View>
  )
}
