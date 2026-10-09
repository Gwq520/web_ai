import {sampleMotion} from './motion.js'
export function createDeviceState(){return {time:0,pending:false,alarm:null}}
export function advanceDevice(device,dt,{running=true,speed=1,mode='double',direction=1,index=0,route=null}={}){
 if(running&&!device.alarm)device.time+=dt*speed
 const sample=sampleMotion(device.time,mode,direction,index,route)
 let raised=false
 if(device.pending&&sample.phase===1&&sample.progress>=.2){device.pending=false;device.alarm={code:'FORK-101',message:'取货货叉驱动异常',phase:sample.label};raised=true}
 return {sample,raised}
}
export function resetDeviceAlarm(device){device.pending=false;device.alarm=null}
