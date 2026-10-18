import assert from 'node:assert/strict'

// Fixed staging target: no credentials, tenant creation or business writes.
const base='https://hr-dock-backend-staging.up.railway.app'
const request=(path,headers={})=>fetch(base+path,{headers,redirect:'error',signal:AbortSignal.timeout(15000)})
let healthError
for(let attempt=1;attempt<=6;attempt++){
  try{
    const response=await request('/health')
    assert.equal(response.status,200,'Health must return HTTP 200')
    const body=await response.json()
    assert.equal(body.success,true)
    assert.equal(body.status,'healthy')
    healthError=null
    console.log('PASS staging health and database readiness')
    break
  }catch(error){
    healthError=error
    if(attempt<6)await new Promise(resolve=>setTimeout(resolve,5000))
  }
}
if(healthError)throw healthError

for(const path of ['/leadership/access','/leadership/workforce','/leadership/forecast','/leadership/performance','/leadership/coverage','/mobile-access/me']){
  for(const channel of ['web','mobile']){
    const response=await request('/api/v1'+path,{'X-HRDock-Channel':channel})
    assert.equal(response.status,401,`${channel} ${path} must require authentication`)
    assert.match(response.headers.get('content-type') || '',/application\/json/)
    assert.equal((await response.json()).success,false)
    console.log(`PASS ${channel} ${path}: anonymous access denied`)
  }
}
const invalid=await request('/api/v1/leadership/forecast',{Authorization:'Bearer invalid-staging-smoke-token'})
assert.equal(invalid.status,401,'Invalid credentials must be refused')
console.log('PASS invalid credentials denied')
console.log('Staging smoke passed. Authenticated role walkthroughs and device checks are separate release gates.')
