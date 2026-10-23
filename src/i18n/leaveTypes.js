// Leave type name in the reader's language. The server sends the company's own
// Arabic name (name_ar / leave_type_name_ar); known English names are translated
// when it is missing; anything else is shown as sent.
const KNOWN = {
  annual:    ['Annual Leave', 'إجازة سنوية', 'إجازة اعتيادي'],
  casual:    ['Casual Leave', 'إجازة عارضة'],
  sick:      ['Sick Leave', 'إجازة مرضية'],
  unpaid:    ['Unpaid Leave', 'إجازة بدون أجر', 'إجازة من غير مرتب'],
  maternity: ['Maternity Leave', 'إجازة وضع'],
  paternity: ['Paternity Leave', 'إجازة أبوة'],
  emergency: ['Emergency Leave', 'إجازة طارئة'],
  hajj:      ['Hajj Leave', 'إجازة حج'],
  'rest day': ['Rest Day', 'يوم راحة'],
  wfh:       ['Work from Home', 'العمل من المنزل', 'شغل من البيت'],
  'work from home': ['Work from Home', 'العمل من المنزل', 'شغل من البيت'],
}

export function leaveTypeName(v, { ar, tr }) {
  const name = typeof v === 'string' ? v : (v?.leave_type_name || v?.name || v?.leave_type || '')
  const nameAr = typeof v === 'string' ? null : (v?.leave_type_name_ar || v?.name_ar)
  if (ar && nameAr) return nameAr
  const k = String(name).toLowerCase().replace(/\s*leave$/, '').trim()
  const known = KNOWN[k] || KNOWN[String(name).toLowerCase().trim()]
  return known ? tr(known[0], known[1], known[2]) : name
}
