import * as THREE from 'three'
import { normalizeConfig, transferPoints, warehouseLayout } from './config'
import {
  createDeviceState,
  advanceDevice,
  resetDeviceAlarm
} from './device-state'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
export function createWarehouse(
  container,
  select,
  onTelemetry,
  options = {},
  onAlarm
) {
  const config = normalizeConfig(options)
  const layout = warehouseLayout(config)
  const rows = layout.rows.length
  const halfLength = (config.columns - 1) * 2
  const halfDepth = layout.halfDepth
  const craneHeight = config.levels * 3 + 1
  const docks = []
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#081321')
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400)
  camera.position.set(57, 44, 66)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  container.appendChild(renderer.domElement)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 7, 0)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI / 2.05
  scene.add(new THREE.HemisphereLight(0xc7e9ff, 0x233047, 2.5))
  const light = new THREE.DirectionalLight(0xffffff, 3)
  light.position.set(20, 40, 15)
  scene.add(light)
  const materials = {}
  const detailTextures = []
  const machines = []
  const targets = []
  const rackMeshes = []
  let overviewAuto = true
  let focusIndex = null
  let focusWhole = false
  let speed = 1
  let telemetryAt = -1
  let needsRender = true
  let forkMode = config.rackMode
  let forkDirection = 1
  function box(parent, x, y, z, w, h, d, color) {
    const key = color
    materials[key] ||= new THREE.MeshStandardMaterial({
      color,
      metalness: color === '#1876b3' || color === '#248ccc' ? 0.08 : 0.45,
      roughness: 0.48
    })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials[key])
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }
  function cylinder(parent, x, y, z, r, length, color, axis = 'z') {
    materials[color] ||= new THREE.MeshStandardMaterial({
      color,
      metalness: 0.65,
      roughness: 0.32
    })
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, length, 12),
      materials[color]
    )
    if (axis === 'z') mesh.rotation.x = Math.PI / 2
    else if (axis === 'x') mesh.rotation.z = Math.PI / 2
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }
  function pallet(parent, x, y, z) {
    const group = new THREE.Group()
    group.position.set(x, y, z)
    parent.add(group)
    // Nine-foot plastic pallet with open fork pockets and a ribbed deck.
    for (const dx of [-1.12, 0, 1.12])
      for (const dz of [-0.95, 0, 0.95])
        box(group, dx, 0.15, dz, 0.38, 0.3, 0.4, '#1876b3')
    for (const dz of [-0.95, 0, 0.95])
      box(group, 0, 0.04, dz, 2.8, 0.08, 0.4, '#1876b3')
    for (let j = 0; j < 13; j++)
      box(group, -1.35 + j * 0.225, 0.35, 0, 0.07, 0.15, 2.5, '#248ccc')
    for (let j = 0; j < 11; j++)
      box(group, 0, 0.35, -1.2 + j * 0.24, 2.8, 0.15, 0.07, '#248ccc')
    for (const dx of [-1.37, 1.37])
      box(group, dx, 0.34, 0, 0.07, 0.18, 2.5, '#248ccc')
    for (const dz of [-1.22, 1.22])
      box(group, 0, 0.34, dz, 2.8, 0.18, 0.07, '#248ccc')
    for (const dx of [-0.65, 0.65])
      for (const dz of [-0.56, 0.56]) {
        box(group, dx, 1.25, dz, 1.24, 1.65, 1.06, '#b3976c')
        box(group, dx, 2.081, dz, 0.06, 0.015, 1.06, '#d4c2a1')
      }
    box(group, 0, 1.2, 1.095, 0.48, 0.34, 0.015, '#e6e4dc')
    return group
  }
  box(
    scene,
    0,
    -0.3,
    0,
    halfLength * 2 + 30,
    0.6,
    halfDepth * 2 + 18,
    '#142a3a'
  )
  const grid = new THREE.GridHelper(
    Math.max(halfLength * 2 + 30, halfDepth * 2 + 18),
    40,
    0x236071,
    0x1c3b4a
  )
  grid.position.y = 0.02
  scene.add(grid)
  for (let row = 0; row < rows; row++) {
    const z = layout.rows[row].z
    for (let col = 0; col < config.columns; col++) {
      const x = (col - (config.columns - 1) / 2) * 4
      for (const dz of [-1.2, 1.2])
        box(
          scene,
          x - 1.9,
          craneHeight / 2,
          z + dz,
          0.14,
          craneHeight,
          0.14,
          '#366581'
        )
      if (col === config.columns - 1)
        for (const dz of [-1.2, 1.2])
          box(
            scene,
            x + 1.9,
            craneHeight / 2,
            z + dz,
            0.14,
            craneHeight,
            0.14,
            '#366581'
          )
      for (let level = 0; level < config.levels; level++) {
        const brace = box(
          scene,
          x - 1.9,
          level * 3 + 2.5,
          z,
          0.08,
          Math.hypot(2.4, 2.7),
          0.08,
          '#86a0b2'
        )
        brace.rotation.x = (level % 2 ? 1 : -1) * Math.atan2(2.4, 2.7)
      }
      for (let level = 0; level < config.levels; level++) {
        const y = level * 3 + 1
        for (const dz of [-1.15, 1.15])
          box(scene, x, y, z + dz, 3.9, 0.18, 0.12, '#418aa2')
        for (const dx of [-1.2, 1.2])
          box(scene, x + dx, y, z, 0.1, 0.12, 2.4, '#66869c')
        if (
          (col + level + row) % 7 !== 0 &&
          !(row === 0 && level === 0 && (col === 1 || col === 2))
        ) {
          pallet(scene, x, y + 0.12, z)
        }
      }
    }
  }
  // Batch repeated rack and cargo parts into instanced draws.
  scene.updateMatrixWorld(true)
  const batches = new Map()
  scene.traverse((o) => {
    if (o.isMesh && o.getWorldPosition(new THREE.Vector3()).y > 0) {
      const key = JSON.stringify(o.geometry.parameters) + o.material.uuid
      if (!batches.has(key)) batches.set(key, [])
      batches.get(key).push(o)
    }
  })
  batches.forEach((meshes) => {
    const first = meshes[0]
    const instance = new THREE.InstancedMesh(
      first.geometry,
      first.material.clone(),
      meshes.length
    )
    meshes.forEach((m, i) => {
      instance.setMatrixAt(i, m.matrixWorld)
      m.removeFromParent()
      if (m.geometry !== first.geometry) m.geometry.dispose()
    })
    instance.computeBoundingSphere()
    scene.add(instance)
    rackMeshes.push(instance)
  })
  for (let i = 0; i < config.cranes; i++) {
    const crane = new THREE.Group()
    const z = layout.aisles[i].z
    crane.position.set(-16 + i * 10, 0, z)
    scene.add(crane)
    crane.scale.x = 0.78
    box(
      scene,
      0,
      0.35,
      z,
      halfLength * 2 + 16,
      0.15,
      0.15,
      '#38a9d1'
    ).position.x = 0
    box(crane, 0, 0.85, 0, 5.25, 0.45, 1.7, '#dc1824')
    box(crane, 0, 0.46, 0, 5.1, 0.18, 1.9, '#172838')
    for (const dx of [-2.25, 2.25])
      for (const dz of [-0.7, 0.7]) {
        cylinder(crane, dx, 0.42, dz, 0.32, 0.23, '#263441')
        cylinder(
          crane,
          dx,
          0.42,
          dz + Math.sign(dz) * 0.13,
          0.14,
          0.02,
          '#aabac5'
        )
      }
    for (const dx of [-2, 2])
      for (const dz of [-0.85, 0.85])
        cylinder(crane, dx, 1.19, dz, 0.055, 0.04, '#aabac5', 'y')
    const mastHeight = craneHeight - 0.5
    const mastCenterY = (craneHeight + 0.5) / 2
    for (const x of [-2, 2]) {
      box(crane, x, mastCenterY, 0, 0.25, mastHeight, 0.40, '#dc1824')
      for (const dz of [-0.26, 0.26])
        box(
          crane,
          x,
          mastCenterY,
          dz,
          0.38,
          mastHeight,
          0.055,
          '#ef2430'
        )
      box(
        crane,
        x - Math.sign(x) * 0.25,
        mastCenterY,
        0.02,
        0.08,
        mastHeight,
        0.35,
        '#8f9faa'
      )
      for (let y = 2; y < craneHeight - 1; y += 2.1)
        for (const dz of [-0.31, 0.31])
          cylinder(crane, x, y, dz, 0.045, 0.025, '#263441')
    }
    for(const x of [-1.7,1.7]) {
      box(crane,x,craneHeight/2,-.25,.06,craneHeight-1,.06,'#202d38')
      for(let y=1.4;y<craneHeight;y+=.45)box(crane,x, y,-.30,.07,.07,.05,'#667a88')
    }
    box(crane, 0, craneHeight, 0, 5.15, 0.38, 0.65, '#dc1824')
    for (const columnX of [-2, 2]) {
      box(crane, columnX, craneHeight - 0.05, 0, 0.8, 0.65, 0.72, '#ef2430')
      for (const boltOffsetX of [-0.23, 0.23]) {
        for (const boltOffsetY of [-0.18, 0.18]) {
          cylinder(crane, columnX + boltOffsetX, craneHeight + boltOffsetY - 0.05, 0.38, 0.055, 0.04, '#263441')
        }
      }
    }
    // 梯面位于门架外侧的 YZ 平面，梯面朝向与行走 X 轴一致。
    const accessLadder = new THREE.Group()
    accessLadder.position.set(2.42, 0, 0)
    accessLadder.rotation.y = Math.PI / 2
    crane.add(accessLadder)
    for (const x of [-0.3, 0.3])
      box(accessLadder, x, mastCenterY, 0, 0.07, mastHeight, 0.1, '#c3cdd3')
    for (let y = 1.5; y < craneHeight; y += 0.65)
      box(accessLadder, 0, y, 0, 0.65, 0.08, 0.12, '#c3cdd3')
    const servicePlatformHeight = Math.max(2.4, Math.min(5.3, craneHeight * 0.3))
    box(crane, 3.05, 0.85, 0, 1.7, 0.3, 1.7, '#dc1824')
    box(crane, 3.05, servicePlatformHeight, 0, 1.7, 0.16, 1.5, '#dc1824')
    for (let gratingX = 2.28; gratingX < 3.9; gratingX += 0.18)
      box(crane, gratingX, servicePlatformHeight + 0.1, 0, 0.04, 0.03, 1.4, '#aabac5')
    for (const railZ of [-0.72, 0.72]) {
      for (const postX of [2.25, 3.05, 3.85])
        box(crane, postX, servicePlatformHeight + 0.65, railZ, 0.08, 1.3, 0.08, '#dc1824')
      for (const railHeight of [0.65, 1.25])
        box(crane, 3.05, servicePlatformHeight + railHeight, railZ, 1.7, 0.08, 0.08, '#dc1824')
      for (const supportX of [2.35, 3.75])
        box(crane, supportX, (servicePlatformHeight + 0.95) / 2, railZ, 0.09, servicePlatformHeight - 0.95, 0.09, '#dc1824')
    }
    for (const railHeight of [0.65, 1.25])
      box(crane, 3.85, servicePlatformHeight + railHeight, 0, 0.08, 0.08, 1.5, '#dc1824')
    const serviceLadderHeight = servicePlatformHeight + 0.5
    for (const ladderSideZ of [-0.325, 0.325])
      box(crane, 3.98, 0.75 + serviceLadderHeight / 2, ladderSideZ, 0.09, serviceLadderHeight, 0.07, '#dc1824')
    for (let rungY = 1.15; rungY < servicePlatformHeight + 0.1; rungY += 0.48)
      box(crane, 3.98, rungY, 0, 0.12, 0.07, 0.65, '#dc1824')
    const cabinetHeight = servicePlatformHeight - 1.25
    const cabinetCenterY = 1.05 + cabinetHeight / 2
    box(crane, 3.05, cabinetCenterY, 0, 1.1, cabinetHeight, 1.05, '#d9e0e3')
    box(crane, 3.05, cabinetCenterY, 0.54, 0.98, cabinetHeight - 0.12, 0.04, '#eef1f2')
    box(crane, 3.4, cabinetCenterY, 0.58, 0.05, 0.35, 0.05, '#536878')
    for (const x of [-2, 2]) {
      box(
        crane,
        x,
        craneHeight / 2,
        0.4,
        0.035,
        craneHeight - 1,
        0.035,
        '#c6dce3'
      )
      for (const y of [0.5, craneHeight + 0.35]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 0.25, 16),
          (materials['#345366'] ||= new THREE.MeshStandardMaterial({
            color: '#345366'
          }))
        )
        wheel.rotation.x = Math.PI / 2
        wheel.position.set(x, y, 0)
        crane.add(wheel)
      }
    }
    function motor(x, y, z, size) {
      cylinder(crane, x, y, z, size, 0.95, '#354653', 'y')
      cylinder(crane, x, y + 0.55, z, size * 0.86, 0.15, '#202d38', 'y')
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6)
        box(
          crane,
          x + Math.cos(angle) * size,
          y,
          z + Math.sin(angle) * size,
          0.045,
          0.78,
          0.045,
          '#426876'
        )
      box(crane, x, y - 0.72, z, size * 2, 0.4, size * 2, '#667a88')
      cylinder(crane, x - 0.15, y - 0.6, z + 0.48, 0.42, 0.25, '#aabac5')
      cylinder(crane, x - 0.15, y - 0.6, z + 0.62, 0.17, 0.025, '#263441')
    }
    motor(-2.7, 3.15, 0, 0.32)
    motor(-2.7, 1.7, -0.05, 0.25)
    cylinder(crane, -2.2, 2.05, 0.12, 0.4, 0.75, '#667a88', 'x')
    const carriage = new THREE.Group()
    crane.add(carriage)
    box(carriage, 0, 0, 0, 4.15, 0.24, 2.3, '#d9e0e3')
    for (const dx of [-1.7, 1.7]) {
      box(carriage, dx, 0.6, 0, 0.25, 1.5, 0.8, '#536878')
      for (const dy of [0.05, 1.15])
        cylinder(carriage, dx, dy, 0.5, 0.17, 0.12, '#263441')
    }
    for (const dz of [-1.1, 1.1]) {
      box(carriage, 0, -0.05, dz, 3.4, 0.3, 0.12, '#dc1824')
    }
    for(const x of [-1.65,1.65]) {
      box(carriage,x,.8,-.42,.14,1.7,.12,'#c3cdd3')
      box(carriage,x,.8,.42,.14,1.7,.12,'#c3cdd3')
    }
    const lowerFork = new THREE.Group()
    carriage.add(lowerFork)
    const upperFork = new THREE.Group()
    lowerFork.add(upperFork)
    // 承托面保持在载货台上方 0.64，分层导轨两端留通道供双向伸叉。
    for (const forkCenterX of [-0.75, 0.75]) {
      box(carriage, forkCenterX, 0.285, 0, 0.52, 0.13, 2.8, '#242b30')
      box(lowerFork, forkCenterX, 0.415, 0, 0.34, 0.13, 2.8, '#30373c')
      box(upperFork, forkCenterX, 0.52, 0, 0.3, 0.08, 2.8, '#242b30')
      box(upperFork, forkCenterX, 0.6, 0, 0.44, 0.08, 2.8, '#242b30')
      for (const guideOffsetX of [-0.18, 0.18])
        box(lowerFork, forkCenterX + guideOffsetX, 0.42, 0, 0.025, 0.035, 2.72, '#81919a')
      for (const mountingFootZ of [-1.16, 1.16]) {
        box(carriage, forkCenterX, 0.17, mountingFootZ, 0.62, 0.1, 0.36, '#242b30')
        for (const boltOffsetX of [-0.23, 0.23]) {
          for (const boltOffsetZ of [-0.1, 0.1])
            cylinder(carriage, forkCenterX + boltOffsetX, 0.235, mountingFootZ + boltOffsetZ, 0.025, 0.03, '#53616a', 'y')
        }
      }
      const innerGuideX = forkCenterX - Math.sign(forkCenterX) * 0.23
      for (const rollerZ of [-1.1, -0.35, 0.35, 1.1])
        cylinder(carriage, innerGuideX, 0.37, rollerZ, 0.055, 0.09, '#99aab5', 'x')
    }
    box(carriage, 0, 0.17, 0, 0.5, 0.1, 0.45, '#242b30')
    cylinder(carriage, 0, 0.3, 0, 0.045, 1.5, '#81919a', 'x')
    cylinder(carriage, 0, 0.3, 0, 0.13, 0.48, '#3b4d53', 'x')
    for (const couplingX of [-0.34, 0.34])
      cylinder(carriage, couplingX, 0.3, 0, 0.085, 0.12, '#242b30', 'x')
    for (const finZ of [-0.08, 0, 0.08])
      box(carriage, 0, 0.41, finZ, 0.4, 0.02, 0.025, '#53616a')
    const plateCanvas = document.createElement('canvas')
    plateCanvas.width = 256
    plateCanvas.height = 128
    const plateCtx = plateCanvas.getContext('2d')
    plateCtx.fillStyle = '#132a3b'
    plateCtx.fillRect(0, 0, 256, 128)
    plateCtx.fillStyle = '#53dfca'
    plateCtx.font = 'bold 48px sans-serif'
    plateCtx.textAlign = 'center'
    plateCtx.fillText('SC-' + String(i + 1).padStart(2, '0'), 128, 60)
    plateCtx.fillStyle = '#b7cbd7'
    plateCtx.font = '20px sans-serif'
    plateCtx.fillText('PALLET STACKER', 128, 97)
    const plateTexture = new THREE.CanvasTexture(plateCanvas)
    detailTextures.push(plateTexture)
    const nameplate = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.75),
      new THREE.MeshBasicMaterial({ map: plateTexture })
    )
    nameplate.position.set(0, craneHeight - 0.65, 0.44)
    crane.add(nameplate)
    const cargo = pallet(scene, 0, 0, 0)
    cylinder(crane, 0, craneHeight + 0.34, 0, 0.15, 0.16, '#263441', 'y')
    const beacon = cylinder(
      crane,
      0,
      craneHeight + 0.56,
      0,
      0.13,
      0.3,
      '#43ffc2',
      'y'
    )
    beacon.material = new THREE.MeshBasicMaterial({ color: 0x43ffc2 })
    const selectionRing=new THREE.Mesh(new THREE.RingGeometry(2.6,2.72,48),new THREE.MeshBasicMaterial({color:0x36efda,transparent:true,opacity:.7,side:THREE.DoubleSide}))
    selectionRing.rotation.x=-Math.PI/2;selectionRing.position.y=.08;selectionRing.visible=false;crane.add(selectionRing)
    crane.traverse((o) => {
      if (o.isMesh) {
        o.userData.machine = i
        targets.push(o)
      }
    })
    const outline = new THREE.BoxHelper(crane, 0x36efda)
    outline.material.depthTest = false
    outline.visible = false
    scene.add(outline)
    const alarmCanvas = document.createElement('canvas')
    alarmCanvas.width = 320
    alarmCanvas.height = 96
    const alarmCtx = alarmCanvas.getContext('2d')
    alarmCtx.fillStyle = '#8d2638'
    alarmCtx.fillRect(0, 0, 320, 96)
    alarmCtx.fillStyle = '#fff'
    alarmCtx.font = 'bold 38px sans-serif'
    alarmCtx.textAlign = 'center'
    alarmCtx.fillText('SC-' + String(i + 1).padStart(2, '0') + ' 报警', 160, 61)
    const alarmTexture = new THREE.CanvasTexture(alarmCanvas)
    detailTextures.push(alarmTexture)
    const alarmLabel = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: alarmTexture, depthTest: false })
    )
    alarmLabel.position.set(0, craneHeight + 1.6, 0)
    alarmLabel.scale.set(4.6, 1.4, 1)
    alarmLabel.visible = false
    crane.add(alarmLabel)
    machines.push({
      crane,
      carriage,
      outline,
      lowerFork,
      upperFork,
      cargo,
      beacon,
      alarmLabel,
      selectionRing,
      device: createDeviceState()
    })
  }
  const labels = []
  function floorLabel(text, x, z, color) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 96
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#102637'
    ctx.fillRect(0, 0, 256, 96)
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, 252, 92)
    ctx.fillStyle = color
    ctx.font = 'bold 34px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(text, 128, 59)
    const texture = new THREE.CanvasTexture(canvas)
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 1.4),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      })
    )
    label.rotation.x = -Math.PI / 2
    label.position.set(x, 0.06, z)
    scene.add(label)
    labels.push(label)
  }
  layout.rows.forEach((r) =>
    floorLabel(r.number + ' 排', -halfLength - 5, r.z, '#85b9d5')
  )
  layout.aisles.forEach((a) =>
    floorLabel(a.index + 1 + ' 巷道', -halfLength - 5, a.z, '#ff9d38')
  )
  // Each aisle has a handoff conveyor on both sides of the travel rail.
  for (let i = 0; i < config.cranes; i++)
    for (const side of [-1, 1]) {
      const dock = new THREE.Group()
      scene.add(dock)
      const x = transferPoints(config, i).drop.x
      dock.position.set(
        x,
        0,
        layout.aisles[i].z + side * (forkMode === 'double' ? 5 : 2.5)
      )
      // 链条承托面保持在 2.64，与现有托盘交接高度一致。
      for (const chainTrackZ of [-0.85, 0.85]) {
        box(dock, 4, 2.26, chainTrackZ, 9.64, 0.12, 0.42, '#c5cbd0')
        box(dock, 4, 2.585, chainTrackZ, 9.64, 0.06, 0.2, '#303941')
        for (const channelOffset of [-0.16, 0.16]) {
          box(dock, 4, 2.405, chainTrackZ + channelOffset, 9.64, 0.35, 0.07, '#b8c2c9')
          box(dock, 4, 2.58, chainTrackZ + channelOffset, 9.7, 0.025, 0.09, '#e1e5e8')
        }
        for (const sprocketX of [-0.82, 8.82]) {
          cylinder(dock, sprocketX, 2.46, chainTrackZ, 0.18, 0.24, '#303941')
          for (const hubOffset of [-0.22, 0.22])
            cylinder(dock, sprocketX, 2.46, chainTrackZ + hubOffset, 0.075, 0.025, '#8c9aa5')
        }
      }
      // 重复链节合批绘制，避免增加每条输送线的独立绘制次数。
      const chainLinkCount = 48
      const chainLinks = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.11, 0.05, 0.2),
        materials['#303941'],
        chainLinkCount * 2
      )
      const chainLinkMatrix = new THREE.Matrix4()
      let chainLinkIndex = 0
      for (const chainTrackZ of [-0.85, 0.85]) {
        for (let chainIndex = 0; chainIndex < chainLinkCount; chainIndex++) {
          chainLinkMatrix.makeTranslation(-0.7 + chainIndex * 0.2, 2.615, chainTrackZ)
          chainLinks.setMatrixAt(chainLinkIndex, chainLinkMatrix)
          chainLinkIndex++
        }
      }
      dock.add(chainLinks)
      for (const supportX of [0, 4, 8])
        box(dock, supportX, 2.05, 0, 0.18, 0.3, 2.06, '#d6dcdf')
      for (const supportX of [0, 8]) {
        for (const supportZ of [-0.85, 0.85]) {
          box(dock, supportX, 1.25, supportZ, 0.18, 1.7, 0.2, '#d6dcdf')
          cylinder(dock, supportX, 0.25, supportZ, 0.055, 0.32, '#8c9aa5', 'y')
          cylinder(dock, supportX, 0.37, supportZ, 0.09, 0.07, '#aabac5', 'y')
          box(dock, supportX, 0.08, supportZ, 0.42, 0.06, 0.38, '#aabac5')
        }
      }
      for (const frameZ of [-0.85, 0.85])
        box(dock, 4, 0.9, frameZ, 8, 0.13, 0.13, '#d6dcdf')
      cylinder(dock, 1.1, 2.1, 0, 0.045, 1.85, '#8c9aa5')
      cylinder(dock, 1.1, 1.91, -0.5, 0.18, 0.5, '#53616b')
      box(dock, 1.1, 2.05, -0.77, 0.32, 0.32, 0.22, '#8c9aa5')
      docks.push({ dock, index: i, side })
    }
  function positionDocks() {
    const reach = forkMode === 'double' ? 5 : 2.5
    docks.forEach(
      ({ dock, index, side }) =>
        (dock.position.z = layout.aisles[index].z + side * reach)
    )
  }
  function setInspection(index) {
    machines.forEach((m,i)=>{m.crane.visible=index===null||i===index;m.cargo.visible=index===null||i===index})
    docks.forEach(d=>d.dock.visible=index===null||d.index===index)
    needsRender=true
  }
  camera.position.set(halfLength + 38, craneHeight + 28, halfDepth + 48)
  controls.target.set(4, craneHeight / 2, 0)
  let running = true,
    frame,
    time = 0
  const clock = new THREE.Clock()
  function animate() {
    frame = requestAnimationFrame(animate)
    const dt = Math.min(clock.getDelta(), 0.05)
    if (running) time += dt * speed
    const samples = machines.map((m, i) => {
      const { sample: state, raised } = advanceDevice(m.device, dt, {
        running,
        speed,
        mode: forkMode,
        direction: forkDirection,
        index: i,
        route: transferPoints(config, i)
      })
      if (raised) {
        needsRender = true
        onAlarm?.({ index: i, ...m.device.alarm })
      }
      m.alarmLabel.visible = Boolean(m.device.alarm)
      m.beacon.material.color.set(m.device.alarm ? '#ff555f' : '#43ffc2')
      m.outline.material.color.set(m.device.alarm ? '#ff555f' : '#36efda')
      m.crane.position.x = state.x
      m.carriage.position.y = state.y
      m.lowerFork.position.z = state.lower
      m.upperFork.position.z = state.upperRelative
      m.cargo.position.set(
        state.cargo.x,
        state.cargo.y,
        m.crane.position.z + state.cargo.z
      )
      m.selectionRing.visible=m.outline.userData.selected===true&&!m.device.alarm
      m.outline.visible =m.crane.visible && Boolean(m.device.alarm)
      if (m.outline.visible) m.outline.update()
      return {
        x: state.x.toFixed(1),
        height: state.y.toFixed(1),
        lower: state.lower.toFixed(2),
        upper: state.upper.toFixed(2),
        phase: state.label,
        progress: Math.round(state.progress * 100),
        mode: state.mode,
        direction: state.direction,
        alarm: Boolean(m.device.alarm),
        pending: m.device.pending
      }
    })
    if (focusIndex !== null) {
      const m = machines[focusIndex]
      const target = new THREE.Vector3(
        m.crane.position.x,
        craneHeight / 2,
        m.crane.position.z
      )
      const delta = target.clone().sub(controls.target)
      camera.position.add(delta)
      controls.target.copy(target)
    }
    if (time - telemetryAt > 0.1 || needsRender) {
      telemetryAt = time
      onTelemetry?.(samples)
    }
    const cameraChanged = controls.update()
    if (running || cameraChanged || needsRender) {
      renderer.render(scene, camera)
      needsRender = false
    }
  }
  animate()
  function fitOverview() {
    controls.target.set(5, craneHeight / 2, 0)
    const direction = new THREE.Vector3(1, 0.72, 1.15).normalize()
    let distance = Math.max(halfLength * 2, halfDepth * 2, craneHeight) * 2
    for (let iteration = 0; iteration < 6; iteration++) {
      camera.position.copy(controls.target).addScaledVector(direction, distance)
      camera.lookAt(controls.target)
      camera.updateMatrixWorld(true)
      let extent = 0
      for (const x of [-halfLength - 4, halfLength + 15])
        for (const y of [0, craneHeight + 1])
          for (const z of [-halfDepth, halfDepth]) {
            const point = new THREE.Vector3(x, y, z).project(camera)
            extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y))
          }
      distance *= extent / 0.86
    }
    camera.position.copy(controls.target).addScaledVector(direction, distance)
    camera.lookAt(controls.target)
  }
  function fitMachine() {
    const machine = machines[focusIndex]
    machine.crane.updateWorldMatrix(true, true)
    const bounds = new THREE.Box3()
    machine.crane.children.forEach((part) => {
      if (part !== machine.carriage) bounds.expandByObject(part)
    })
    // 为整机、报警标签和左右伸叉预留空间，避免低位载货台把门架顶端带出画面。
    let forkReach = 3.9
    if (forkMode === 'double') forkReach = 6.4
    bounds.min.y = 0
    bounds.max.y = Math.max(bounds.max.y, craneHeight + 2.3)
    const carriageBounds = new THREE.Box3().setFromObject(machine.carriage)
    const route = transferPoints(config, focusIndex)
    carriageBounds.min.y += Math.min(route.pickup.y, route.drop.y) - machine.carriage.position.y
    carriageBounds.max.y += Math.max(route.pickup.y, route.drop.y) + 0.22 - machine.carriage.position.y
    carriageBounds.min.z = machine.crane.position.z - forkReach
    carriageBounds.max.z = machine.crane.position.z + forkReach
    controls.target.set(machine.crane.position.x, craneHeight / 2, machine.crane.position.z)
    const direction = new THREE.Vector3(0.6, 0.16, 1).normalize()
    let frameLimit = 0.88
    if (focusWhole) frameLimit = 0.78
    let distance = bounds.getSize(new THREE.Vector3()).length() * 2
    for (let iteration = 0; iteration < 6; iteration++) {
      camera.position.copy(controls.target).addScaledVector(direction, distance)
      camera.lookAt(controls.target)
      camera.updateMatrixWorld(true)
      let extent = 0
      for (const partBounds of [bounds, carriageBounds])
        for (const x of [partBounds.min.x, partBounds.max.x])
          for (const y of [partBounds.min.y, partBounds.max.y])
            for (const z of [partBounds.min.z, partBounds.max.z]) {
              const point = new THREE.Vector3(x, y, z).project(camera)
              extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y))
            }
      distance *= extent / frameLimit
    }
    camera.position.copy(controls.target).addScaledVector(direction, distance)
    camera.lookAt(controls.target)
    needsRender = true
  }
  function focusMachine(index, whole) {
    overviewAuto = false
    focusIndex = index
    focusWhole = whole
    setInspection(index)
    rackMeshes.forEach((mesh) => (mesh.visible = false))
    fitMachine()
  }
  controls.addEventListener('start', () => (overviewAuto = false))
  const resize = () => {
    const { width, height } = container.getBoundingClientRect()
    if (!width || !height) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    if (overviewAuto) fitOverview()
    else if (focusIndex !== null) fitMachine()
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, 2, Math.sqrt(3000000 / (width * height)))
    )
    renderer.setSize(width, height)
    needsRender = true
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()
  const ray = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let down
  const onDown = (e) => {
    down = [e.clientX, e.clientY]
  }
  const onClick = (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5)
      return
    const r = renderer.domElement.getBoundingClientRect()
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1
    )
    ray.setFromCamera(pointer, camera)
    const visibleTargets = targets.filter((object) => {
      for (let parent = object; parent; parent = parent.parent) {
        if (!parent.visible) return false
      }
      return true
    })
    const hit = ray.intersectObjects(visibleTargets)[0]
    if (hit) select(hit.object.userData.machine)
  }
  renderer.domElement.addEventListener('pointerdown', onDown)
  renderer.domElement.addEventListener('pointerup', onClick)
  return {
    simulatePickupAlarm: (i, definition) => {
      const m = machines[i]
      if (m && !m.device.alarm && !m.device.pending) {
        m.device.pending = true
        m.device.pendingDefinition = definition
        needsRender = true
        return true
      }
      return false
    },
    resetAlarm: (i) => {
      const m = machines[i]
      if (m) {
        resetDeviceAlarm(m.device)
        needsRender = true
      }
    },
    setForkMode: (v) => {
      forkMode = v
      positionDocks()
      time = 0
      machines.forEach((m) => (m.device.time = 0))
      telemetryAt = -1
      needsRender = true
    },
    setForkDirection: (v) => {
      forkDirection = v
      time = 0
      machines.forEach((m) => (m.device.time = 0))
      telemetryAt = -1
      needsRender = true
    },
    setRunning: (v) => {
      running = v
      needsRender = true
    },
    setSpeed: (v) => (speed = v),
    highlight: (i) => {
      machines.forEach((m, j) => (m.outline.userData.selected = i === j))
      needsRender = true
    },
    setXray: (v) => {
      const unique = new Set(rackMeshes.map((m) => m.material))
      unique.forEach((m) => {
        m.transparent = v
        m.opacity = v ? 0.18 : 1
        m.depthWrite = !v
      })
      needsRender = true
    },
    fullFocus: (i) => focusMachine(i, true),
    focus: (i) => focusMachine(i, false),
    reset: () => {
      overviewAuto = true
      focusIndex = null
      setInspection(null)
      rackMeshes.forEach((m) => (m.visible = true))
      camera.position.set(halfLength + 38, craneHeight + 28, halfDepth + 48)
      controls.target.set(4, craneHeight / 2, 0)
      fitOverview()
      needsRender = true
    },
    top: () => {
      overviewAuto = false
      focusIndex = null
      setInspection(null)
      rackMeshes.forEach((m) => (m.visible = true))
      camera.position.set(4, Math.max(85, halfLength * 3), 0.01)
      controls.target.set(0, 0, 0)
    },
    dispose: () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      const disposed = new Set()
      scene.traverse((o) => {
        o.geometry?.dispose()
        if (o.material && !disposed.has(o.material)) {
          o.material.dispose()
          disposed.add(o.material)
        }
      })
      labels.forEach((l) => l.material.map.dispose())
      detailTextures.forEach((t) => t.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }
}
