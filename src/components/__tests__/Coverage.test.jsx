import {act,render,screen,waitFor} from '@testing-library/react-native'
import {AppState} from 'react-native'
import CoverageScreen from '../../../app/coverage'
import api from '../../services/api'
let mockAuth
jest.mock('../../context/AuthContext',()=>({useAuth:()=>mockAuth}))
jest.mock('../../context/LanguageContext',()=>({useLang:()=>({tr:en=>en,date:v=>v,monthYear:(m,y)=>`${m+1}/${y}`})}))
jest.mock('../../context/ThemeContext',()=>({useTheme:()=>({colors:{bg:'#fff',text:'#111',sub:'#666'}})}))
jest.mock('../../services/api',()=>({get:jest.fn()}))
beforeEach(()=>{
  jest.spyOn(AppState,'addEventListener').mockReturnValue({remove:jest.fn()})
  jest.useFakeTimers().setSystemTime(new Date('2026-10-25T12:00:00Z'))
  mockAuth={user:{id:'manager',company_id:'tenant',role:'manager'},can:()=>true,cycleStartDay:1}
  api.get.mockReset();api.get.mockResolvedValue({data:{data:{period:{from:'2026-10-01',to:'2026-10-31'},rows:[],team_size:1}}})
})
afterEach(()=>{jest.useRealTimers();jest.restoreAllMocks()})
test('coverage advances the default cycle when the app resumes after cycle rollover',async()=>{
  jest.setSystemTime(new Date('2026-10-20T12:00:00Z'))
  mockAuth.cycleStartDay=21
  render(<CoverageScreen/>);
  await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith('/leadership/coverage',{params:{month:10,year:2026}}))
  jest.setSystemTime(new Date('2026-10-21T12:00:00Z'))
  act(()=>AppState.addEventListener.mock.calls.at(-1)[1]('active'))
  await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith('/leadership/coverage',{params:{month:11,year:2026}}))
})
test('coverage follows a payroll cycle loaded after the screen mounts',async()=>{
  const view=render(<CoverageScreen/>);
  await waitFor(()=>expect(api.get).toHaveBeenCalledWith('/leadership/coverage',{params:{month:10,year:2026}}))
  mockAuth.cycleStartDay=21;view.rerender(<CoverageScreen/>);
  await waitFor(()=>expect(api.get).toHaveBeenLastCalledWith('/leadership/coverage',{params:{month:11,year:2026}}))
})
test('revoking coverage access immediately hides previously loaded leave',async()=>{
  api.get.mockResolvedValue({data:{data:{period:{from:'2026-10-01',to:'2026-10-31'},rows:[{id:'leave',start_date:'2026-10-25',end_date:'2026-10-25',employee_name:'Private Employee',status:'approved'}],team_size:1}}})
  const view=render(<CoverageScreen/>);
  expect(await screen.findByText(/Private Employee/)).toBeTruthy()
  mockAuth.can=()=>false;view.rerender(<CoverageScreen/>);
  expect(screen.queryByText(/Private Employee/)).toBeNull()
  expect(screen.getByText('This feature is not enabled.')).toBeTruthy()
})
