import { payrollCycle, activePayrollMonth } from '../payrollCycle'
test('October cycle starts September 21 and ends October 20',()=>{
  expect(payrollCycle(9,2026,21)).toEqual({from:'2026-09-21',to:'2026-10-20'})
})
test('January cycle crosses the year correctly',()=>{
  expect(payrollCycle(0,2027,21)).toEqual({from:'2026-12-21',to:'2027-01-20'})
})
test('calendar month and leap day are preserved for day one',()=>{
  expect(payrollCycle(1,2028,1)).toEqual({from:'2028-02-01',to:'2028-02-29'})
})
test('the active payroll month changes on the cycle start, including December',()=>{
  expect(activePayrollMonth('2026-10-20',21)).toBe('2026-10')
  expect(activePayrollMonth('2026-10-21',21)).toBe('2026-11')
  expect(activePayrollMonth('2026-12-21',21)).toBe('2027-01')
  expect(activePayrollMonth('2026-10-21',1)).toBe('2026-10')
})
