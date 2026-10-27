import { TYPES, visibleTypes, groupedTypes, initialValues, validate, buildSubmission, listSources, toItems, normStatus, resolveType, matchesFilter } from '../catalog'

const EMP = 'emp-1'
const ctx = { employeeId: EMP, ar: false }
const all = () => true

test('an employee sees every self-service request type, including work mission', () => {
  const keys = visibleTypes({ can: all, role: 'employee' }).map(t => t.key)
  expect(keys).toEqual(expect.arrayContaining(['leave', 'dayoff', 'wfh', 'leave_encashment', 'mission', 'excuse', 'missed', 'overtime', 'shift', 'travel', 'expense', 'loan', 'loan_reschedule', 'helpdesk', 'document_borrow', 'resignation']))
  expect(keys).not.toContain('reward')
  expect(visibleTypes({ can: all, role: 'manager' }).map(t => t.key)).toContain('reward')
})

test('HR switches hide request types', () => {
  const can = f => !['expenses', 'loans'].includes(f)
  const keys = visibleTypes({ can, role: 'employee' }).map(t => t.key)
  expect(keys).not.toContain('expense'); expect(keys).not.toContain('loan'); expect(keys).not.toContain('loan_reschedule')
  expect(visibleTypes({ can: f => f !== 'requests', role: 'employee' })).toEqual([])
})

test('search finds request types in English and Arabic', () => {
  expect(groupedTypes({ can: all, role: 'employee' }, 'mission').flatMap(g => g.items).map(t => t.key)).toEqual(['mission'])
  expect(groupedTypes({ can: all, role: 'employee' }, 'مأمورية').flatMap(g => g.items).map(t => t.key)).toEqual(['mission'])
})

test('part-day mission sends times and no end date', () => {
  const t = resolveType('mission')
  const v = { ...initialValues(t, '2026-10-25'), from_time: '10:00', to_time: '14:00', destination: ' Client office ', end_date: '2026-10-27' }
  expect(validate(t, v)).toBeNull()
  const s = buildSubmission(t, v, ctx)
  expect(s.path).toBe('/attendance/missions')
  expect(s.body).toEqual({ employee_id: EMP, date: '2026-10-25', is_full_day: false, destination: 'Client office', from_time: '10:00', to_time: '14:00' })
})

test('full-day mission drops times and keeps a later end date', () => {
  const t = resolveType('mission')
  const v = { ...initialValues(t, '2026-10-25'), is_full_day: true, from_time: '10:00', end_date: '2026-10-27', destination: 'Alexandria', purpose: 'Audit' }
  const s = buildSubmission(t, v, ctx)
  expect(s.body).toEqual({ employee_id: EMP, date: '2026-10-25', end_date: '2026-10-27', is_full_day: true, destination: 'Alexandria', purpose: 'Audit' })
})

test('mission needs a place, and part-day needs times in order', () => {
  const t = resolveType('mission')
  const v = initialValues(t, '2026-10-25')
  expect(validate(t, v)[0]).toMatch(/From/)
  expect(validate(t, { ...v, from_time: '14:00', to_time: '10:00', destination: 'x' })[0]).toMatch(/after/)
  expect(validate(t, { ...v, is_full_day: true })[0]).toMatch(/Where/)
})

test('every type builds a request to a real endpoint', () => {
  for (const t of TYPES) {
    const v = initialValues(t, '2026-10-25')
    for (const f of t.fields) if (v[f.key] === '' ) v[f.key] = f.kind === 'number' ? '2' : f.kind === 'time' ? '09:00' : f.kind === 'date' ? '2026-10-26' : 'x'
    const s = buildSubmission(t, v, ctx)
    expect(s.path).toMatch(/^\/[a-z-]+/)
    expect(s.method).toBe('post')
  }
})

test('extended requests wrap their fields in payload', () => {
  const t = resolveType('resignation')
  const s = buildSubmission(t, { last_working_day: '2026-11-30', reason: '', notes: '' }, ctx)
  expect(s).toMatchObject({ path: '/employee-requests/resignation', body: { employee_id: EMP, payload: { last_working_day: '2026-11-30' } } })
  expect(s.body.payload).not.toHaveProperty('reason')
})

test('expense is sent for approval after it is created', () => {
  const s = buildSubmission(resolveType('expense'), { expense_date: '2026-10-25', category: 'meals', amount: '150', description: 'Lunch', receipt_number: '' }, ctx)
  expect(s.body.amount).toBe(150)
  expect(s.then({ id: 'x1' })).toEqual({ method: 'patch', path: '/expenses/x1', body: { status: 'submitted' } })
})

test('a loan request goes to HR as a finance ticket', () => {
  const s = buildSubmission(resolveType('loan'), { amount: '10000', months: '10', reason: 'School fees' }, ctx)
  expect(s.path).toBe('/helpdesk')
  expect(s.body).toMatchObject({ category: 'finance', subject: 'Loan request — EGP 10,000' })
})

test('reward amount vs days', () => {
  const t = resolveType('reward')
  const days = buildSubmission(t, { ...initialValues(t, '2026-10-25'), employee_id: 'e2', days: '3', amount: '500' }, ctx)
  expect(days.body).toEqual({ employee_id: 'e2', payload: { basis: 'days_basic', days: 3, effective_date: '2026-10-25', reason_category: 'performance' } })
  const amt = buildSubmission(t, { ...initialValues(t, '2026-10-25'), basis: 'amount', employee_id: 'e2', days: '3', amount: '500' }, ctx)
  expect(amt.body.payload).toEqual({ basis: 'amount', amount: 500, effective_date: '2026-10-25', reason_category: 'performance' })
})

test('old deep links still open the right form', () => {
  expect(resolveType('late').key).toBe('excuse')
  expect(resolveType('missed').key).toBe('missed')
  expect(resolveType('nope')).toBeUndefined()
})

test('the list only shows my own requests', () => {
  const src = listSources({ employeeId: EMP, userId: 'u1', can: all }).find(s => s.kind === 'mission')
  const items = toItems(src, { rows: [
    { id: 'a', employee_id: EMP, status: 'pending', date: '2026-10-25', from_time: '10:00:00', to_time: '14:00:00', destination: 'Client', created_at: '2026-10-25T08:00:00Z' },
    { id: 'b', employee_id: 'someone-else', status: 'approved', date: '2026-10-24' },
  ] })
  expect(items).toHaveLength(1)
  expect(items[0]).toMatchObject({ id: 'mission:a', type: 'mission', status: 'pending', from: '2026-10-25', detail: ['10:00–14:00 · Client', '10:00–14:00 · Client'] })
})

test('a manager sees rewards they asked for, not the whole company', () => {
  const src = listSources({ employeeId: EMP, userId: 'u1', can: all }).find(s => s.kind === 'employee_request')
  const items = toItems(src, [
    { id: '1', employee_id: 'e9', requested_by: 'u1', request_type: 'reward', status: 'pending', payload: { effective_date: '2026-10-31' }, employee_name: 'Report' },
    { id: '2', employee_id: 'e8', requested_by: 'u7', request_type: 'resignation', status: 'pending', payload: {} },
  ])
  expect(items.map(i => i.id)).toEqual(['employee_request:1'])
  expect(items[0].detail).toEqual(['Report', 'Report'])
})

test('sources follow HR switches', () => {
  const kinds = listSources({ employeeId: EMP, can: f => f !== 'expenses' && f !== 'leave' }).map(s => s.kind)
  expect(kinds).not.toContain('expense'); expect(kinds).not.toContain('leave'); expect(kinds).toContain('mission')
})

test('statuses fold into four filters', () => {
  expect(['submitted', 'manager_approved', 'open', 'in_progress', 'pending'].map(normStatus)).toEqual(Array(5).fill('pending'))
  expect(['approved', 'paid', 'completed', 'resolved'].map(normStatus)).toEqual(Array(4).fill('approved'))
  expect(normStatus('rejected')).toBe('rejected')
  expect(matchesFilter({ status: 'cancelled' }, 'rejected')).toBe(true)
  expect(matchesFilter({ status: 'draft' }, 'pending')).toBe(true)
})
