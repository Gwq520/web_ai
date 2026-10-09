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
    box(crane, 0, 0.85, 0, 5.5, 0.65, 1.7, '#eab649')
    box(crane, 0, 0.46, 0, 5.1, 0.18, 1.9, '#263441')
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
    for (let n = 0; n < 8; n++) {
      const stripe = box(
        crane,
        -1.15 + n * 0.32,
        0.84,
        0.86,
        0.14,
        0.55,
        0.025,
        '#263441'
      )
      stripe.rotation.z = -0.45
    }
    for (const x of [-2, 2]) {
      box(crane, x, craneHeight / 2, 0, 0.38, craneHeight - 1, 0.52, '#efbb31')
      for (const dz of [-0.26, 0.26])
        box(
          crane,
          x,
          craneHeight / 2,
          dz,
          0.58,
          craneHeight - 1,
          0.07,
          '#ffd266'
        )
      box(
        crane,
        x - Math.sign(x) * 0.25,
        craneHeight / 2,
        0.02,
        0.08,
        craneHeight - 1,
        0.35,
        '#aabac5'
      )
      for (let y = 2; y < craneHeight - 1; y += 2.1)
        for (const dz of [-0.31, 0.31])
          cylinder(crane, x, y, dz, 0.045, 0.025, '#263441')
    }
    box(crane, 0, craneHeight, 0, 5.5, 0.45, 0.8, '#f4c864')
    for (let y = 1.5; y < craneHeight; y += 0.65)
      box(crane, -2.75, y, 0, 0.65, 0.08, 0.12, '#eed17c')
    for (const x of [-3.05, -2.45])
      box(crane, x, craneHeight / 2, 0, 0.07, craneHeight - 1, 0.1, '#eed17c')
    const serviceY = Math.min(6, craneHeight * 0.45)
    box(crane, -3.1, serviceY, 0, 1.6, 0.15, 1.5, '#667a88')
    for (let dx = -3.8; dx < -2.3; dx += 0.18)
      box(crane, dx, serviceY + 0.1, 0, 0.03, 0.02, 1.5, '#aabac5')
    for (const dz of [-0.72, 0.72]) {
      box(crane, -3.8, serviceY + 0.65, dz, 0.08, 1.3, 0.08, '#f4c864')
      box(crane, -3.1, serviceY + 1.25, dz, 1.5, 0.08, 0.08, '#f4c864')
    }
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
      cylinder(crane, x, y, z, size, 0.95, '#2457a1', 'y')
      cylinder(crane, x, y + 0.55, z, size * 0.86, 0.15, '#16366a', 'y')
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6)
        box(
          crane,
          x + Math.cos(angle) * size,
          y,
          z + Math.sin(angle) * size,
          0.045,
          0.78,
          0.045,
          '#4b81c6'
        )
      box(crane, x, y - 0.72, z, size * 2, 0.4, size * 2, '#667a88')
      cylinder(crane, x - 0.15, y - 0.6, z + 0.48, 0.42, 0.25, '#aabac5')
      cylinder(crane, x - 0.15, y - 0.6, z + 0.62, 0.17, 0.025, '#263441')
    }
    motor(2.7, 3.15, 0, 0.32)
    motor(2.7, 1.7, -0.05, 0.25)
    cylinder(crane, 2.2, 2.05, 0.12, 0.4, 0.75, '#667a88', 'x')
    box(crane, -2.6, 2.15, -0.45, 0.55, 2.1, 0.5, '#cad6dc')
    box(crane, -2.6, 2.65, -0.715, 0.3, 0.38, 0.025, '#16366a')
    const carriage = new THREE.Group()
    crane.add(carriage)
    box(carriage, 0, 0, 0, 4.15, 0.24, 2.3, '#e8a637')
    for (const dx of [-1.7, 1.7]) {
      box(carriage, dx, 0.6, 0, 0.25, 1.5, 0.8, '#667a88')
      for (const dy of [0.05, 1.15])
        cylinder(carriage, dx, dy, 0.5, 0.17, 0.12, '#263441')
    }
    for (const dz of [-1.1, 1.1]) {
      box(carriage, 0, -0.05, dz, 3.4, 0.3, 0.12, '#efbb31')
      for (let dx = -1.6; dx < 1.7; dx += 0.4)
        box(
          carriage,
          dx,
          -0.05,
          dz + Math.sign(dz) * 0.07,
          0.15,
          0.23,
          0.02,
          '#263441'
        )
    }
    const lowerFork = new THREE.Group()
    carriage.add(lowerFork)
    const upperFork = new THREE.Group()
    lowerFork.add(upperFork)
    // Two parallel fork rails per layer, symmetric about the carrier centre.
    for (const x of [-0.75, 0.75]) {
      box(carriage, x, 0.26, 0, 0.38, 0.12, 2.8, '#394653')
      box(lowerFork, x, 0.4, 0, 0.3, 0.14, 2.8, '#394653')
      box(upperFork, x, 0.55, 0, 0.24, 0.14, 2.8, '#aabac5')
      for (let z = -1.1; z < 1.2; z += 0.35)
        cylinder(carriage, x, 0.29, z, 0.075, 0.42, '#99aab5', 'x')
    }
    box(carriage, 0, 0.15, -1.05, 1.7, 0.16, 0.2, '#394653')
    cylinder(carriage, 0, 0.19, -0.95, 0.13, 1.65, '#aabac5', 'x')
    box(carriage, 1.1, 0.15, -0.85, 0.45, 0.33, 0.5, '#2457a1')
    for (const dx of [-0.75, 0.75])
      for (let dz = -1.25; dz < 1.3; dz += 0.2)
        box(lowerFork, dx + 0.16, 0.42, dz, 0.025, 0.03, 0.07, '#aabac5')
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
    floorLabel(a.index + 1 + ' 巷道', -halfLength - 5, a.z, '#f4c864')
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
      box(dock, 4, 2.25, 0, 10, 0.35, 2.8, '#345366')
      for (let dx = -0.8; dx < 9; dx += 0.5)
        cylinder(dock, dx, 2.51, 0, 0.13, 2.6, '#99aab5')
      for (const edge of [-1.2, 1.2]) {
        box(dock, 4, 3.8, edge, 10, 0.08, 0.08, '#eab649')
        for (const dx of [-1, 4, 9]) {
          box(dock, dx, 2, edge, 0.1, 3.6, 0.1, '#eab649')
          box(dock, dx, 1, edge / 2, 0.15, 2, 0.15, '#345366')
        }
      }
      box(dock, 9, 2, 2.3, 1, 3, 1, '#c8d7df')
      docks.push({ dock, index: i, side })
    }
  function positionDocks() {
    const reach = forkMode === 'double' ? 5 : 2.5
    docks.forEach(
      ({ dock, index, side }) =>
        (dock.position.z = layout.aisles[index].z + side * reach)
    )
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
      m.outline.visible =
        Boolean(m.device.alarm) || m.outline.userData.selected === true
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
        focusWhole ? craneHeight / 2 : m.carriage.position.y + 1,
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
  controls.addEventListener('start', () => (overviewAuto = false))
  const resize = () => {
    const { width, height } = container.getBoundingClientRect()
    if (!width || !height) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    if (overviewAuto) fitOverview()
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
    const hit = ray.intersectObjects(targets)[0]
    if (hit) select(hit.object.userData.machine)
  }
  renderer.domElement.addEventListener('pointerdown', onDown)
  renderer.domElement.addEventListener('pointerup', onClick)
  return {
    simulatePickupAlarm: (i) => {
      const m = machines[i]
      if (m && !m.device.alarm && !m.device.pending) {
        m.device.pending = true
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
    fullFocus: (i) => {
      overviewAuto = false
      focusIndex = i
      focusWhole = true
      rackMeshes.forEach((m) => (m.visible = false))
      const m = machines[i]
      controls.target.set(
        m.crane.position.x,
        craneHeight / 2,
        m.crane.position.z
      )
      camera.position.set(
        m.crane.position.x + craneHeight * 1.1,
        craneHeight * 0.85,
        m.crane.position.z + craneHeight * 1.6
      )
    },
    focus: (i) => {
      overviewAuto = false
      focusIndex = i
      focusWhole = false
      rackMeshes.forEach((m) => (m.visible = false))
      const m = machines[i]
      controls.target.set(
        m.crane.position.x,
        m.carriage.position.y + 1,
        m.crane.position.z
      )
      camera.position.set(
        m.crane.position.x + 11,
        m.carriage.position.y + 7,
        m.crane.position.z + 16
      )
    },
    reset: () => {
      overviewAuto = true
      focusIndex = null
      rackMeshes.forEach((m) => (m.visible = true))
      camera.position.set(halfLength + 38, craneHeight + 28, halfDepth + 48)
      controls.target.set(4, craneHeight / 2, 0)
      fitOverview()
      needsRender = true
    },
    top: () => {
      overviewAuto = false
      focusIndex = null
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
