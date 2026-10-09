import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createDeviceState,advanceDevice,resetDeviceAlarm} from '../src/device-state.js'
test('fault raises once during fork pickup and freezes only that device',()=>{
 const faulted=createDeviceState(),healthy=createDeviceState();faulted.pending=true
 let alarms=0
 for(let i=0;i<200;i++){alarms+=Number(advanceDevice(faulted,.05).raised);advanceDevice(healthy,.05)}
 assert.equal(alarms,1);assert.equal(faulted.alarm.code,'FORK-101');assert.equal(faulted.alarm.phase,'伸叉取货')
 const frozen=advanceDevice(faulted,0).sample,t=faulted.time
 for(let i=0;i<100;i++){advanceDevice(faulted,.05);advanceDevice(healthy,.05)}
 assert.equal(faulted.time,t);assert.deepEqual(advanceDevice(faulted,0).sample,frozen);assert.ok(healthy.time>t)
 resetDeviceAlarm(faulted);assert.equal(faulted.alarm,null);advanceDevice(faulted,.1);assert.ok(faulted.time>t)
})
test('pause freezes devices, canceled and reset demos do not re-trigger',()=>{
 const state=createDeviceState();state.pending=true;advanceDevice(state,5,{running:false});assert.equal(state.time,0);assert.equal(state.alarm,null)
 resetDeviceAlarm(state)
 for(let i=0;i<200;i++)assert.equal(advanceDevice(state,.05).raised,false)
 assert.equal(state.alarm,null)
})
