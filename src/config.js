export const DEFAULT_CONFIG={cranes:3,columns:11,levels:5}
export function normalizeConfig(value={}){
 const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)))):fallback
 return {cranes:clamp(value.cranes,1,4,3),columns:clamp(value.columns,4,16,11),levels:clamp(value.levels,2,6,5)}
}
export function occupancy(config){
 let used=0
 for(let r=0;r<config.cranes+1;r++)for(let c=0;c<config.columns;c++)for(let l=0;l<config.levels;l++)if((c+l+r)%7!==0&&!(r===0&&l===0&&(c===1||c===2)))used++
 return {used,total:(config.cranes+1)*config.columns*config.levels}
}
export function transferPoints(config,index=0){
 return {pickup:{x:(Math.min(3+index,config.columns-1)-(config.columns-1)/2)*4,y:3.48},drop:{x:(config.columns-1)*2+6,y:2}}
}
