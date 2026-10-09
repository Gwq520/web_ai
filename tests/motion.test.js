import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sampleMotion, CYCLE_SECONDS } from '../src/motion.js'
for (const mode of ['single','double']) for (const direction of [-1,1]) {
  test(`${mode}, direction ${direction}: layer travel and interlocks`,()=>{
    for(let t=0;t<CYCLE_SECONDS;t+=.1){
      const s=sampleMotion(t,mode,direction),next=sampleMotion(t+.01,mode,direction)
      if(mode==='single')assert.equal(s.lower,0)
      else assert.ok(Math.abs(s.upper-2*s.lower)<1e-9)
      assert.ok(s.upper*direction>=0)
      if([1,3,5,7].includes(s.phase)&&next.phase===s.phase){assert.equal(s.x,next.x);assert.equal(s.y,next.y)}
      if([0,4].includes(s.phase))assert.ok(s.upper===0)
    }
    assert.equal(sampleMotion(10,mode,direction).upper,direction*(mode==='double'?5:2.5))
    assert.ok(sampleMotion(CYCLE_SECONDS,mode,direction).upper===0)
  })
}
test('position and fork travel remain continuous across phases',()=>{
 for(const t of [6,10,12,16,22,26,28,32]){
  const a=sampleMotion(t-.0001),b=sampleMotion(t)
  for(const k of ['x','y','upper','lower'])assert.ok(Math.abs(a[k]-b[k])<.001,`${t}: ${k}`)
 }
})
