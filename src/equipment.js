import * as THREE from 'three'
export const EQUIPMENT_CATEGORIES=[['stacker','堆垛设备'],['rack','存储货架'],['conveyor','输送设备'],['pallet','托盘与货物'],['robot','AGV / AMR'],['lift','提升设备'],['station','作业站台'],['safety','安全设施'],['other','其他设备']]
const asset=(id,name,category,type,description,spec)=>({id,name,category,type,description,spec,builtin:true,units:'m'})
export const EQUIPMENT_ASSETS=[
 asset('builtin-stacker','堆垛机 · 示意模型','stacker','stacker','双立柱、双层货叉、检修梯台、行走及提升驱动','高 8 m · 双层居中货叉'),
 asset('stacker-high','高位双立柱堆垛机','stacker','stacker-high','加高门架、导轨及提升钢丝绳','高 14 m · 双立柱'),
 asset('builtin-rack','货架 · 示意模型','rack','rack','单深托盘货架，开放横梁与侧向斜撑','单深 · 3 列 × 4 层'),
 asset('rack-double','双深托盘货架','rack','rack-double','近位与远位两排独立货架，匹配双伸货叉','双深 · 2 排 × 3 列 × 4 层'),
 asset('builtin-conveyor','输送线 · 示意模型','conveyor','roller','金属滚筒、支腿、侧梁、驱动及光电传感器','滚筒线 · 长 6 m'),
 asset('conveyor-belt','皮带输送机','conveyor','belt','连续皮带、端部滚筒、支撑及驱动','皮带线 · 长 6 m'),
 asset('conveyor-transfer','顶升移载台','conveyor','transfer','滚筒工作台与垂直方向移载链条','移载台 · 2.4 × 2 m'),
 asset('builtin-pallet','托盘 · 示意模型','pallet','pallet','蓝色九脚塑料托盘、开放叉孔和网格顶面','1.2 × 1 m · 九脚'),
 asset('pallet-loaded','带货托盘','pallet','loaded','九脚托盘、组合纸箱及包裹带','托盘 + 4 件纸箱'),
 asset('robot-amr','潜伏式 AMR','robot','amr','低位移动底盘、升降顶板、轮组及激光雷达','1.1 × 0.85 m · 静态模型'),
 asset('robot-forklift','托盘搬运 AGV','robot','agv','搬运车底盘、立式操纵机构、双货叉及检测器','双叉搬运 · 静态模型'),
 asset('lift-pallet','托盘提升机','lift','lift','四柱井架、提升平台、顶部驱动与防护网','高 6 m · 提升平台'),
 asset('station-pick','人工拣选工作站','station','station','工作台、滚筒入口、显示终端及状态灯','拣选台 · 带终端'),
 asset('safety-fence','安全围栏与门','safety','fence','分段网格围栏、立柱和人员检修门','长 5 m · 带门'),
 asset('safety-cabinet','控制柜与信号灯','safety','cabinet','电气控制柜、触屏、急停及三色信号灯','控制终端 · 三色灯')
]
export function buildEquipment(type){
 const root=new THREE.Group();root.name=type;const materials=new Map(),geometries=new Map()
 const mat=c=>{if(!materials.has(c))materials.set(c,new THREE.MeshStandardMaterial({color:c,metalness:c==='#218ada'?.08:.4,roughness:.48}));return materials.get(c)}
 const part=(name,geometry,x,y,z,c,parent=root)=>{const mesh=new THREE.Mesh(geometry,mat(c));mesh.name=name;mesh.position.set(x,y,z);parent.add(mesh);return mesh}
 const box=(name,x,y,z,w,h,d,c,parent=root)=>{const key=[w,h,d].join('/');if(!geometries.has(key))geometries.set(key,new THREE.BoxGeometry(w,h,d));return part(name,geometries.get(key),x,y,z,c,parent)}
 const cylinder=(name,x,y,z,r,length,c,axis='z',parent=root)=>{const m=part(name,new THREE.CylinderGeometry(r,r,length,16),x,y,z,c,parent);if(axis==='z')m.rotation.x=Math.PI/2;if(axis==='x')m.rotation.z=Math.PI/2;return m}
 const orange='#f38a24',steel='#a5bbc8',dark='#293d4b',blue='#347c9d'
 const pallet=(x,y,z,loaded=false)=>{const g=new THREE.Group();g.name='托盘';g.position.set(x,y,z);root.add(g);for(const a of [-.45,0,.45])for(const b of [-.36,0,.36])box('支脚',a,.1,b,.18,.2,.2,'#218ada',g);for(let a=-.55;a<.6;a+=.1)box('面板纵筋',a,.24,0,.035,.08,1,'#218ada',g);for(let b=-.45;b<.5;b+=.1)box('面板横筋',0,.24,b,1.2,.08,.035,'#218ada',g);for(const b of [-.36,0,.36])box('底梁',0,.035,b,1.2,.07,.18,'#218ada',g);if(loaded)for(const a of [-.28,.28])for(const b of [-.22,.22]){box('纸箱',a,.66,b,.52,.75,.4,'#b89b70',g);box('封箱胶带',a,1.04,b,.055,.01,.4,'#dccda9',g)}}
 const conveyor=(length=6,width=1.4,offset=0,belt=false)=>{box('输送主梁',0,.8,offset,length,.2,width,dark);for(const x of [-length/2+.4,length/2-.4])for(const z of [-width/2+.12,width/2-.12])box('可调支腿',x,.4,z+offset,.1,.8,.1,steel);for(const z of [-width/2,width/2])box('侧护梁',0,1,offset+z,length,.12,.08,steel);if(belt)box('输送皮带',0,1.02,offset,length-.15,.06,width-.18,'#344b59');else for(let x=-length/2+.15;x<length/2;x+=.25)cylinder('滚筒',x,1.02,offset,.07,width-.12,steel);cylinder('驱动电机',length/2-.4,.8,offset+width/2+.18,.14,.35,dark);box('光电传感器',length/2-.5,1.13,offset-width/2-.03,.13,.13,.1,'#1edfc6')}
 if(type.startsWith('stacker')){const h=type==='stacker-high'?14:8;box('下横梁',0,.38,0,3.2,.4,1.3,orange);for(const x of [-1.25,1.25]){box('立柱腹板',x,h/2,0,.17,h,.35,orange);for(const z of [-.18,.18])box('立柱翼缘',x,h/2,z,.27,h,.045,orange);box('精密导轨',x-Math.sign(x)*.12,h/2,.22,.04,h,.04,steel);for(const y of [.2,h+.15])cylinder('导轮',x,y,0,.18,.16,dark)}box('上横梁',0,h,0,3.1,.2,.6,orange);for(const x of [-1.95,-1.5])box('安全梯侧梁',x,h/2,0,.035,h,.055,steel);for(let y=.5;y<h;y+=.35)box('安全梯踏步',-1.72,y,0,.48,.04,.08,steel);box('检修平台',-1.85,h*.45,0,.95,.08,1,steel);for(const z of [-.45,.45]){box('平台扶手',-1.85,h*.45+.75,z,.95,.04,.04,orange);box('平台护栏',-2.3,h*.45+.4,z,.04,.8,.04,orange)}box('载货台',0,2,0,2.2,.16,1.6,orange);for(const x of [-.4,.4]){box('下层货叉',x,2.18,0,.19,.12,1.8,dark);box('上层货叉',x,2.3,0,.15,.09,1.8,steel)}for(const x of [-1.05,1.05])box('提升钢丝绳',x,h/2,-.25,.02,h,.02,steel);cylinder('提升电机',1.6,1.3,0,.18,.65,dark,'y');cylinder('卷筒',1.25,.8,0,.22,.55,steel,'x');box('电气箱',-1.4,1,-.25,.35,1.1,.4,steel);cylinder('运行指示灯',0,h+.25,0,.07,.2,'#31e1b8','y')}
 else if(type.startsWith('rack')){const zs=type==='rack-double'?[-1.15,1.15]:[0];for(const center of zs){for(const x of [-3,-1,1,3])for(const z of [-1,1])box('货架立柱',x,3.25,center+z,.08,6.5,.08,blue);for(let y=.6;y<6.5;y+=1.5){for(const z of [-1,1])box('承载横梁',0,y,center+z,6,.1,.08,orange);for(const x of [-2,0,2])box('托盘支撑',x,y,center,.08,.08,2,steel)}for(let y=1.1;y<6;y+=1.5){const brace=box('侧斜撑',-3,y+.3,center,.05,2.4,.05,steel);brace.rotation.x=.8}}}
 else if(type==='roller'||type==='belt')conveyor(6,1.4,0,type==='belt')
 else if(type==='transfer'){conveyor(2.4,2);for(const x of [-.7,.7])box('移载链条',x,1.13,0,.08,.06,1.9,'#2dd4b4');box('顶升机构',0,.5,0,1.6,.3,1.4,blue)}
 else if(type==='pallet'||type==='loaded')pallet(0,0,0,type==='loaded')
 else if(type==='amr'){box('AMR底盘',0,.23,0,1.1,.3,.85,'#eeeeeb');box('顶升托板',0,.42,0,.7,.08,.62,blue);for(const x of [-.35,.35])for(const z of [-.38,.38])cylinder('驱动轮',x,.12,z,.12,.08,dark);cylinder('激光雷达',.4,.44,0,.09,.12,dark,'y');box('状态灯带',0,.28,.435,.6,.035,.01,'#31e1b8')}
 else if(type==='agv'){box('搬运车底盘',-.3,.35,0,1,.4,.8,orange);for(const z of [-.27,.27])box('托盘货叉',.6,.2,z,1.25,.12,.13,dark);box('驱动舱',-.75,.8,0,.35,1.2,.65,dark);box('操纵立杆',-.85,1.5,0,.08,.8,.08,steel);box('操纵手柄',-.85,1.9,0,.1,.06,.35,dark);for(const z of [-.3,.3])cylinder('行走轮',-.5,.14,z,.14,.1,dark)}
 else if(type==='lift'){for(const x of [-.95,.95])for(const z of [-.8,.8])box('井架立柱',x,3,z,.1,6,.1,blue);box('提升平台',0,1.4,0,1.8,.14,1.5,orange);for(const y of [.1,6])for(const z of [-.8,.8])box('井架横梁',0,y,z,2,.12,.12,blue);for(let y=.4;y<6;y+=.4)box('防护网横筋',0,y,-.82,1.9,.025,.025,steel);for(let x=-.9;x<1;x+=.2)box('防护网竖筋',x,3,-.82,.025,6,.025,steel);cylinder('顶部驱动',0,6.18,0,.2,.7,dark,'x')}
 else if(type==='station'){box('操作桌面',0,1.05,0,2.2,.12,1.2,steel);for(const x of [-.95,.95])for(const z of [-.45,.45])box('桌腿',x,.5,z,.09,1,.09,blue);box('操作终端立杆',.6,1.35,-.35,.05,.6,.05,steel);box('终端显示器',.6,1.65,-.35,.65,.42,.06,dark);box('屏幕',.6,1.65,-.31,.58,.35,.015,'#2ea3b3');box('物料箱',-.5,1.28,0,.65,.35,.5,'#218ada')}
 else if(type==='fence'){for(const x of [-2.5,0,2.5])box('围栏立柱',x,1,0,.07,2,.07,orange);for(let x=-2.5;x<2.5;x+=.2)box('网片竖筋',x,1,0,.025,1.9,.025,steel);for(let y=.1;y<2;y+=.2)box('网片横筋',0,y,0,5,.025,.025,steel);box('门锁',1.1,1,.06,.1,.12,.1,dark)}
 else if(type==='cabinet'){box('柜体',0,.9,0,.8,1.8,.5,steel);box('柜门',0,.9,.26,.74,1.7,.04,'#d8e1e5');box('触屏',0,1.25,.29,.4,.28,.03,dark);cylinder('急停按钮',.2,.9,.31,.045,.04,'#f35d62');box('柜门把手',.3,.8,.31,.025,.25,.025,dark);for(const [y,c] of [[1.96,'#31e1b8'],[2.05,'#f1c54e'],[2.14,'#f35d62']])cylinder('三色信号灯',0,y,0,.06,.08,c,'y')}
 else throw Error('未知设备模型类型：'+type)
 return root
}
