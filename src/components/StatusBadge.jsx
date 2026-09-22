import { View, Text } from 'react-native'

/* Semantic colors matched to the web app's Tailwind-based palette —
   rendered as a translucent tint of the solid color so the same values
   read correctly on both a white (light) and slate (dark) card without
   needing separate light/dark maps. */
const MAP = {
  active:    '#059669',
  approved:  '#059669',
  pending:   '#D97706',
  rejected:  '#DC2626',
  cancelled: '#64748B',
  present:   '#059669',
  absent:    '#DC2626',
  late:      '#D97706',
  open:      '#6366F1',
  closed:    '#64748B',
  'in-progress': '#6366F1',
}

export default function StatusBadge({ status }) {
  const s = status?.toLowerCase().replace(/ /g, '-') || ''
  const c = MAP[s] || '#64748B'
  return (
    <View style={{ backgroundColor: `${c}26`, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c, textTransform: 'capitalize' }}>
        {status}
      </Text>
    </View>
  )
}
