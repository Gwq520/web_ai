import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
export function createWarehouse(container, select) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#081321')
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 400); camera.position.set(49, 38, 53)
  const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); container.appendChild(renderer.domElement)
  const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 7, 0); controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2.05
  scene.add(new THREE.HemisphereLight(0xc7e9ff, 0x233047, 2.5)); const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(20, 40, 15); scene.add(light)
  const materials = {}; const machines = []; const targets = []
  function box(parent, x,y,z,w,h,d,color) { const key = color; materials[key] ||= new THREE.MeshStandardMaterial({color,metalness:.35,roughness:.55}); const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materials[key]); mesh.position.set(x,y,z); parent.add(mesh); return mesh }
  box(scene,0,-.3,0,65,.6,43,'#142a3a'); const grid = new THREE.GridHelper(64,32,0x236071,0x1c3b4a); grid.position.y=.02; scene.add(grid)
  for(let row=0;row<4;row++) { const z=(row-1.5)*10
    for(let col=0;col<11;col++) { const x=(col-5)*4
      for(const dz of [-1.6,1.6]) box(scene,x-1.9,8,z+dz,.14,16,.14,'#366581')
      for(let level=0;level<5;level++) { const y=level*3+1; box(scene,x,y,z,3.9,.18,3.4,'#418aa2')
        if((col+level+row)%7!==0 && !(row===0 && level===0 && (col===1 || col===2))) {box(scene,x,y+.28,z,2.8,.35,2.5,'#ac804e'); box(scene,x,y+1.25,z,2.55,1.65,2.25,(col+row)%3===0?'#a3bdc7':'#657f97')}
      }
    }
  }
  for(let i=0;i<3;i++) {const crane=new THREE.Group(); const z=(i-1)*10; crane.position.set(-16+i*10,0,z); scene.add(crane)
    box(scene,0,.35,z,50,.15,.15,'#38a9d1').position.x=0
    box(crane,0,.9,0,5.5,1.1,2.1,'#eab649')
    for(const x of [-2,2]) box(crane,x,8.5,0,.42,15,.55,'#f4c864')
    box(crane,0,16,0,5.5,.45,.8,'#f4c864')
    for(let y=1.5;y<16;y+=.65) box(crane,-2.75,y,0,.65,.08,.12,'#eed17c')
    for(const x of [-3.05,-2.45]) box(crane,x,8.5,0,.07,15,.1,'#eed17c')
    box(crane,-3.1,6,0,1.6,.15,2,'#f4c864')
    for(const dz of [-.9,.9]){box(crane,-3.8,6.65,dz,.08,1.3,.08,'#f4c864');box(crane,-3.1,7.25,dz,1.5,.08,.08,'#f4c864')}
    for(const x of [-2,2]) {box(crane,x,8.3,.4,.035,15,.035,'#c6dce3');for(const y of [.5,16.35]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.25,16),materials['#345366'] ||= new THREE.MeshStandardMaterial({color:'#345366'}));wheel.rotation.x=Math.PI/2;wheel.position.set(x,y,0);crane.add(wheel)}}
    box(crane,2.8,4,.15,.7,1.8,.9,'#294fd1');box(crane,2.7,1.7,.15,.7,.9,.9,'#294fd1')
    const carriage=new THREE.Group(); crane.add(carriage); box(carriage,0,0,0,4.2,.4,2.8,'#e8a637'); box(carriage,0,.7,0,2.5,1.1,2,'#b2cbd4')
    for(const x of [-.8,.8]) box(carriage,x,-.25,1.2,.16,.15,2.2,'#dae8ed')
    const beacon=box(crane,0,16.5,0,.4,.4,.4,'#43ffc2'); beacon.material=new THREE.MeshBasicMaterial({color:0x43ffc2})
    crane.traverse(o=>{if(o.isMesh){o.userData.machine=i;targets.push(o)}}); machines.push({crane,carriage})
  }
  for(const z of [-19,19]) {box(scene,0,.8,z,47,.5,2,'#345366');for(let x=-23;x<24;x+=1)box(scene,x,1.08,z,.25,.1,1.9,'#839eac')}
  let running=true,frame,time=0; const clock=new THREE.Clock()
  function animate(){frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(running)time+=dt;machines.forEach((m,i)=>{m.crane.position.x=Math.sin(time*.18+i*2)*18;m.carriage.position.y=3+ (Math.sin(time*.35+i)+1)*5});controls.update();renderer.render(scene,camera)}; animate()
  const resize=()=>{const {width,height}=container.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height)};const observer=new ResizeObserver(resize);observer.observe(container);resize()
  const ray=new THREE.Raycaster();const pointer=new THREE.Vector2();let down
  const onDown=e=>{down=[e.clientX,e.clientY]};const onClick=e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(targets)[0];if(hit)select(hit.object.userData.machine)}
  renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerup',onClick)
  return {setRunning:v=>running=v, reset:()=>{camera.position.set(49,38,53);controls.target.set(0,7,0)},top:()=>{camera.position.set(0,76,.01);controls.target.set(0,0,0)},dispose:()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose()});Object.values(materials).forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove()}}
}
