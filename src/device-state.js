import {DEFAULT_ALARM} from './alarm-catalog.js'
import {sampleMotion} from './motion.js'
export function createDeviceState(){return {time:0,pending:false,alarm:null}}
export function advanceDevice(device,dt,{running=true,speed=1,mode='double',direction=1,index=0,route=null}={}){
 if(running&&!device.alarm)device.time+=dt*speed
 const sample=sampleMotion(device.time,mode,direction,index,route)
 let raised=false
 const definition=device.pendingDefinition||DEFAULT_ALARM
 if(device.pending&&(definition.phase===null||(sample.phase===definition.phase&&sample.progress>=.2))){device.pending=false;device.alarm={code:definition.code,message:definition.message,category:definition.category,severity:definition.severity,phase:sample.label};raised=true}
 return {sample,raised}
}
export function resetDeviceAlarm(device){device.pending=false;device.pendingDefinition=null;device.alarm=null}
