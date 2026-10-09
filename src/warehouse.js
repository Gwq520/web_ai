import * as THREE from 'three'
import { normalizeConfig, transferPoints } from './config'
import { sampleMotion } from './motion'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
export function createWarehouse(container, select, onTelemetry, options={}) {
  const config=normalizeConfig(options);const rows=config.cranes+1;const halfLength=(config.columns-1)*2;const halfDepth=(rows-1)*5;const craneHeight=config.levels*3+1;const docks=[]
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#081321')
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 400); camera.position.set(57, 44, 66)
  const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); container.appendChild(renderer.domElement)
  const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 7, 0); controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2.05
  scene.add(new THREE.HemisphereLight(0xc7e9ff, 0x233047, 2.5)); const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(20, 40, 15); scene.add(light)
  const materials = {}; const machines = []; const targets = []; const rackMeshes = []; let focusIndex = null; let speed = 1; let telemetryAt = 0; let forkMode='double'; let forkDirection=1
  function box(parent, x,y,z,w,h,d,color) { const key = color; materials[key] ||= new THREE.MeshStandardMaterial({color,metalness:.35,roughness:.55}); const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materials[key]); mesh.position.set(x,y,z); parent.add(mesh); return mesh }
  function cylinder(parent,x,y,z,r,length,color,axis='z') {
    materials[color] ||= new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.32})
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,12),materials[color]); if(axis==='z') mesh.rotation.x=Math.PI/2; else if(axis==='x') mesh.rotation.z=Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);return mesh
  }
  function pallet(parent,x,y,z) {
    const group=new THREE.Group();group.position.set(x,y,z);parent.add(group)
    for(const dz of [-.9,0,.9]) box(group,0,.15,dz,2.8,.3,.3,'#1876b3')
    box(group,0,.35,0,2.8,.15,2.5,'#248ccc')
    for(const dx of [-.65,.65])for(const dz of [-.56,.56]){box(group,dx,1.25,dz,1.24,1.65,1.06,'#b3976c');box(group,dx,2.081,dz,.06,.015,1.06,'#d4c2a1')}
    box(group,0,1.2,1.095,.48,.34,.015,'#e6e4dc');return group
  }
  box(scene,0,-.3,0,halfLength*2+30,.6,halfDepth*2+18,'#142a3a'); const grid = new THREE.GridHelper(Math.max(halfLength*2+30,halfDepth*2+18),40,0x236071,0x1c3b4a); grid.position.y=.02; scene.add(grid)
  for(let row=0;row<rows;row++) { const z=(row-(rows-1)/2)*10
    for(let col=0;col<config.columns;col++) { const x=(col-(config.columns-1)/2)*4
      for(const dz of [-1.6,1.6]) box(scene,x-1.9,craneHeight/2,z+dz,.14,craneHeight,.14,'#366581')
      for(let level=0;level<config.levels;level++) { const y=level*3+1; box(scene,x,y,z,3.9,.18,3.4,'#418aa2')
        if((col+level+row)%7!==0 && !(row===0 && level===0 && (col===1 || col===2))) {pallet(scene,x,y+.12,z)}
      }
    }
  }
  // Batch repeated rack and cargo parts into instanced draws.
  scene.updateMatrixWorld(true)
  const batches=new Map()
  scene.traverse(o=>{if(o.isMesh && o.getWorldPosition(new THREE.Vector3()).y>0){const key=JSON.stringify(o.geometry.parameters)+o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o)}})
  batches.forEach(meshes=>{const first=meshes[0];const instance=new THREE.InstancedMesh(first.geometry,first.material.clone(),meshes.length);meshes.forEach((m,i)=>{instance.setMatrixAt(i,m.matrixWorld);m.removeFromParent();if(m.geometry!==first.geometry)m.geometry.dispose()});instance.computeBoundingSphere();scene.add(instance);rackMeshes.push(instance)})
  for(let i=0;i<config.cranes;i++) {const crane=new THREE.Group(); const z=(i-(config.cranes-1)/2)*10; crane.position.set(-16+i*10,0,z); scene.add(crane)
    box(scene,0,.35,z,halfLength*2+16,.15,.15,'#38a9d1').position.x=0
    box(crane,0,.9,0,5.5,1.1,2.1,'#eab649')
    for(const x of [-2,2]) box(crane,x,craneHeight/2,0,.42,craneHeight-1,.55,'#f4c864')
    box(crane,0,craneHeight,0,5.5,.45,.8,'#f4c864')
    for(let y=1.5;y<craneHeight;y+=.65) box(crane,-2.75,y,0,.65,.08,.12,'#eed17c')
    for(const x of [-3.05,-2.45]) box(crane,x,craneHeight/2,0,.07,craneHeight-1,.1,'#eed17c')
    box(crane,-3.1,6,0,1.6,.15,2,'#f4c864')
    for(const dz of [-.9,.9]){box(crane,-3.8,6.65,dz,.08,1.3,.08,'#f4c864');box(crane,-3.1,7.25,dz,1.5,.08,.08,'#f4c864')}
    for(const x of [-2,2]) {box(crane,x,craneHeight/2,.4,.035,craneHeight-1,.035,'#c6dce3');for(const y of [.5,craneHeight+.35]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.25,16),materials['#345366'] ||= new THREE.MeshStandardMaterial({color:'#345366'}));wheel.rotation.x=Math.PI/2;wheel.position.set(x,y,0);crane.add(wheel)}}
    box(crane,2.8,4,.15,.7,1.8,.9,'#294fd1');box(crane,2.7,1.7,.15,.7,.9,.9,'#294fd1')
    const carriage=new THREE.Group(); crane.add(carriage); box(carriage,0,0,0,4.2,.4,2.8,'#e8a637')
    const lowerFork=new THREE.Group();carriage.add(lowerFork)
    const upperFork=new THREE.Group();lowerFork.add(upperFork)
    // Two parallel fork rails per layer, symmetric about the carrier centre.
    for(const x of [-.75,.75]) {
      box(carriage,x,.26,0,.38,.12,2.8,'#394653')
      box(lowerFork,x,.4,0,.3,.14,2.8,'#657584')
      box(upperFork,x,.55,0,.24,.14,2.8,'#c6dce3')
      for(let z=-1.1;z<1.2;z+=.35)cylinder(carriage,x,.29,z,.075,.42,'#99aab5','x')
    }
    box(carriage,0,.15,-1.2,1.7,.16,.2,'#394653')
    const cargo=pallet(scene,0,0,0)
    const beacon=box(crane,0,craneHeight+.5,0,.4,.4,.4,'#43ffc2'); beacon.material=new THREE.MeshBasicMaterial({color:0x43ffc2})
    crane.traverse(o=>{if(o.isMesh){o.userData.machine=i;targets.push(o)}}); const outline=new THREE.BoxHelper(crane,0x36efda);outline.visible=false;scene.add(outline);machines.push({crane,carriage,outline,lowerFork,upperFork,cargo})
  }
  // Each aisle has a handoff conveyor on both sides of the travel rail.
  for(let i=0;i<config.cranes;i++)for(const side of [-1,1]) {
    const dock=new THREE.Group();scene.add(dock);const x=transferPoints(config,i).drop.x
    dock.position.set(x,0,(i-(config.cranes-1)/2)*10+side*5)
    box(dock,4,2.25,0,10,.35,2.8,'#345366')
    for(let dx=-.8;dx<9;dx+=.5)cylinder(dock,dx,2.51,0,.13,2.6,'#99aab5')
    for(const edge of [-1.6,1.6]){box(dock,4,3.8,edge,10,.08,.08,'#eab649');for(const dx of [-1,4,9]){box(dock,dx,2,edge,.1,3.6,.1,'#eab649');box(dock,dx,1,edge/2,.15,2,.15,'#345366')}}
    box(dock,9,2,2.3,1,3,1,'#c8d7df');docks.push({dock,index:i,side})
  }
  function positionDocks(){const reach=forkMode==='double'?5:2.5;docks.forEach(({dock,index,side})=>dock.position.z=(index-(config.cranes-1)/2)*10+side*reach)}
  camera.position.set(halfLength+38,craneHeight+28,halfDepth+48);controls.target.set(4,craneHeight/2,0)
  let running=true,frame,time=0; const clock=new THREE.Clock()
  function animate(){
    frame=requestAnimationFrame(animate)
    const dt=Math.min(clock.getDelta(),.05);if(running)time+=dt*speed
    const samples=machines.map((m,i)=>{
      const state=sampleMotion(time,forkMode,forkDirection,i,transferPoints(config,i))
      m.crane.position.x=state.x;m.carriage.position.y=state.y
      m.lowerFork.position.z=state.lower;m.upperFork.position.z=state.upperRelative
      m.cargo.position.set(state.cargo.x,state.cargo.y,m.crane.position.z+state.cargo.z)
      if(m.outline.visible)m.outline.update()
      return {x:state.x.toFixed(1),height:state.y.toFixed(1),lower:state.lower.toFixed(2),upper:state.upper.toFixed(2),phase:state.label,progress:Math.round(state.progress*100),mode:state.mode,direction:state.direction}
    })
    if(focusIndex!==null){const m=machines[focusIndex];const target=new THREE.Vector3(m.crane.position.x,m.carriage.position.y+1,m.crane.position.z);const delta=target.clone().sub(controls.target);camera.position.add(delta);controls.target.copy(target)}
    if(time-telemetryAt>.1||telemetryAt===0){telemetryAt=time;onTelemetry?.(samples)}
    controls.update();renderer.render(scene,camera)
  }; animate()
  const resize=()=>{const {width,height}=container.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height)};const observer=new ResizeObserver(resize);observer.observe(container);resize()
  const ray=new THREE.Raycaster();const pointer=new THREE.Vector2();let down
  const onDown=e=>{down=[e.clientX,e.clientY]};const onClick=e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(targets)[0];if(hit)select(hit.object.userData.machine)}
  renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerup',onClick)
  return {setForkMode:v=>{forkMode=v;positionDocks();time=0;telemetryAt=0},setForkDirection:v=>{forkDirection=v;time=0;telemetryAt=0},setRunning:v=>running=v,setSpeed:v=>speed=v,highlight:i=>machines.forEach((m,j)=>m.outline.visible=i===j),setXray:v=>{const unique=new Set(rackMeshes.map(m=>m.material));unique.forEach(m=>{m.transparent=v;m.opacity=v?.18:1;m.depthWrite=!v})},focus:i=>{focusIndex=i;rackMeshes.forEach(m=>m.visible=false);const m=machines[i];controls.target.set(m.crane.position.x,m.carriage.position.y+1,m.crane.position.z);camera.position.set(m.crane.position.x+11,m.carriage.position.y+7,m.crane.position.z+16)},reset:()=>{focusIndex=null;rackMeshes.forEach(m=>m.visible=true);camera.position.set(halfLength+38,craneHeight+28,halfDepth+48);controls.target.set(4,craneHeight/2,0)},top:()=>{focusIndex=null;rackMeshes.forEach(m=>m.visible=true);camera.position.set(4,Math.max(85,halfLength*3),.01);controls.target.set(0,0,0)},dispose:()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();const disposed=new Set();scene.traverse(o=>{o.geometry?.dispose();if(o.material&&!disposed.has(o.material)){o.material.dispose();disposed.add(o.material)}});renderer.dispose();renderer.domElement.remove()}}
}
