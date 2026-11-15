import { AppState } from 'react-native'
import { act,fireEvent,render,screen,waitFor } from '@testing-library/react-native'
import LeadershipView from '../LeadershipView'
import api from '../../services/api'

let mockAuth
afterEach(()=>{jest.useRealTimers();jest.restoreAllMocks()})
jest.mock('../../context/AuthContext',()=>({useAuth:()=>mockAuth}))
// Real LanguageContext (default English value): a fake `cur` function once hid a
// crash — `cur` is the currency word, amounts go through money().
jest.mock('../../context/ThemeContext',()=>({useTheme:()=>({colors:{bg:'#fff',text:'#111',sub:'#666',card:'#fff',border:'#ddd'}})}))
jest.mock('../../services/api',()=>({get:jest.fn()}))
jest.mock('expo-router',()=>({useRouter:()=>({push:jest.fn()})}))
jest.mock('../GoalProgressEditor',()=>()=>null)
const data={period:{from:'2026-09-21',to:'2026-10-20'},projected_net:25000,
  earned_estimate_available:true,earned_net_to_date:12000,earned_gross_to_date:14000,monthly_reserves_to_date:2000,
  employee_count:2,calculated_count:2,pending_count:0,warning_count:0,as_of:'2026-10-18',calculated_at:'2026-10-18T12:00:00Z',individual_details:false};
beforeEach(()=>{
  mockAuth={user:{id:'ceo',company_id:'tenant',role:'ceo'},can:()=>true,cycleStartDay:21}
  api.get.mockReset();api.get.mockResolvedValue({data:{data}})
  jest.spyOn(AppState,'addEventListener').mockReturnValue({remove:jest.fn()})
})
test('shows projected payroll and estimated earned pay as different amounts',async()=>{
  render(<LeadershipView mode="forecast"/>);
  expect(await screen.findByText('EGP 25,000')).toBeTruthy()
  expect(screen.getByText('EGP 12,000')).toBeTruthy()
  expect(screen.getByText(/Payroll cycle.*2026-09-21/)).toBeTruthy()
  expect(screen.getByText(/This is not a withdrawable balance/)).toBeTruthy()
})
test('totals-only access does not show individual salary rows',async()=>{
  api.get.mockResolvedValue({data:{data:{...data,rows:[{employee_id:'secret',employee_name:'Private Employee',projected_net:12345,warnings:[]}]}}})
  render(<LeadershipView mode="forecast"/>);
  expect(await screen.findByText('Team totals access only.')).toBeTruthy()
  expect(screen.queryByText('Private Employee')).toBeNull()
})
test('full-access forecast renders every amount (regression: TestFlight crash 14 Nov 2026)',async()=>{
  const rows=[{employee_id:'e1',employee_name:'Sara Adel',employee_number:'E-1',projected_net:9000.5,previous_net:8500,change:500.5,
    accrual:{available:true,estimated_net:4200},overtime_pay:300,late_deductions:50,absence_deductions:0,warnings:['Missing check-out on 2026-11-03']},
    {employee_id:'e2',employee_name:'Omar Nabil',projected_net:16000,previous_net:null,change:null,overtime_pay:0,late_deductions:0,absence_deductions:0,warnings:[]}]
  api.get.mockResolvedValue({data:{data:{...data,previous_net:24000,change:1000,individual_details:true,rows}}})
  render(<LeadershipView mode="forecast"/>);
  expect(await screen.findByText('EGP 25,000')).toBeTruthy()
  expect(screen.getByText(/Previous cycle, same employees: EGP 24,000/)).toBeTruthy()
  expect(screen.getByText('EGP 9,000.5')).toBeTruthy()
  expect(screen.getByText(/Estimated earned to date: EGP 4,200/)).toBeTruthy()
  expect(screen.getByText(/Late \/ absence: EGP 50/)).toBeTruthy()
  expect(screen.getByText('Missing check-out on 2026-11-03')).toBeTruthy()
  expect(screen.getByText(/Previous: — · Change: —/)).toBeTruthy()
})
test('employees cannot fetch executive forecasts by opening a deep link',async()=>{
  mockAuth.user.role='employee';render(<LeadershipView mode="forecast"/>);
  expect(await screen.findByText('This workspace is not enabled for your account.')).toBeTruthy()
  expect(api.get).not.toHaveBeenCalled()
})
test('failed requests show a retry and recover without a fabricated zero total',async()=>{
  api.get.mockRejectedValueOnce({response:{data:{message:'Forecast unavailable'}}})
  render(<LeadershipView mode="forecast"/>);
  expect(await screen.findByText('Forecast unavailable')).toBeTruthy()
  expect(screen.queryByText('EGP 0')).toBeNull()
  fireEvent.press(screen.getByText('Retry'))
  expect(await screen.findByText('EGP 25,000')).toBeTruthy()
})

test('changing workspace never renders the previous roster as salary detail',async()=>{
  api.get.mockResolvedValueOnce({data:{data:{rows:[{employee_id:'report',employee_name:'Roster Employee',status:'present'}],counts:{present:1}}}})
  const view=render(<LeadershipView mode="workforce"/>);
  expect(await screen.findByText('Roster Employee')).toBeTruthy()
  api.get.mockImplementation(()=>new Promise(()=>{}))
  view.rerender(<LeadershipView mode="forecast"/>);
  expect(screen.queryByText('Roster Employee')).toBeNull()
  expect(screen.queryByText('Projected cycle-end net payroll')).toBeNull()
})

test('foreground rollover advances the default payroll cycle and forecast cutoff',async()=>{
  jest.useFakeTimers({doNotFake:['setTimeout','clearTimeout','setImmediate','clearImmediate']})
  jest.setSystemTime(new Date('2026-10-20T12:00:00Z'))
  render(<LeadershipView mode="forecast"/>)
  await act(async()=>{})
  expect(screen.getByText('EGP 25,000')).toBeTruthy()
  expect(api.get).toHaveBeenLastCalledWith('/leadership/forecast',expect.objectContaining({params:{month:10,year:2026,as_of:'2026-10-20'}}))
  jest.setSystemTime(new Date('2026-10-21T12:00:00Z'))
  const onActive=AppState.addEventListener.mock.calls.at(-1)[1]
  act(()=>onActive('active'))
  await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith('/leadership/forecast',expect.objectContaining({params:{month:11,year:2026,as_of:'2026-10-21'}})))
})

test('foreground rollover preserves a deliberately selected historical workforce date',async()=>{
  jest.useFakeTimers({doNotFake:['setTimeout','clearTimeout','setImmediate','clearImmediate']})
  jest.setSystemTime(new Date('2026-10-20T12:00:00Z'))
  render(<LeadershipView mode="workforce"/>);
  await waitFor(()=>expect(api.get).toHaveBeenCalled())
  fireEvent.press(screen.getByLabelText('Previous period'))
  await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith('/leadership/workforce',expect.objectContaining({params:{date:'2026-10-19'}})))
  jest.setSystemTime(new Date('2026-10-21T12:00:00Z'))
  const onActive=AppState.addEventListener.mock.calls.at(-1)[1]
  act(()=>onActive('active'))
  await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith('/leadership/workforce',expect.objectContaining({params:{date:'2026-10-19'}})))
})
