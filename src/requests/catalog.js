// Every request an employee (or manager) can make from the phone, in one
// place: how it is grouped on the "New request" screen, which fields its form
// has, which API call submits it, and how its rows come back into the single
// "Requests" list. Text is [English, Arabic]; screens pass it through tr().
//
// Endpoints and payloads mirror the web app's Requests page
// (hr-dock-frontend/src/pages/Requests.jsx) so both apps send the same thing.

const L = (en, ar) => [en, ar]

export const GROUPS = [
  { key: 'time', title: L('Time off', 'الإجازات'), tint: '#E6F6F7', ink: '#0E6A70' },
  { key: 'work', title: L('Attendance & work', 'الحضور والعمل'), tint: '#EEF1F6', ink: '#132940' },
  { key: 'money', title: L('Money', 'المالية'), tint: '#FFF4DE', ink: '#8A5A00' },
  { key: 'hr', title: L('HR & documents', 'الموارد البشرية والمستندات'), tint: '#FFEDEA', ink: '#9E3322' },
  { key: 'team', title: L('For my team', 'لفريقي'), tint: '#EEF1F6', ink: '#3E5E80' },
]

const LEADS = ['manager', 'admin', 'hr_manager']

export const OVERTIME_TYPES = [
  { value: 'weekday', label: L('Working day', 'يوم عمل') },
  { value: 'weekend', label: L('Weekend', 'عطلة أسبوعية') },
  { value: 'holiday', label: L('Public holiday', 'عطلة رسمية') },
  { value: 'night', label: L('Night', 'ليلي') },
]
export const EXPENSE_CATEGORIES = [
  { value: 'travel', label: L('Travel', 'انتقالات') },
  { value: 'accommodation', label: L('Accommodation', 'إقامة') },
  { value: 'meals', label: L('Meals', 'وجبات') },
  { value: 'office_supplies', label: L('Office supplies', 'أدوات مكتبية') },
  { value: 'training', label: L('Training', 'تدريب') },
  { value: 'communication', label: L('Phone & internet', 'اتصالات') },
  { value: 'medical', label: L('Medical', 'طبي') },
  { value: 'other', label: L('Other', 'أخرى') },
]
const TRAVEL_PURPOSES = [
  { value: 'Client Meeting', label: L('Client meeting', 'اجتماع عميل') },
  { value: 'Conference', label: L('Conference', 'مؤتمر') },
  { value: 'Training', label: L('Training', 'تدريب') },
  { value: 'Site Visit', label: L('Site visit', 'زيارة موقع') },
  { value: 'Sales', label: L('Sales', 'مبيعات') },
  { value: 'Other', label: L('Other', 'أخرى') },
]
const TRANSPORT = [
  { value: 'Flight', label: L('Flight', 'طيران') },
  { value: 'Train', label: L('Train', 'قطار') },
  { value: 'Car', label: L('Car', 'سيارة') },
  { value: 'Bus', label: L('Bus', 'أتوبيس') },
  { value: 'Other', label: L('Other', 'أخرى') },
]
const HELPDESK_CATEGORIES = [
  { value: 'hr', label: L('HR', 'الموارد البشرية') },
  { value: 'doc', label: L('Certificate or letter', 'شهادة أو خطاب') },
  { value: 'finance', label: L('Finance', 'المالية') },
  { value: 'it', label: L('IT', 'الدعم الفني') },
  { value: 'admin', label: L('Admin & office', 'الشؤون الإدارية') },
  { value: 'other', label: L('Other', 'أخرى') },
]
const REWARD_BASES = [
  { value: 'days_basic', label: L('Days of basic salary', 'أيام من الأساسي') },
  { value: 'days_gross', label: L('Days of gross salary', 'أيام من الإجمالي') },
  { value: 'amount', label: L('Fixed amount', 'مبلغ محدد') },
]
const REWARD_REASONS = [
  { value: 'performance', label: L('Performance', 'الأداء') },
  { value: 'project', label: L('Project', 'مشروع') },
  { value: 'attendance', label: L('Attendance', 'الانضباط') },
  { value: 'retention', label: L('Retention', 'الاحتفاظ') },
  { value: 'other', label: L('Other', 'أخرى') },
]

const reason = (required = false) => ({ key: 'reason', kind: 'multiline', label: L('Reason', 'السبب'), required })

// Field kinds: date, time, text, multiline, number, select (options or
// optionsFrom a loader the form screen knows), segment (2–4 inline choices).
export const TYPES = [
  // ── Time off ──
  { key: 'leave', group: 'time', abbr: L('LV', 'إ'), feature: 'leave',
    label: L('Leave', 'إجازة'), hint: L('Annual, casual, sick and other types', 'اعتيادية، عارضة، مرضية وغيرها'),
    fields: [
      { key: 'leave_type_id', kind: 'select', optionsFrom: 'leaveTypes', label: L('Leave type', 'نوع الإجازة'), required: true },
      { key: 'start_date', kind: 'date', label: L('From', 'من'), required: true },
      { key: 'end_date', kind: 'date', label: L('To', 'إلى'), required: true },
      reason(),
    ],
    validate: v => (v.start_date && v.end_date && v.end_date < v.start_date ? L('The end date is before the start date.', 'تاريخ النهاية قبل تاريخ البداية.') : null),
    submit: (v, c) => ({ path: '/leave/requests', body: { employee_id: c.employeeId, leave_type_id: v.leave_type_id, start_date: v.start_date, end_date: v.end_date, reason: v.reason } }) },
  { key: 'dayoff', group: 'time', abbr: L('DO', 'ر'),
    label: L('Day off', 'يوم راحة'), hint: L('Choose your weekly rest day', 'اختر يوم راحتك الأسبوعي'),
    fields: [{ key: 'date', kind: 'date', label: L('Date', 'التاريخ'), required: true }, reason()],
    submit: v => ({ path: '/day-offs', body: { date: v.date, reason: v.reason } }) },
  { key: 'wfh', group: 'time', abbr: L('WH', 'ب'),
    label: L('Work from home', 'عمل من المنزل'), hint: L('One day or a range', 'يوم واحد أو فترة'),
    fields: [
      { key: 'date', kind: 'date', label: L('Date', 'التاريخ'), required: true },
      { key: 'end_date', kind: 'date', label: L('Until (optional)', 'حتى (اختياري)') },
      reason(),
    ],
    validate: v => (v.end_date && v.end_date < v.date ? L('The end date is before the start date.', 'تاريخ النهاية قبل تاريخ البداية.') : null),
    submit: (v, c) => ({ path: '/wfh', body: { employee_id: c.employeeId, date: v.date, end_date: v.end_date, reason: v.reason || '' } }) },
  { key: 'leave_encashment', group: 'time', abbr: L('LE', 'ص'), feature: 'leave',
    label: L('Leave encashment', 'صرف رصيد إجازات'), hint: L('Get paid for unused days', 'مقابل نقدي للأيام غير المستخدمة'),
    fields: [
      { key: 'leave_type_id', kind: 'select', optionsFrom: 'leaveTypes', label: L('Leave type', 'نوع الإجازة'), required: true },
      { key: 'days', kind: 'number', label: L('Days', 'عدد الأيام'), required: true },
      { key: 'effective_date', kind: 'date', label: L('Payroll date', 'تاريخ الصرف'), required: true, defaultToday: true },
      reason(),
    ],
    validate: v => (!(Number(v.days) > 0) ? L('Enter the number of days.', 'اكتب عدد الأيام.') : null),
    submit: (v, c) => ({ path: '/employee-requests/leave_encashment', body: { employee_id: c.employeeId, payload: { leave_type_id: v.leave_type_id, days: Number(v.days), effective_date: v.effective_date, reason: v.reason } } }) },

  // ── Attendance & work ──
  { key: 'mission', group: 'work', abbr: L('MI', 'م'),
    label: L('Work mission', 'مأمورية عمل'), hint: L('Working outside the office', 'العمل خارج المكتب'),
    intro: L('For time you work outside the office. Approved missions count as attendance.', 'للوقت الذي تعمل فيه خارج المكتب. المأمورية المعتمدة تُحسب حضورًا.'),
    fields: [
      { key: 'is_full_day', kind: 'segment', options: [{ value: false, label: L('Part of the day', 'جزء من اليوم') }, { value: true, label: L('Full day(s)', 'يوم كامل أو أكثر') }], default: false },
      { key: 'date', kind: 'date', label: L('Date', 'التاريخ'), required: true, defaultToday: true },
      { key: 'end_date', kind: 'date', label: L('Until (optional)', 'حتى (اختياري)'), showIf: v => v.is_full_day },
      { key: 'from_time', kind: 'time', label: L('From', 'من'), required: true, showIf: v => !v.is_full_day, half: true },
      { key: 'to_time', kind: 'time', label: L('To', 'إلى'), required: true, showIf: v => !v.is_full_day, half: true },
      { key: 'mission_type_id', kind: 'select', optionsFrom: 'missionTypes', label: L('Mission type', 'نوع المأمورية'), hideIfNoOptions: true },
      { key: 'destination', kind: 'text', label: L('Where', 'المكان'), placeholder: L('Client, site or city', 'العميل أو الموقع أو المدينة'), required: true, max: 200 },
      { key: 'purpose', kind: 'multiline', label: L('Purpose', 'الغرض'), placeholder: L('What is the mission for?', 'ما الغرض من المأمورية؟'), max: 500 },
    ],
    validate: v => {
      if (v.is_full_day && v.end_date && v.end_date < v.date) return L('The end date is before the start date.', 'تاريخ النهاية قبل تاريخ البداية.')
      if (!v.is_full_day && v.from_time && v.to_time && v.to_time <= v.from_time) return L('"To" must be after "From".', 'وقت النهاية يجب أن يكون بعد وقت البداية.')
      return null
    },
    submit: (v, c) => {
      const body = { employee_id: c.employeeId, date: v.date, is_full_day: !!v.is_full_day, destination: String(v.destination || '').trim(), purpose: v.purpose, mission_type_id: v.mission_type_id }
      if (v.is_full_day) { if (v.end_date && v.end_date !== v.date) body.end_date = v.end_date } else { body.from_time = v.from_time; body.to_time = v.to_time }
      return { path: '/attendance/missions', body }
    } },
  { key: 'excuse', group: 'work', abbr: L('LA', 'ت'),
    label: L('Permission (late / early)', 'إذن (تأخير / انصراف مبكر)'), hint: L('Arrive late or leave early for part of the day', 'حضور متأخر أو انصراف مبكر لجزء من اليوم'),
    terms: ['excuse', 'late arrival', 'early leave', 'استئذان', 'عذر'],
    fields: [
      { key: 'kind', kind: 'segment', options: [{ value: 'late_arrival', label: L('Arrive late', 'حضور متأخر') }, { value: 'early_departure', label: L('Leave early', 'انصراف مبكر') }], default: 'late_arrival' },
      { key: 'date', kind: 'date', label: L('Date', 'التاريخ'), required: true, defaultToday: true },
      { key: 'time', kind: 'time', label: L('Time', 'الوقت'), required: true },
      reason(),
    ],
    submit: v => ({ path: '/attendance/excuses', body: { date: v.date, kind: v.kind, time: v.time, reason: v.reason } }) },
  { key: 'missed', group: 'work', abbr: L('MP', 'ب'),
    label: L('Missed punch', 'بصمة منسية'), hint: L('Forgot to check in or out', 'نسيت تسجيل الحضور أو الانصراف'),
    fields: [
      { key: 'correction_type', kind: 'segment', options: [{ value: 'missing_check_in', label: L('Check-in', 'الحضور') }, { value: 'missing_check_out', label: L('Check-out', 'الانصراف') }], default: 'missing_check_in' },
      { key: 'date', kind: 'date', label: L('Date', 'التاريخ'), required: true },
      { key: 'time', kind: 'time', label: L('Actual time', 'الوقت الفعلي'), required: true },
      reason(true),
    ],
    validate: v => (String(v.reason || '').trim().length < 3 ? L('Please write a short reason.', 'يرجى كتابة سبب مختصر.') : null),
    submit: v => {
      const [y, m, d] = v.date.split('-').map(Number)
      const [hh, mm] = v.time.split(':').map(Number)
      const at = new Date(y, m - 1, d, hh, mm).toISOString()
      return { path: '/attendance/corrections', body: { date: v.date, correction_type: v.correction_type, reason: v.reason, ...(v.correction_type === 'missing_check_in' ? { requested_check_in: at } : { requested_check_out: at }) } }
    } },
  { key: 'overtime', group: 'work', abbr: L('OT', 'ع'),
    label: L('Overtime', 'ساعات إضافية'), hint: L('Extra hours worked', 'ساعات عمل زائدة'),
    fields: [
      { key: 'date', kind: 'date', label: L('Date', 'التاريخ'), required: true },
      { key: 'hours', kind: 'number', label: L('Hours', 'عدد الساعات'), required: true },
      { key: 'overtime_type', kind: 'select', options: OVERTIME_TYPES, label: L('Type', 'النوع'), default: 'weekday' },
      { key: 'compensation_type', kind: 'segment', options: [{ value: 'payment', label: L('Paid', 'مقابل مادي') }, { value: 'time_off', label: L('Time off', 'وقت راحة') }], default: 'payment' },
      reason(),
    ],
    validate: v => (!(Number(v.hours) > 0) ? L('Please enter valid hours.', 'يرجى إدخال عدد ساعات صحيح.') : null),
    submit: (v, c) => ({ path: '/overtime', body: { employee_id: c.employeeId, date: v.date, hours: Number(v.hours), overtime_type: v.overtime_type, compensation_type: v.compensation_type, reason: v.reason } }) },
  { key: 'shift_day', group: 'work', abbr: L('1D', 'ي'),
    label: L('Shift for one day', 'وردية ليوم واحد'), hint: L('Work another shift on one date only', 'العمل في وردية أخرى ليوم واحد فقط'),
    terms: ['shift', 'one day', 'swap', 'وردية', 'تبديل'],
    fields: [
      { key: 'date', kind: 'date', label: L('Date', 'التاريخ'), required: true },
      { key: 'shift_id', kind: 'select', optionsFrom: 'shifts', label: L('Shift for that day', 'الوردية لهذا اليوم'), required: true },
      reason(),
    ],
    submit: (v, c) => ({ path: '/shift-overrides', body: { employee_id: c.employeeId, shift_id: v.shift_id, override_date: v.date, reason: v.reason } }) },
  { key: 'shift', group: 'work', abbr: L('SC', 'و'),
    label: L('Shift change', 'تغيير الوردية'), hint: L('Work a different shift', 'العمل في وردية أخرى'),
    fields: [
      { key: 'shift_id', kind: 'select', optionsFrom: 'shifts', label: L('New shift', 'الوردية الجديدة'), required: true },
      { key: 'effective_date', kind: 'date', label: L('Starting', 'اعتبارًا من'), required: true },
      reason(),
    ],
    submit: (v, c) => ({ path: '/employee-requests/shift_change', body: { employee_id: c.employeeId, payload: { shift_id: v.shift_id, effective_date: v.effective_date, reason: v.reason } } }) },
  { key: 'travel', group: 'work', abbr: L('TR', 'س'),
    label: L('Travel', 'سفر عمل'), hint: L('Business trip with dates and costs', 'رحلة عمل بالتواريخ والتكاليف'),
    fields: [
      { key: 'destination', kind: 'text', label: L('Destination', 'الوجهة'), placeholder: L('City, country', 'المدينة، الدولة'), required: true },
      { key: 'departure_date', kind: 'date', label: L('Leaving', 'السفر'), required: true, half: true },
      { key: 'return_date', kind: 'date', label: L('Returning', 'العودة'), required: true, half: true },
      { key: 'purpose', kind: 'select', options: TRAVEL_PURPOSES, label: L('Purpose', 'الغرض'), default: 'Client Meeting' },
      { key: 'transport_type', kind: 'select', options: TRANSPORT, label: L('Transport', 'وسيلة السفر'), default: 'Flight' },
      { key: 'estimated_budget', kind: 'number', label: L('Estimated budget (EGP)', 'الميزانية التقديرية (ج.م)') },
      { key: 'accommodation', kind: 'text', label: L('Accommodation', 'الإقامة') },
      { key: 'notes', kind: 'multiline', label: L('Notes', 'ملاحظات') },
    ],
    validate: v => (v.return_date && v.departure_date && v.return_date < v.departure_date ? L('The return date is before the departure date.', 'تاريخ العودة قبل تاريخ السفر.') : null),
    submit: (v, c) => ({ path: '/travel', body: { employee_id: c.employeeId, destination: v.destination, purpose: v.purpose, departure_date: v.departure_date, return_date: v.return_date, transport_type: v.transport_type, estimated_budget: Number(v.estimated_budget) || 0, accommodation: v.accommodation, notes: v.notes } }) },

  // ── Money ──
  { key: 'expense', group: 'money', abbr: L('EX', 'م'), feature: 'expenses',
    label: L('Expense claim', 'مطالبة مصروفات'), hint: L('Get money back with a receipt', 'استرداد بإيصال'),
    fields: [
      { key: 'expense_date', kind: 'date', label: L('Date', 'التاريخ'), required: true, defaultToday: true },
      { key: 'category', kind: 'select', options: EXPENSE_CATEGORIES, label: L('Category', 'الفئة'), default: 'travel' },
      { key: 'amount', kind: 'number', label: L('Amount (EGP)', 'المبلغ (ج.م)'), required: true },
      { key: 'description', kind: 'multiline', label: L('What was it for?', 'وصف المصروف'), required: true },
      { key: 'receipt_number', kind: 'text', label: L('Receipt number (optional)', 'رقم الإيصال (اختياري)') },
    ],
    validate: v => (!(Number(v.amount) > 0) ? L('Enter the amount.', 'اكتب المبلغ.') : null),
    // Created as a draft, then sent for approval — the same two steps as the
    // Expenses screen and the web app.
    submit: (v, c) => ({ path: '/expenses', body: { employee_id: c.employeeId, expense_date: v.expense_date, category: v.category, amount: Number(v.amount), description: v.description, receipt_number: v.receipt_number }, then: created => created?.id && { method: 'patch', path: `/expenses/${created.id}`, body: { status: 'submitted' } } }) },
  // Employees can't create a loan directly (HR records loans), so a loan
  // request reaches HR as a finance ticket with the amount and months.
  { key: 'loan', group: 'money', abbr: L('LN', 'س'), feature: 'loans',
    label: L('Loan / advance', 'سلفة / قرض'), hint: L('Sent to HR to arrange', 'تُرسل للموارد البشرية لتنفيذها'),
    fields: [
      { key: 'amount', kind: 'number', label: L('Amount (EGP)', 'المبلغ (ج.م)'), required: true },
      { key: 'months', kind: 'number', label: L('Repay over (months)', 'السداد على (شهور)'), required: true },
      reason(true),
    ],
    validate: v => (!(Number(v.amount) > 0) ? L('Enter the amount.', 'اكتب المبلغ.') : !(Number(v.months) >= 1) ? L('Enter the number of months.', 'اكتب عدد الشهور.') : null),
    submit: (v, c) => ({ path: '/helpdesk', body: {
      category: 'finance', priority: 'medium',
      subject: c.ar ? `طلب سلفة — ${Number(v.amount).toLocaleString('en-US')} ج.م` : `Loan request — EGP ${Number(v.amount).toLocaleString('en-US')}`,
      description: c.ar ? `المبلغ: ${v.amount} ج.م\nالسداد على: ${v.months} شهر\nالسبب: ${v.reason}` : `Amount: EGP ${v.amount}\nRepay over: ${v.months} months\nReason: ${v.reason}`,
    } }) },
  { key: 'loan_reschedule', group: 'money', abbr: L('RS', 'ج'), feature: 'loans',
    label: L('Loan reschedule', 'إعادة جدولة قرض'), hint: L('Change the monthly deduction', 'تعديل القسط الشهري'),
    fields: [
      { key: 'loan_id', kind: 'select', optionsFrom: 'myLoans', label: L('Loan', 'القرض'), required: true, emptyText: L('You have no active loans.', 'ليس لديك قروض نشطة.') },
      { key: 'monthly_deduction', kind: 'number', label: L('New monthly deduction (EGP)', 'القسط الشهري الجديد (ج.م)'), required: true },
      { key: 'start_date', kind: 'date', label: L('Starting', 'اعتبارًا من'), required: true },
      reason(),
    ],
    validate: v => (!(Number(v.monthly_deduction) > 0) ? L('Enter the monthly deduction.', 'اكتب القسط الشهري.') : null),
    submit: (v, c) => ({ path: '/employee-requests/loan_reschedule', body: { employee_id: c.employeeId, payload: { loan_id: v.loan_id, monthly_deduction: Number(v.monthly_deduction), start_date: v.start_date, reason: v.reason } } }) },

  // ── HR & documents ──
  { key: 'helpdesk', group: 'hr', abbr: L('HR', 'ش'),
    label: L('Ask HR', 'اسأل الموارد البشرية'), hint: L('Certificates, letters, questions', 'شهادات، خطابات، استفسارات'),
    fields: [
      { key: 'category', kind: 'select', options: HELPDESK_CATEGORIES, label: L('About', 'بخصوص'), default: 'hr' },
      { key: 'subject', kind: 'text', label: L('Subject', 'العنوان'), placeholder: L('e.g. Salary certificate', 'مثلاً: مفردات مرتب'), required: true },
      { key: 'description', kind: 'multiline', label: L('Details', 'التفاصيل'), required: true },
      { key: 'priority', kind: 'segment', options: [{ value: 'low', label: L('Low', 'منخفضة') }, { value: 'medium', label: L('Medium', 'متوسطة') }, { value: 'high', label: L('Urgent', 'عاجلة') }], default: 'medium' },
    ],
    submit: v => ({ path: '/helpdesk', body: { category: v.category, subject: String(v.subject).trim(), description: String(v.description).trim(), priority: v.priority } }) },
  { key: 'document_borrow', group: 'hr', abbr: L('DB', 'م'),
    label: L('Borrow a document', 'استعارة مستند'), hint: L('Your original papers from HR', 'أوراقك الأصلية من الموارد البشرية'),
    fields: [
      { key: 'document_id', kind: 'select', optionsFrom: 'myDocuments', label: L('Document', 'المستند'), required: true, emptyText: L('HR has no documents on file for you yet.', 'لا توجد مستندات مسجلة لك بعد.') },
      { key: 'due_date', kind: 'date', label: L('Return by', 'الإرجاع قبل'), required: true },
      { key: 'purpose', kind: 'multiline', label: L('Purpose', 'الغرض'), required: true },
    ],
    submit: (v, c) => ({ path: '/employee-requests/document_borrow', body: { employee_id: c.employeeId, payload: { document_id: v.document_id, due_date: v.due_date, purpose: v.purpose } } }) },
  { key: 'resignation', group: 'hr', abbr: L('RG', 'ق'),
    label: L('Resignation', 'استقالة'), hint: L('Start your exit process', 'بدء إجراءات إنهاء الخدمة'),
    confirm: L('Send your resignation to HR? They will contact you about the next steps.', 'هل تريد إرسال استقالتك للموارد البشرية؟ سيتواصلون معك بخصوص الخطوات التالية.'),
    fields: [
      { key: 'last_working_day', kind: 'date', label: L('Last working day', 'آخر يوم عمل'), required: true },
      reason(),
      { key: 'notes', kind: 'multiline', label: L('Notes', 'ملاحظات') },
    ],
    submit: (v, c) => ({ path: '/employee-requests/resignation', body: { employee_id: c.employeeId, payload: { last_working_day: v.last_working_day, reason: v.reason, notes: v.notes } } }) },

  // ── For my team (managers) ──
  { key: 'reward', group: 'team', abbr: L('RW', 'ك'), roles: LEADS, forOthers: true,
    label: L('Reward an employee', 'مكافأة موظف'), hint: L('Paid with payroll after HR approves', 'تُصرف مع الراتب بعد موافقة الموارد البشرية'),
    fields: [
      { key: 'employee_id', kind: 'select', optionsFrom: 'directReports', label: L('Employee', 'الموظف'), required: true, emptyText: L('No one reports to you yet.', 'لا يوجد موظفون تابعون لك بعد.') },
      { key: 'basis', kind: 'select', options: REWARD_BASES, label: L('Reward as', 'نوع المكافأة'), default: 'days_basic' },
      { key: 'days', kind: 'number', label: L('Days', 'عدد الأيام'), required: true, showIf: v => v.basis !== 'amount' },
      { key: 'amount', kind: 'number', label: L('Amount (EGP)', 'المبلغ (ج.م)'), required: true, showIf: v => v.basis === 'amount' },
      { key: 'effective_date', kind: 'date', label: L('Payroll date', 'تاريخ الصرف'), required: true, defaultToday: true },
      { key: 'reason_category', kind: 'select', options: REWARD_REASONS, label: L('For', 'السبب'), default: 'performance' },
      { key: 'reason', kind: 'multiline', label: L('Details', 'التفاصيل') },
    ],
    submit: v => {
      const p = { basis: v.basis, effective_date: v.effective_date, reason_category: v.reason_category, reason: v.reason }
      if (v.basis === 'amount') p.amount = Number(v.amount); else p.days = Number(v.days)
      return { path: '/employee-requests/reward', body: { employee_id: v.employee_id, payload: p } }
    } },
]

export const typeByKey = key => TYPES.find(t => t.key === key)

// Old deep links (Home "request a correction", notifications…) used these.
export const ALIASES = { late: 'excuse', early: 'excuse', ticket: 'helpdesk', day_off: 'dayoff', shift_change: 'shift', shift_override: 'shift_day' }
export const resolveType = key => typeByKey(ALIASES[key] || key)

// The types this person may start, honouring HR's mobile feature switches.
export function visibleTypes({ can = () => true, role } = {}) {
  return TYPES.filter(t => can('requests') && (!t.feature || can(t.feature)) && (!t.roles || t.roles.includes(role)))
}

export function groupedTypes(ctx, query = '') {
  const q = String(query || '').trim().toLowerCase()
  // Match at the start of a word, so "mission" doesn't find "permission".
  const hit = s => (' ' + s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')).includes(' ' + q)
  const types = visibleTypes(ctx).filter(t => !q || [...t.label, ...t.hint, ...(t.terms || [])].some(hit))
  return GROUPS.map(g => ({ ...g, items: types.filter(t => t.group === g.key) })).filter(g => g.items.length)
}

export function initialValues(type, today) {
  const v = {}
  for (const f of type.fields) {
    if (f.default !== undefined) v[f.key] = f.default
    else if (f.defaultToday) v[f.key] = today
    else v[f.key] = ''
  }
  return v
}

export const visibleFields = (type, values) => type.fields.filter(f => !f.showIf || f.showIf(values))

// First problem with the form as [en, ar], or null when it can be sent.
export function validate(type, values) {
  for (const f of visibleFields(type, values)) {
    const val = values[f.key]
    if (f.required && (val === undefined || val === null || String(val).trim() === '')) return L(`Please fill in: ${f.label[0]}.`, `يرجى إدخال: ${f.label[1]}.`)
    if (f.max && String(val || '').length > f.max) return L(`${f.label[0]} is too long.`, `${f.label[1]} طويل جدًا.`)
  }
  return type.validate ? type.validate(values) : null
}

// Drops empty optional values so the server applies its own defaults.
export function buildSubmission(type, values, ctx) {
  const shown = new Set(visibleFields(type, values).map(f => f.key))
  const clean = {}
  for (const [k, v] of Object.entries(values)) if (!type.fields.some(f => f.key === k) || shown.has(k)) clean[k] = v
  const sub = type.submit(clean, ctx)
  const strip = o => { for (const k of Object.keys(o)) { if (o[k] === '' || o[k] === undefined || o[k] === null) delete o[k]; else if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) strip(o[k]) } return o }
  return { method: 'post', ...sub, body: strip({ ...sub.body, ...(sub.body.payload ? { payload: { ...sub.body.payload } } : {}) }) }
}

/* ── The single "Requests" list ───────────────────────────────────────── */

const rowsOf = d => (Array.isArray(d) ? d : Array.isArray(d?.rows) ? d.rows : Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : [])

// Every status the different request tables use, folded into four.
export function normStatus(s) {
  const v = String(s || '').toLowerCase()
  if (['approved', 'paid', 'completed', 'active', 'resolved', 'closed', 'settled', 'manager_approved_final'].includes(v)) return 'approved'
  if (['rejected', 'declined'].includes(v)) return 'rejected'
  if (['cancelled', 'canceled', 'withdrawn'].includes(v)) return 'cancelled'
  if (v === 'draft') return 'draft'
  return 'pending'   // pending, submitted, manager_approved, open, in_progress…
}

const t2 = v => (v ? String(v).slice(0, 5) : '')
const day = v => (v ? String(v).slice(0, 10) : '')

const ER_TYPES = { shift_change: 'shift', leave_encashment: 'leave_encashment', loan_reschedule: 'loan_reschedule', document_borrow: 'document_borrow', resignation: 'resignation', reward: 'reward', transfer: null, promotion: null }
const ER_TITLES = { transfer: L('Transfer', 'نقل'), promotion: L('Promotion', 'ترقية') }

// Where each kind of request is listed, and how a row becomes a list item:
// { id, type, title?, from, to, detail, status, created_at, note }.
export function listSources({ employeeId, userId, can = () => true, role } = {}) {
  const me = r => !employeeId || r.employee_id === employeeId || (userId && (r.user_id === userId || r.requested_by === userId))
  const q = employeeId ? `employee_id=${employeeId}&` : ''
  const S = [
    can('leave') && { kind: 'leave', path: `/leave/requests?${q}limit=50`, map: r => ({ type: 'leave', title: [r.leave_type_name || r.leave_type || 'Leave', r.leave_type_name_ar || r.leave_type_ar || r.leave_type_name || r.leave_type || 'إجازة'], from: day(r.start_date), to: day(r.end_date), detail: r.days_requested ? L(`${r.days_requested} day(s)`, `${r.days_requested} يوم`) : null, note: r.rejection_reason }) },
    can('requests') && { kind: 'dayoff', path: `/day-offs?${q}limit=50`, map: r => ({ type: 'dayoff', from: day(r.date), note: r.rejection_reason || r.review_reason }) },
    can('requests') && { kind: 'wfh', path: `/wfh?${q}limit=50`, map: r => ({ type: 'wfh', from: day(r.date), to: day(r.end_date), note: r.rejection_reason }) },
    can('requests') && { kind: 'overtime', path: `/overtime?${q}limit=50`, map: r => { const h = r.hours != null ? Number(r.hours) : r.minutes ? Math.round(r.minutes / 6) / 10 : null; return { type: 'overtime', from: day(r.date), detail: h ? L(`${h} h`, `${h} ساعة`) : null, note: r.rejection_reason } } },
    can('requests') && { kind: 'excuse', path: `/attendance/excuses?${q}limit=50`, map: r => ({ type: 'excuse', title: L('Late / early permission', 'إذن تأخير / انصراف'), from: day(r.date), detail: r.from_time ? [`${t2(r.from_time)}–${t2(r.to_time)}`, `${t2(r.from_time)}–${t2(r.to_time)}`] : null, note: r.rejection_reason }) },
    can('requests') && { kind: 'mission', path: `/attendance/missions?${q}limit=50`, map: r => ({ type: 'mission', from: day(r.date), to: day(r.end_date), detail: [[r.is_full_day ? 'Full day' : `${t2(r.from_time)}–${t2(r.to_time)}`, r.destination].filter(Boolean).join(' · '), [r.is_full_day ? 'يوم كامل' : `${t2(r.from_time)}–${t2(r.to_time)}`, r.destination].filter(Boolean).join(' · ')], note: r.rejection_reason }) },
    can('requests') && { kind: 'correction', path: `/attendance/corrections?${q}limit=50`, map: r => ({ type: 'missed', from: day(r.date), detail: String(r.correction_type || '').includes('out') ? L('Check-out', 'الانصراف') : L('Check-in', 'الحضور'), note: r.rejection_reason }) },
    can('requests') && { kind: 'shift_day', path: `/shift-overrides?${q}`.replace(/[?&]$/, ''), map: r => ({ type: 'shift_day', from: day(r.override_date), detail: r.shift_name ? [[r.shift_name, r.shift_start ? `${t2(r.shift_start)}–${t2(r.shift_end)}` : null].filter(Boolean).join(' · '), [r.shift_name_ar || r.shift_name, r.shift_start ? `${t2(r.shift_start)}–${t2(r.shift_end)}` : null].filter(Boolean).join(' · ')] : null, note: r.rejection_reason }) },
    can('requests') && { kind: 'travel', path: `/travel?${q}limit=50`, map: r => ({ type: 'travel', from: day(r.departure_date), to: day(r.return_date), detail: r.destination ? [r.destination, r.destination] : null, note: r.rejection_reason }) },
    can('expenses') && { kind: 'expense', path: `/expenses?${q}limit=50`, map: r => ({ type: 'expense', from: day(r.expense_date), detail: r.amount != null ? [`EGP ${Number(r.amount).toLocaleString('en-US')}`, `${Number(r.amount).toLocaleString('en-US')} ج.م`] : null, note: r.rejection_reason }) },
    can('requests') && { kind: 'employee_request', path: '/employee-requests', mine: r => me(r) || (userId && r.requested_by === userId), map: r => {
      const type = ER_TYPES[r.request_type]
      const p = r.payload || {}
      const forOther = employeeId && r.employee_id !== employeeId
      return { type: type || r.request_type, title: !type ? (ER_TITLES[r.request_type] || L(r.request_type, r.request_type)) : null,
        from: day(p.effective_date || p.last_working_day || p.start_date || p.due_date), detail: forOther && r.employee_name ? [r.employee_name, r.employee_name] : null, note: r.rejection_reason }
    } },
    can('requests') && { kind: 'helpdesk', path: '/helpdesk?limit=50&mine=1', map: r => ({ type: 'helpdesk', title: r.subject ? [r.subject, r.subject] : null, from: day(r.created_at), note: r.resolution || null }) },
  ]
  return S.filter(Boolean).map(s => ({ ...s, mine: s.mine || me }))
}

export function toItems(source, data) {
  return rowsOf(data).filter(source.mine).map(r => {
    const m = source.map(r)
    return { id: `${source.kind}:${r.id}`, status: normStatus(r.status), rawStatus: r.status, created_at: r.created_at || r.submitted_at || m.from, ...m }
  })
}

export const sortItems = items => [...items].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))

export const FILTERS = [
  { key: 'all', label: L('All', 'الكل') },
  { key: 'pending', label: L('Pending', 'قيد الانتظار') },
  { key: 'approved', label: L('Approved', 'مقبولة') },
  { key: 'rejected', label: L('Rejected', 'مرفوضة') },
]
export const matchesFilter = (item, f) => f === 'all' || item.status === f || (f === 'rejected' && item.status === 'cancelled') || (f === 'pending' && item.status === 'draft')

export const STATUS_LABEL = {
  pending: L('Pending', 'قيد الانتظار'), approved: L('Approved', 'مقبول'), rejected: L('Rejected', 'مرفوض'),
  cancelled: L('Cancelled', 'ملغي'), draft: L('Draft', 'مسودة'),
}
