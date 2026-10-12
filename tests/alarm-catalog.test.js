import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ALARM_CATALOG} from '../src/alarm-catalog.js'
import {createDeviceState,advanceDevice} from '../src/device-state.js'
test('alarm catalog has unique names and internal codes, including each fork depth',()=>{assert.equal(new Set(ALARM_CATALOG.map(a=>a.code)).size,ALARM_CATALOG.length);assert.equal(new Set(ALARM_CATALOG.map(a=>a.message)).size,ALARM_CATALOG.length);for(const name of ['手动','急停','取货后堆垛机近叉无货','取货后堆垛机中叉无货','取货后堆垛机远叉无货','右回叉时左超界'])assert.ok(ALARM_CATALOG.some(a=>a.message===name))})
test('each configured alarm triggers once at its specified phase and retains metadata',()=>{for(const definition of ALARM_CATALOG){const device=createDeviceState();device.pending=true;device.pendingDefinition=definition;let raised=0,last;for(let i=0;i<700;i++){last=advanceDevice(device,.05);raised+=Number(last.raised)}assert.equal(raised,1,definition.message);assert.equal(device.alarm.message,definition.message);assert.equal(device.alarm.code,definition.code);if(definition.phase!==null)assert.equal(last.sample.phase,definition.phase)}})
