import {test} from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {EQUIPMENT_ASSETS,EQUIPMENT_CATEGORIES,buildEquipment} from '../src/equipment.js'
test('all catalog equipment has a valid category, independent usable geometry and metre dimensions',()=>{
 assert.equal(new Set(EQUIPMENT_ASSETS.map(a=>a.id)).size,EQUIPMENT_ASSETS.length)
 for(const asset of EQUIPMENT_ASSETS){assert.ok(EQUIPMENT_CATEGORIES.some(c=>c[0]===asset.category));const first=buildEquipment(asset.type),second=buildEquipment(asset.type);assert.notEqual(first,second);const size=new THREE.Box3().setFromObject(first).getSize(new THREE.Vector3());assert.ok(size.toArray().every(n=>Number.isFinite(n)&&n>0),asset.name);assert.ok(size.length()<30,asset.name);let parts=0;first.traverse(o=>{if(o.isMesh)parts++});assert.ok(parts>=5,asset.name);first.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});second.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}
})
test('double-depth rack adds depth; both stacker variants retain separate fork layers',()=>{
 const single=new THREE.Box3().setFromObject(buildEquipment('rack')).getSize(new THREE.Vector3()),double=new THREE.Box3().setFromObject(buildEquipment('rack-double')).getSize(new THREE.Vector3());assert.ok(double.z>single.z*1.8);assert.equal(single.x,double.x)
 for(const type of ['stacker','stacker-high']){const object=buildEquipment(type);assert.ok(object.getObjectByName('上层货叉'));assert.ok(object.getObjectByName('下层货叉'));assert.ok(object.getObjectByName('安全梯踏步'));assert.ok(object.getObjectByName('提升钢丝绳'))}
})
