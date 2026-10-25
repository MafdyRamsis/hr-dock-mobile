// Form building blocks for the request screens, in the web app's style:
// white fields with a light border on the sand page, navy text, teal for
// what is selected. Each field has a visible label (also read by screen
// readers) and a 48pt touch target.
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, Platform, ScrollView, StyleSheet } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTheme } from '../context/ThemeContext'
import { useLang } from '../context/LanguageContext'
import { localDateOf } from '../i18n/format'
import { IS_RTL } from '../utils/rtl'

export function ScreenHeader({ title, subtitle, onBack, right }) {
  const { colors } = useTheme()
  const { tr } = useLang()
  const router = useRouter()
  return (
    <View style={{ paddingHorizontal: 8, paddingTop: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          accessibilityRole="button" accessibilityLabel={tr('Back', 'رجوع')}
          onPress={onBack || (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/requests')))}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name={IS_RTL ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 20, fontWeight: '700', color: colors.text }} numberOfLines={1}>{title}</Text>
        {right}
      </View>
      {!!subtitle && <Text style={{ marginHorizontal: 12, marginTop: 2, fontSize: 13, lineHeight: 19, color: colors.sub }}>{subtitle}</Text>}
    </View>
  )
}

function useBox() {
  const { colors } = useTheme()
  return {
    colors,
    label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 },
    box: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: 14, justifyContent: 'center' },
    value: { fontSize: 15, color: colors.text },
    placeholder: { fontSize: 15, color: colors.muted },
  }
}

export function Field({ label, children, style }) {
  const b = useBox()
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {!!label && <Text style={b.label}>{label}</Text>}
      {children}
    </View>
  )
}

export function TextField({ label, value, onChange, placeholder, multiline, keyboardType, maxLength, style }) {
  const b = useBox()
  return (
    <Field label={label} style={style}>
      <TextInput
        accessibilityLabel={label}
        value={value == null ? '' : String(value)}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={b.colors.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        textAlign={IS_RTL ? 'right' : 'left'}
        style={[b.box, b.value, multiline && { minHeight: 92, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' }]}
      />
    </Field>
  )
}

const toDate = (iso, time) => {
  if (time) { const d = new Date(); const [h, m] = String(time).split(':').map(Number); d.setHours(h || 9, m || 0, 0, 0); return d }
  if (iso) { const [y, mo, d] = iso.split('-').map(Number); return new Date(y, mo - 1, d) }
  return new Date()
}
const hhmm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

// Date or time. Android opens the system dialog; iOS shows a sheet with Done.
export function DateField({ label, value, onChange, mode = 'date', style }) {
  const b = useBox()
  const { tr, date } = useLang()
  const [open, setOpen] = useState(false)
  const [temp, setTemp] = useState(null)
  const isTime = mode === 'time'
  const current = isTime ? toDate(null, value) : toDate(value)
  const shown = value ? (isTime ? value : date(value, { weekday: 'short' })) : ''
  const commit = d => onChange(isTime ? hhmm(d) : localDateOf(d))
  return (
    <Field label={label} style={style}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${label}${shown ? `, ${shown}` : ''}`}
        onPress={() => { setTemp(current); setOpen(true) }}
        style={[b.box, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
      >
        <Text style={shown ? b.value : b.placeholder}>{shown || (isTime ? tr('Choose time', 'اختر الوقت') : tr('Choose date', 'اختر التاريخ'))}</Text>
        <Ionicons name={isTime ? 'time-outline' : 'calendar-outline'} size={18} color={b.colors.sub} />
      </TouchableOpacity>
      {open && Platform.OS === 'android' && (
        <DateTimePicker value={current} mode={mode} is24Hour onChange={(e, d) => { setOpen(false); if (e.type === 'set' && d) commit(d) }} />
      )}
      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19,41,64,0.35)' }}>
            <View style={{ backgroundColor: b.colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 28 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14 }}>
                <TouchableOpacity onPress={() => setOpen(false)} accessibilityRole="button"><Text style={{ fontSize: 16, color: b.colors.sub }}>{tr('Cancel', 'إلغاء')}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { commit(temp || current); setOpen(false) }} accessibilityRole="button"><Text style={{ fontSize: 16, fontWeight: '700', color: b.colors.primary }}>{tr('Done', 'تم')}</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={temp || current} mode={mode} display="spinner" is24Hour onChange={(e, d) => d && setTemp(d)} />
            </View>
          </View>
        </Modal>
      )}
    </Field>
  )
}

// A list to pick one option from, opened as a sheet.
export function SelectField({ label, value, options = [], onChange, loading, emptyText, style }) {
  const b = useBox()
  const { tr } = useLang()
  const [open, setOpen] = useState(false)
  const sel = options.find(o => o.value === value)
  return (
    <Field label={label} style={style}>
      <TouchableOpacity
        accessibilityRole="button" accessibilityLabel={`${label}${sel ? `, ${sel.label}` : ''}`}
        disabled={loading} onPress={() => setOpen(true)}
        style={[b.box, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
      >
        <Text style={sel ? b.value : b.placeholder} numberOfLines={1}>
          {sel ? sel.label : loading ? tr('Loading…', 'جارٍ التحميل…') : options.length ? tr('Choose', 'اختر') : (emptyText || tr('Nothing to choose', 'لا توجد اختيارات'))}
        </Text>
        <Ionicons name="chevron-down" size={18} color={b.colors.sub} />
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: b.colors.bg }}>
          <ScreenHeader title={label} onBack={() => setOpen(false)} />
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {!options.length && <Text style={{ color: b.colors.sub, fontSize: 14 }}>{emptyText || tr('Nothing to choose', 'لا توجد اختيارات')}</Text>}
            <View style={{ backgroundColor: b.colors.card, borderRadius: 14, borderWidth: options.length ? 1 : 0, borderColor: b.colors.border, overflow: 'hidden' }}>
              {options.map((o, i) => {
                const on = o.value === value
                return (
                  <TouchableOpacity key={String(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                    onPress={() => { onChange(o.value); setOpen(false) }}
                    style={{ minHeight: 52, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: b.colors.border }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: on ? '700' : '500', color: b.colors.text }}>{o.label}</Text>
                      {!!o.hint && <Text style={{ fontSize: 12, color: b.colors.sub, marginTop: 2 }}>{o.hint}</Text>}
                    </View>
                    {on && <Ionicons name="checkmark" size={20} color={b.colors.primary} />}
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </Field>
  )
}

// Two to four choices side by side (Part of the day | Full day).
export function Segment({ label, value, options, onChange, style }) {
  const b = useBox()
  return (
    <Field label={label} style={style}>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', backgroundColor: b.colors.card, borderWidth: 1, borderColor: b.colors.border, borderRadius: 12, padding: 4 }}>
        {options.map(o => {
          const on = o.value === value
          return (
            <TouchableOpacity key={String(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
              style={{ flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, backgroundColor: on ? b.colors.text : 'transparent' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: on ? b.colors.card : b.colors.sub, textAlign: 'center' }} numberOfLines={1}>{o.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </Field>
  )
}

export function PrimaryButton({ label, onPress, disabled, loading, style }) {
  const { colors } = useTheme()
  const { tr } = useLang()
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !!(disabled || loading) }} disabled={disabled || loading} onPress={onPress}
      style={[{ height: 52, borderRadius: 14, backgroundColor: colors.isDark ? colors.primary : colors.text, alignItems: 'center', justifyContent: 'center', opacity: disabled || loading ? 0.6 : 1 }, style]}>
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{loading ? tr('Sending…', 'جارٍ الإرسال…') : label}</Text>
    </TouchableOpacity>
  )
}
