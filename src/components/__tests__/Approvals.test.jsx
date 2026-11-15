import {Alert} from 'react-native'
import {act,fireEvent,render,screen} from '@testing-library/react-native'
import ApprovalsScreen from '../../../app/(tabs)/approvals'
import api from '../../services/api'
let mockAuth
jest.mock('../../context/AuthContext',()=>({useAuth:()=>mockAuth}))
// Real LanguageContext (default English value) — see LeadershipView.test.jsx.
jest.mock('../../context/ThemeContext',()=>({useTheme:()=>({colors:{bg:'#fff',text:'#111',sub:'#666'}})}))
jest.mock('../../services/api',()=>({get:jest.fn(),post:jest.fn()}))
jest.mock('expo-router',()=>({useRouter:()=>({push:jest.fn()})}))
const response=items=>({data:{data:items}})
const item={instance_id:'approval',employee_name:'Private Employee',request_type:'leave'}
beforeEach(()=>{
  mockAuth={user:{id:'manager',company_id:'tenant',role:'manager'},can:()=>true}
  api.get.mockReset();api.post.mockReset()
  api.get.mockResolvedValue(response([item]))
})
afterEach(()=>jest.restoreAllMocks())
test('account switch clears previous approvals and ignores late old-account responses',async()=>{
  const view=render(<ApprovalsScreen/>);
  await screen.findByText('Private Employee')
  let oldResponse
  api.get.mockImplementationOnce(()=>new Promise(resolve=>{oldResponse=resolve}))
  fireEvent(screen.UNSAFE_getByType(require('react-native').RefreshControl),'refresh')
  api.get.mockImplementation(()=>new Promise(()=>{}))
  mockAuth.user={...mockAuth.user,id:'another-manager'}
  view.rerender(<ApprovalsScreen/>);
  expect(screen.queryByText('Private Employee')).toBeNull()
  await act(async()=>oldResponse(response([item])))
  expect(screen.queryByText('Private Employee')).toBeNull()
})
test('confirmation opened by a previous account cannot submit a decision',async()=>{
  jest.spyOn(Alert,'alert').mockImplementation(()=>{})
  const view=render(<ApprovalsScreen/>);
  await screen.findByText('Private Employee')
  fireEvent.press(screen.getByText('Approve'))
  const confirm=Alert.alert.mock.calls[0][2].find(button=>button.text==='Confirm')
  api.get.mockImplementation(()=>new Promise(()=>{}))
  mockAuth.user={...mockAuth.user,id:'another-manager'}
  view.rerender(<ApprovalsScreen/>);
  await act(async()=>confirm.onPress())
  expect(api.post).not.toHaveBeenCalled()
})

test('requests with an amount show it as money (regression: cur is text, not a function)',async()=>{
  api.get.mockResolvedValue(response([{instance_id:'loan',employee_name:'Loan Employee',request_type:'loan',amount:15000}]))
  render(<ApprovalsScreen/>);
  expect(await screen.findByText('EGP 15,000')).toBeTruthy()
})
