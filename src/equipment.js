import * as THREE from 'three'

export const EQUIPMENT_CATEGORIES = [
  ['stacker', '堆垛与存取设备'],
  ['rack', '货架与存储系统'],
  ['shuttle', '穿梭车与密集存储'],
  ['conveyor', '输送与移载设备'],
  ['sorter', '分拣设备'],
  ['robot', 'AGV / AMR 与移动机器人'],
  ['lift', '提升与垂直输送'],
  ['station', '收货、拣选与包装站'],
  ['pallet', '托盘、料箱与货物'],
  ['dock', '月台与装卸设备'],
  ['safety', '安全防护与电控'],
  ['sensor', '识别与现场感知'],
  ['other', '其他设备']
]

const asset = (id, name, category, type, description, spec) => ({ id, name, category, type, description, spec, builtin: true, units: 'm' })

export const EQUIPMENT_ASSETS = [
  asset('builtin-stacker', '托盘式双立柱堆垛机', 'stacker', 'stacker', '双立柱门架、载货台、双层伸缩货叉、提升绳、检修梯台及驱动单元', '高 8 m · 托盘单元载荷'),
  asset('stacker-high', '高位双立柱堆垛机', 'stacker', 'stacker-high', '加高门架、顶部横梁、导轨、载货台与检修通道', '高 14 m · 高位 AS/RS'),
  asset('stacker-miniload', '箱式料箱堆垛机', 'stacker', 'stacker-miniload', '轻型门架、窄载货台、伸缩取货器、顶部驱动与箱式单元', '中高位 · 料箱 / 周转箱'),
  asset('builtin-rack', '单深托盘横梁货架', 'rack', 'rack', '立柱框架、横梁、层间支撑及托盘单元', '单深 · 3 列 × 4 层'),
  asset('rack-double', '双深托盘货架', 'rack', 'rack-double', '近位与远位货位、纵深支撑及横梁结构', '双深 · 2 排 × 3 列 × 4 层'),
  asset('rack-flow', '重力流利货架', 'rack', 'rack-flow', '倾斜滚轮轨道、补货端止挡及拣选端导向', '先进先出 · 4 条流道'),
  asset('rack-mezzanine', '阁楼式多层货架', 'rack', 'rack-mezzanine', '钢平台、立柱、楼梯与多层拣选货架', '两层平台 · 人工作业'),
  asset('shuttle-fourway', '四向穿梭车', 'shuttle', 'shuttle-fourway', '低矮车体、双向行走轮组、顶升载台、传感器与状态灯', '四向换层系统 · 托盘搬运'),
  asset('shuttle-radio', '无线电托盘穿梭车', 'shuttle', 'shuttle-radio', '窄体车架、托盘顶升板、导向轮、激光测距与防撞端部', '巷道内往复式 · 托盘搬运'),
  asset('shuttle-tote', '料箱穿梭机器人', 'shuttle', 'shuttle-tote', '箱式载台、窄轨行走轮、升降取箱叉与通信天线', '多层料箱 AS/RS'),
  asset('builtin-conveyor', '动力滚筒输送线', 'conveyor', 'roller', '分段滚筒、侧梁、调平支腿、驱动电机与光电检测', '辊筒输送 · 长 6 m'),
  asset('conveyor-belt', '皮带输送机', 'conveyor', 'belt', '连续输送带、端部滚筒、张紧结构、支腿及驱动', '带式输送 · 长 6 m'),
  asset('conveyor-transfer', '顶升移载台', 'conveyor', 'transfer', '纵横向滚筒、升降链条、剪叉顶升机构及定位传感器', '90° 换向移载'),
  asset('conveyor-chain', '链条输送机', 'conveyor', 'chain', '双排承载链、模块机架、托盘导向与张紧驱动', '托盘重载输送'),
  asset('conveyor-telescope', '伸缩皮带机', 'conveyor', 'telescope', '套叠式机架、伸缩段、输送皮带、滚轮底座与操作台', '车辆装卸 · 可伸缩'),
  asset('sorter-crossbelt', '交叉带分拣机', 'sorter', 'sorter-crossbelt', '环形主线、分拣小车、横向皮带面与多方向滑槽', '多目的地高速分拣'),
  asset('sorter-sliding', '滑块式分拣机', 'sorter', 'sorter-sliding', '滚筒主线、横向滑块、分流导板与格口支架', '箱件连续分流'),
  asset('builtin-pallet', '网格塑料托盘', 'pallet', 'pallet', '九脚底座、开孔面板、加强筋与叉车孔', '1.2 × 1.0 m · 示意'),
  asset('pallet-loaded', '带箱货物托盘', 'pallet', 'loaded', '塑料托盘、组合纸箱、封箱带与缠绕膜外轮廓', '托盘单元 · 4 箱'),
  asset('pallet-tote', '标准周转料箱', 'pallet', 'tote', '叠箱结构、加强边框、把手孔与标签面', '600 × 400 mm · 示意'),
  asset('robot-amr', '潜伏式 AMR', 'robot', 'amr', '移动底盘、顶升面板、全向轮、激光雷达与环形灯带', '料架 / 料车牵引'),
  asset('robot-forklift', '托盘搬运 AGV', 'robot', 'agv', '车体、驱动轮、双货叉、门架、导航传感器及警示灯', '地面托盘搬运'),
  asset('robot-topmodule', '顶升移载 AMR', 'robot', 'robot-topmodule', '全向底盘、滚筒顶模块、定位传感器与防撞边', '机器人与输送线对接'),
  asset('lift-pallet', '托盘往复式提升机', 'lift', 'lift', '井架、封闭防护网、导轨、托盘平台、提升链及驱动', '跨层托盘输送'),
  asset('lift-vertical', '连续垂直输送机', 'lift', 'lift-continuous', '框架塔架、上下链轮、循环托盘承载架与进出料口', '多层连续垂直输送'),
  asset('station-pick', '人工拣选工作站', 'station', 'station', '可调工作台、滚筒入口、显示终端、周转箱位与状态灯', '货到人拣选'),
  asset('station-pack', '称重包装复核台', 'station', 'station-pack', '包装台面、电子秤、扫码屏、打印机与封箱机', '订单复核 · 包装'),
  asset('station-inbound', '入库收货检测站', 'station', 'station-inbound', '入库辊筒、条码扫描门、轮廓检测器及操作终端', '收货 · 尺寸 / 条码检查'),
  asset('dock-leveler', '液压装卸平台', 'dock', 'dock-leveler', '固定基坑框架、铰接唇板、升降台面及液压动力箱', '仓库月台对接车辆'),
  asset('dock-shelter', '装卸门封与防护', 'dock', 'dock-shelter', '门洞框架、侧封帘、顶部封板、缓冲块及信号灯', '车辆月台接口'),
  asset('safety-fence', '安全围栏与联锁门', 'safety', 'fence', '网片围栏、立柱、检修门、机械锁及安全联锁位置', '隔离自动化设备区域'),
  asset('safety-cabinet', 'PLC 电控柜与信号灯', 'safety', 'cabinet', '柜体、触控屏、急停按钮、散热百叶与三色灯柱', '现场控制 · 示意'),
  asset('sensor-gate', '条码识别扫描门', 'sensor', 'sensor-gate', '门式框架、多个读码器、光电阵列与状态指示灯', '输送线读码定位'),
  asset('sensor-cube', '体积测量与称重架', 'sensor', 'sensor-cube', '顶置轮廓测量头、侧向测距器、地秤平台与指示屏', '尺寸 / 重量检测'),
  asset('sensor-lightcurtain', '安全光幕与区域扫描仪', 'sensor', 'sensor-lightcurtain', '成对发射接收立柱、红外光束与地面扫描器', '出入口安全防护')
]

const COLORS = {
  orange: '#f28a24', steel: '#aabac2', dark: '#263b49', navy: '#18364b', blue: '#247ea5',
  cyan: '#35d7ce', yellow: '#f2c64b', red: '#e45a54', rubber: '#26323a', white: '#e8edef',
  carton: '#ba9c70', screen: '#42c9d2', green: '#46d6a2'
}

export function buildEquipment(type) {
  const root = new THREE.Group()
  root.name = type
  const materials = new Map()
  const geometries = new Map()
  const material = color => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, metalness: color === COLORS.blue ? 0.12 : 0.48, roughness: 0.4 }))
    return materials.get(color)
  }
  const part = (name, geometry, x, y, z, color, parent = root) => {
    const mesh = new THREE.Mesh(geometry, material(color))
    mesh.name = name
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  const box = (name, x, y, z, w, h, d, color, parent = root) => {
    const key = `box:${w}/${h}/${d}`
    if (!geometries.has(key)) geometries.set(key, new THREE.BoxGeometry(w, h, d))
    return part(name, geometries.get(key), x, y, z, color, parent)
  }
  const cylinder = (name, x, y, z, radius, length, color, axis = 'z', parent = root, segments = 16) => {
    const key = `cylinder:${radius}/${length}/${segments}`
    if (!geometries.has(key)) geometries.set(key, new THREE.CylinderGeometry(radius, radius, length, segments))
    const mesh = part(name, geometries.get(key), x, y, z, color, parent)
    if (axis === 'z') mesh.rotation.x = Math.PI / 2
    if (axis === 'x') mesh.rotation.z = Math.PI / 2
    return mesh
  }
  const beam = (name, start, end, radius, color, parent = root) => {
    const from = new THREE.Vector3(...start)
    const to = new THREE.Vector3(...end)
    const direction = new THREE.Vector3().subVectors(to, from)
    const mesh = cylinder(name, ...from.clone().add(to).multiplyScalar(0.5).toArray(), radius, direction.length(), color, 'y', parent, 8)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    return mesh
  }
  const pallet = (x, y, z, loaded = false) => {
    const group = new THREE.Group()
    group.name = '托盘单元'
    group.position.set(x, y, z)
    root.add(group)
    for (const px of [-0.44, 0, 0.44]) for (const pz of [-0.34, 0, 0.34]) box('托盘支脚', px, 0.1, pz, 0.17, 0.2, 0.18, COLORS.blue, group)
    for (let px = -0.55; px <= 0.55; px += 0.11) box('网格面板纵筋', px, 0.23, 0, 0.035, 0.07, 0.96, COLORS.blue, group)
    for (let pz = -0.45; pz <= 0.45; pz += 0.11) box('网格面板横筋', 0, 0.23, pz, 1.15, 0.07, 0.035, COLORS.blue, group)
    for (const pz of [-0.34, 0, 0.34]) box('托盘底梁', 0, 0.035, pz, 1.15, 0.07, 0.15, COLORS.dark, group)
    if (loaded) {
      for (const [px, pz, color] of [[-0.27, -0.2, '#c7a879'], [0.27, -0.2, '#d1b889'], [-0.27, 0.2, '#b99768'], [0.27, 0.2, '#c9aa78']]) {
        box('瓦楞纸箱', px, 0.67, pz, 0.52, 0.78, 0.38, color, group)
        box('封箱胶带', px, 1.065, pz, 0.045, 0.012, 0.39, '#e4d7b7', group)
        box('物流标签', px, 0.75, pz + 0.195, 0.16, 0.13, 0.008, COLORS.white, group)
      }
      const wrap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.15, 0.94), new THREE.MeshStandardMaterial({ color: '#d8e9ed', transparent: true, opacity: 0.15, roughness: 0.2 }))
      wrap.name = '透明缠绕膜'
      wrap.position.y = 0.72
      group.add(wrap)
    }
    return group
  }
  const conveyor = (length = 6, width = 1.2, mode = 'roller') => {
    const rollerMode = mode === 'roller' || mode === 'transfer' || mode === 'chain'
    box('输送侧梁', 0, 0.8, -width / 2, length, 0.23, 0.12, COLORS.dark)
    box('输送侧梁', 0, 0.8, width / 2, length, 0.23, 0.12, COLORS.dark)
    for (let x = -length / 2 + 0.35; x <= length / 2 - 0.3; x += 0.75) {
      for (const z of [-width / 2 + 0.09, width / 2 - 0.09]) {
        box('可调支腿', x, 0.37, z, 0.09, 0.73, 0.09, COLORS.steel)
        box('底部连接撑', x, 0.12, 0, 0.08, 0.08, width - 0.2, COLORS.steel)
      }
    }
    if (mode === 'belt' || mode === 'telescope') {
      box('输送带', 0, 0.94, 0, length - 0.25, 0.08, width - 0.25, COLORS.rubber)
      for (const x of [-length / 2 + 0.14, length / 2 - 0.14]) cylinder('端部滚筒', x, 0.93, 0, 0.12, width - 0.22, COLORS.steel)
      for (let x = -length / 2 + 0.55; x < length / 2 - 0.4; x += 0.55) cylinder('回程托辊', x, 0.72, 0, 0.04, width - 0.22, COLORS.steel)
    } else if (mode === 'chain') {
      for (const z of [-0.35, 0.35]) {
        box('链轨', 0, 0.96, z, length - 0.3, 0.12, 0.14, COLORS.steel)
        for (let x = -length / 2 + 0.25; x < length / 2; x += 0.22) box('链节', x, 1.03, z, 0.15, 0.035, 0.12, COLORS.dark)
      }
    } else {
      for (let x = -length / 2 + 0.16; x < length / 2; x += 0.24) cylinder('动力滚筒', x, 0.98, 0, 0.065, width - 0.2, COLORS.steel)
    }
    for (const z of [-width / 2, width / 2]) box('货物导向边', 0, 1.08, z, length, 0.12, 0.045, COLORS.blue)
    const motor = cylinder('减速驱动电机', length / 2 - 0.25, 0.69, width / 2 + 0.22, 0.15, 0.34, COLORS.dark, 'x')
    motor.rotation.z = Math.PI / 2
    for (const x of [-length / 2 + 0.45, length / 2 - 0.45]) {
      box('光电检测支架', x, 1.19, -width / 2 - 0.08, 0.035, 0.28, 0.035, COLORS.steel)
      cylinder('漫反射传感器', x, 1.24, -width / 2 - 0.14, 0.045, 0.07, COLORS.cyan, 'x')
    }
    if (rollerMode) for (const x of [-length / 2 + 0.4, length / 2 - 0.4]) pallet(x, 1.1, 0, false)
  }
  const cabinet = (x, y, z, width = 0.8, height = 1.8, depth = 0.5) => {
    box('电控柜柜体', x, y, z, width, height, depth, COLORS.steel)
    box('电控柜门', x, y, z + depth / 2 + 0.015, width - 0.07, height - 0.09, 0.035, COLORS.white)
    box('触摸屏边框', x - width * 0.16, y + height * 0.2, z + depth / 2 + 0.04, width * 0.48, 0.33, 0.025, COLORS.dark)
    box('触摸屏界面', x - width * 0.16, y + height * 0.2, z + depth / 2 + 0.057, width * 0.42, 0.27, 0.012, COLORS.screen)
    cylinder('急停按钮', x + width * 0.27, y - height * 0.12, z + depth / 2 + 0.06, 0.055, 0.05, COLORS.red, 'z')
    box('柜门把手', x + width * 0.34, y - height * 0.25, z + depth / 2 + 0.05, 0.035, 0.24, 0.035, COLORS.dark)
    for (let i = 0; i < 5; i += 1) box('散热百叶', x, y - height * 0.36 - i * 0.055, z + depth / 2 + 0.04, width * 0.25, 0.018, 0.012, COLORS.dark)
  }

  if (type.startsWith('stacker')) {
    const high = type === 'stacker-high'
    const mini = type === 'stacker-miniload'
    const height = high ? 14 : mini ? 9 : 8
    const span = mini ? 1.5 : 2.5
    const orange = '#f28a24'
    box('下部行走底梁', 0, 0.38, 0, span + 0.8, 0.38, 1.1, orange)
    for (const x of [-span / 2, span / 2]) {
      box('立柱腹板', x, height / 2, 0, 0.13, height, 0.32, orange)
      for (const z of [-0.18, 0.18]) box('立柱翼缘', x, height / 2, z, 0.25, height, 0.045, orange)
      box('载货台导轨', x - Math.sign(x) * 0.1, height / 2, 0.24, 0.055, height, 0.07, COLORS.steel)
      for (let y = 0.5; y < height; y += 1) box('立柱加劲板', x, y, 0, 0.25, 0.06, 0.39, '#d8741e')
      for (const y of [0.2, height - 0.18]) cylinder('导向轮', x, y, 0, 0.16, 0.19, COLORS.dark)
    }
    box('顶部联接横梁', 0, height, 0, span + 0.7, 0.22, 0.5, orange)
    for (const x of [-span / 2 - 0.42, -span / 2 - 0.12]) {
      box('检修梯侧轨', x, height / 2, 0.02, 0.04, height, 0.06, COLORS.steel)
      for (let y = 0.45; y < height; y += 0.36) box('检修梯踏棍', x + 0.15, y, 0.02, 0.34, 0.035, 0.06, COLORS.steel)
    }
    const platformY = height * 0.46
    box('检修格栅平台', -span / 2 - 0.45, platformY, 0, 0.86, 0.09, 0.9, COLORS.steel)
    for (const x of [-span / 2 - 0.84, -span / 2 - 0.08]) for (const z of [-0.43, 0.43]) {
      box('安全护栏立杆', x, platformY + 0.45, z, 0.035, 0.8, 0.035, orange)
      if (z > 0) box('安全护栏横杆', -span / 2 - 0.46, platformY + 0.79, z, 0.8, 0.035, 0.035, orange)
    }
    for (const x of [-span / 2, span / 2]) box('提升钢丝绳', x + 0.1, height / 2, -0.23, 0.025, height, 0.025, COLORS.steel)
    box('载货台背板', 0, 2.5, -0.48, span * 0.72, 1.5, 0.12, COLORS.dark)
    box('载货台托架', 0, 1.84, 0, span * 0.78, 0.14, 1.25, orange)
    for (const x of [-0.4, 0.4]) {
      box('货叉下层伸缩梁', x, 1.99, 0.05, 0.16, 0.12, 1.6, COLORS.dark)
      box('货叉上层伸缩梁', x, 2.12, 0.08, 0.12, 0.1, 1.65, COLORS.steel)
      for (let z = -0.65; z < 0.75; z += 0.35) cylinder('货叉滚轮', x, 2.19, z, 0.045, 0.13, COLORS.dark, 'x')
    }
    for (const x of [-0.58, 0.58]) box('货物居中导向块', x, 2.25, 0, 0.06, 0.08, 1.05, COLORS.yellow)
    const hoist = cylinder('提升减速电机', span / 2 + 0.48, 1.45, 0, 0.22, 0.62, COLORS.dark, 'y')
    hoist.rotation.z = Math.PI / 2
    cylinder('提升卷筒', span / 2 + 0.12, 0.88, 0, 0.2, 0.48, COLORS.steel, 'x')
    const travel = cylinder('行走电机', -span / 2 - 0.15, 0.55, 0.45, 0.17, 0.45, COLORS.dark, 'x')
    travel.rotation.z = Math.PI / 2
    cabinet(-span / 2 - 0.25, 1.05, -0.52, 0.38, 0.8, 0.26)
    cylinder('顶部状态灯', 0, height + 0.2, 0, 0.07, 0.18, COLORS.green, 'y')
    box('激光测距仪', 0, height * 0.35, 0.38, 0.14, 0.13, 0.12, COLORS.dark)
  } else if (type.startsWith('rack')) {
    const double = type === 'rack-double'
    const flow = type === 'rack-flow'
    const mezzanine = type === 'rack-mezzanine'
    const rows = double ? [-1.1, 1.1] : [0]
    const levels = mezzanine ? [0.8, 3.3, 5.8] : [0.65, 2.15, 3.65, 5.15, 6.65]
    const depth = double ? 4.6 : 2.25
    for (const row of rows) {
      for (const x of [-3, -1, 1, 3]) for (const z of [row - 0.95, row + 0.95]) {
        box('立柱框架', x, 3.55, z, 0.09, 7.1, 0.09, COLORS.blue)
        for (const y of [0.2, 7]) box('立柱底脚', x, y, z, 0.18, 0.08, 0.25, COLORS.dark)
        for (let y = 0.6; y < 6.9; y += 0.5) box('立柱挂孔加强片', x, y, z + 0.052, 0.035, 0.08, 0.012, COLORS.steel)
      }
      for (const y of levels) {
        for (const z of [row - 0.95, row + 0.95]) {
          box('承载横梁', 0, y, z, 5.95, 0.12, 0.09, COLORS.orange)
          for (const x of [-2.75, -0.95, 0.95, 2.75]) box('梁柱安全锁', x, y, z + 0.07, 0.08, 0.16, 0.025, COLORS.yellow)
        }
        for (const x of [-2, 0, 2]) box('托盘深度承托轨', x, y - 0.1, row, 0.08, 0.1, depth - 0.05, COLORS.steel)
        if (flow) {
          for (const x of [-2, 0, 2]) {
            const rail = box('重力滚轮流道', x, y - 0.03, row, 0.16, 0.06, 1.7, COLORS.dark)
            rail.rotation.x = -0.08
            for (let z = row - 0.76; z < row + 0.8; z += 0.22) cylinder('流利滚轮', x, y + 0.02 - (z - row) * 0.08, z, 0.05, 0.12, COLORS.steel, 'x')
            box('流道末端止挡', x, y + 0.05, row + 0.87, 0.17, 0.18, 0.06, COLORS.orange)
          }
        }
      }
      for (const x of [-2.9, -0.95, 0.95, 2.9]) for (let y = 1; y < 6.6; y += 1.5) {
        beam('背部交叉斜撑', [x, y, row - 0.95], [x + 0.8, y + 1.25, row - 0.95], 0.035, COLORS.steel)
        beam('背部交叉斜撑', [x + 0.8, y, row - 0.95], [x, y + 1.25, row - 0.95], 0.035, COLORS.steel)
      }
      if (mezzanine) {
        box('阁楼平台主梁', 0, 3.8, row, 6.4, 0.2, 2.2, COLORS.dark)
        box('防滑钢格栅楼板', 0, 3.94, row, 6.05, 0.08, 2.05, COLORS.steel)
        for (const x of [-3.1, 3.1]) box('平台踢脚板', x, 4.1, row, 0.06, 0.25, 2.1, COLORS.yellow)
        for (const z of [row - 1, row + 1]) for (const x of [-3, 3]) box('平台护栏立柱', x, 4.4, z, 0.05, 0.85, 0.05, COLORS.orange)
        for (const y of [4.55, 4.85]) box('平台护栏横杆', 0, y, row + 1, 6, 0.04, 0.04, COLORS.orange)
        for (let y = 0.2; y < 3.6; y += 0.28) box('钢梯踏步', 3.65, y, row, 0.55, 0.07, 0.45, COLORS.steel)
      }
    }
    if (double) for (const x of [-3.1, 3.1]) box('双深排间联接梁', x, 3.5, 0, 0.12, 6.8, 2.4, COLORS.steel)
    for (const row of rows) pallet(0, 0, row, false)
  } else if (type.startsWith('shuttle-')) {
    const fourWay = type === 'shuttle-fourway'
    const tote = type === 'shuttle-tote'
    const length = tote ? 1.05 : 1.38
    const width = tote ? 0.68 : 1.05
    box('穿梭车底盘', 0, 0.24, 0, length, 0.34, width, COLORS.dark)
    box('车架上盖', 0, 0.44, 0, length - 0.12, 0.08, width - 0.1, '#d8e1e4')
    if (tote) {
      box('料箱承载叉', 0, 0.57, 0, 0.72, 0.08, 0.58, COLORS.blue)
      for (const z of [-0.2, 0.2]) box('伸缩取箱叉', 0, 0.65, z, 0.92, 0.045, 0.045, COLORS.steel)
      const toteBox = box('穿梭箱', 0, 0.94, 0, 0.58, 0.5, 0.43, COLORS.blue)
      box('料箱标签窗', 0, 0.95, 0.22, 0.2, 0.12, 0.015, COLORS.white)
    } else {
      box('托盘顶升平台', 0, 0.56, 0, 1.05, 0.12, 0.82, COLORS.blue)
      for (const x of [-0.38, 0.38]) for (const z of [-0.28, 0.28]) box('升降导柱', x, 0.51, z, 0.06, 0.22, 0.06, COLORS.steel)
      for (const x of [-0.46, 0.46]) for (const z of [-0.43, 0.43]) cylinder('载荷导向轮', x, 0.17, z, 0.1, 0.1, COLORS.rubber, 'x')
    }
    for (const x of [-length / 2 + 0.17, length / 2 - 0.17]) for (const z of [-width / 2 + 0.08, width / 2 - 0.08]) cylinder('巷道行走轮', x, 0.14, z, 0.1, 0.09, COLORS.rubber, 'z')
    for (const x of [-length / 2 - 0.02, length / 2 + 0.02]) {
      box('防撞端板', x, 0.28, 0, 0.06, 0.2, width * 0.85, COLORS.yellow)
      cylinder('激光测距传感器', x, 0.46, 0, 0.055, 0.045, COLORS.cyan, 'x')
    }
    for (let z = -width / 2; z <= width / 2; z += 0.08) box('状态灯带', 0, 0.5, z, length * 0.65, 0.025, 0.018, COLORS.cyan)
    if (fourWay) {
      for (const x of [-0.3, 0.3]) box('横向换轨轮组', x, 0.11, 0, 0.12, 0.08, width + 0.18, COLORS.steel)
      box('无线通信天线', 0, 0.57, -width / 2 - 0.08, 0.035, 0.22, 0.035, COLORS.white)
    }
    if (type === 'shuttle-radio') pallet(0, 0.67, 0, false)
  } else if (type === 'roller' || type === 'belt' || type === 'chain') {
    conveyor(6, type === 'chain' ? 1.4 : 1.2, type)
  } else if (type === 'transfer') {
    conveyor(2.4, 1.7, 'roller')
    for (const x of [-0.55, 0.55]) {
      box('升降链条导轨', x, 1.1, 0, 0.12, 0.12, 1.45, COLORS.dark)
      for (let z = -0.65; z < 0.7; z += 0.18) box('移载链节', x, 1.18, z, 0.12, 0.04, 0.12, COLORS.steel)
    }
    for (const x of [-0.48, 0.48]) for (const z of [-0.45, 0.45]) {
      beam('剪叉连杆', [x, 0.28, z], [x + 0.18, 0.78, z], 0.045, COLORS.blue)
      beam('剪叉连杆', [x + 0.18, 0.28, z], [x, 0.78, z], 0.045, COLORS.blue)
    }
    box('移载机底座', 0, 0.12, 0, 1.55, 0.15, 1.35, COLORS.dark)
  } else if (type === 'telescope') {
    for (const [index, length] of [[0, 5], [1, 3.8], [2, 2.5]]) {
      const z = -0.28 + index * 0.28
      box('伸缩臂机架', -1.9 + index * 0.95, 1.05 + index * 0.13, z, length, 0.16, 0.64, index === 0 ? COLORS.dark : COLORS.blue)
      box('伸缩臂输送带', -1.9 + index * 0.95, 1.15 + index * 0.13, z, length - 0.15, 0.04, 0.52, COLORS.rubber)
      for (let x = -length / 2 + 0.25; x < length / 2; x += 0.48) cylinder('承托滚轮', -1.9 + index * 0.95 + x, 0.97 + index * 0.13, z, 0.045, 0.58, COLORS.steel)
    }
    for (const x of [-2.8, 1.2]) for (const z of [-0.55, 0.55]) cylinder('移动底座脚轮', x, 0.18, z, 0.12, 0.09, COLORS.rubber, 'x')
    box('操作按钮盒', 1.9, 1.4, 0.65, 0.3, 0.25, 0.18, COLORS.dark)
    for (const x of [1.82, 1.9, 1.98]) cylinder('操作按钮', x, 1.43, 0.75, 0.025, 0.025, COLORS.green)
  } else if (type.startsWith('sorter-')) {
    const crossbelt = type === 'sorter-crossbelt'
    const radius = 2.6
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3, 1, -1.1), new THREE.Vector3(-1.8, 1, -1.1), new THREE.Vector3(0, 1, -1.1),
      new THREE.Vector3(2.25, 1, -1.1), new THREE.Vector3(3, 1, 0), new THREE.Vector3(2.25, 1, 1.1),
      new THREE.Vector3(0, 1, 1.1), new THREE.Vector3(-1.8, 1, 1.1), new THREE.Vector3(-3, 1, 1.1)
    ], false, 'centripetal')
    const points = curve.getPoints(80)
    for (let index = 0; index < points.length - 1; index += 1) {
      const from = points[index]
      const to = points[index + 1]
      const midpoint = from.clone().add(to).multiplyScalar(0.5)
      const length = from.distanceTo(to)
      const rail = box('环形分拣机主线', midpoint.x, 0.76, midpoint.z, length + 0.04, 0.16, 1.02, COLORS.dark)
      rail.rotation.y = Math.atan2(to.z - from.z, to.x - from.x)
      for (const side of [-0.42, 0.42]) {
        const roller = cylinder('分拣线滚筒', midpoint.x, 0.86, midpoint.z + side, 0.045, length, COLORS.steel, 'z')
        roller.rotation.y = Math.atan2(to.z - from.z, to.x - from.x)
      }
    }
    const bins = crossbelt ? 16 : 8
    for (let index = 0; index < bins; index += 1) {
      const point = curve.getPointAt(index / bins)
      const tangent = curve.getTangentAt(index / bins)
      const angle = Math.atan2(tangent.z, tangent.x)
      const trolley = box(crossbelt ? '交叉带分拣小车' : '滑块分拣载具', point.x, 1.02, point.z, crossbelt ? 0.42 : 0.5, 0.12, 0.72, index % 2 ? COLORS.blue : COLORS.cyan)
      trolley.rotation.y = angle
      if (crossbelt) {
        const belt = box('横向分拣小皮带', point.x, 1.1, point.z, 0.32, 0.035, 0.58, COLORS.rubber)
        belt.rotation.y = angle
      }
    }
    for (const x of [-2.5, 0, 2.5]) for (const z of [-0.85, 0.85]) box('分拣机支架', x, 0.38, z, 0.07, 0.72, 0.07, COLORS.steel)
    for (const x of [-2.4, -0.8, 0.8, 2.4]) {
      const chute = box('分流滑槽', x, 0.4, x < 0 ? -1.95 : 1.95, 0.9, 0.08, 0.76, COLORS.blue)
      chute.rotation.x = x < 0 ? -0.22 : 0.22
      box('分拣格口', x, 0.15, x < 0 ? -2.25 : 2.25, 0.95, 0.3, 0.8, COLORS.dark)
    }
    void radius
  } else if (type === 'pallet' || type === 'loaded') {
    pallet(0, 0, 0, type === 'loaded')
  } else if (type === 'tote') {
    box('周转箱箱体', 0, 0.38, 0, 0.6, 0.72, 0.4, COLORS.blue)
    box('箱口加强边', 0, 0.75, 0, 0.66, 0.08, 0.46, COLORS.dark)
    box('前侧把手凹槽', 0, 0.4, 0.21, 0.25, 0.12, 0.025, COLORS.dark)
    box('条码标签位', 0.18, 0.5, 0.215, 0.18, 0.12, 0.018, COLORS.white)
    for (const x of [-0.2, 0.2]) for (const z of [-0.12, 0.12]) box('堆叠定位脚', x, 0.03, z, 0.1, 0.06, 0.1, COLORS.dark)
  } else if (type === 'amr' || type === 'robot-topmodule') {
    const topModule = type === 'robot-topmodule'
    box('AMR底盘', 0, 0.24, 0, 1.1, 0.34, 0.84, '#e4e8e8')
    for (const x of [-0.34, 0.34]) for (const z of [-0.37, 0.37]) cylinder('全向驱動轮', x, 0.13, z, 0.14, 0.11, COLORS.rubber, 'x')
    box('顶部旋转雷达', 0.38, 0.48, 0, 0.12, 0.12, 0.12, COLORS.dark)
    cylinder('激光雷达转台', 0.38, 0.57, 0, 0.09, 0.08, COLORS.dark, 'y')
    for (const z of [-0.43, 0.43]) box('状态灯环', 0, 0.29, z, 0.72, 0.035, 0.025, COLORS.cyan)
    if (topModule) {
      for (const z of [-0.25, 0.25]) box('移载滚筒', 0, 0.53, z, 0.8, 0.08, 0.09, COLORS.steel)
      for (let x = -0.35; x <= 0.35; x += 0.18) cylinder('顶置动力辊筒', x, 0.55, 0, 0.045, 0.56, COLORS.steel, 'z')
      box('防撞触边', 0, 0.3, 0.43, 0.9, 0.06, 0.035, COLORS.yellow)
    } else {
      box('升降载台', 0, 0.5, 0, 0.75, 0.1, 0.64, COLORS.blue)
      for (const x of [-0.28, 0.28]) for (const z of [-0.22, 0.22]) box('升降导向柱', x, 0.42, z, 0.05, 0.21, 0.05, COLORS.steel)
      box('载荷到位光电', 0.49, 0.52, 0, 0.08, 0.08, 0.08, COLORS.red)
    }
  } else if (type === 'agv') {
    box('AGV驱动底盘', -0.25, 0.29, 0, 1.12, 0.34, 0.74, COLORS.orange)
    box('驱动舱罩壳', -0.62, 0.56, 0, 0.43, 0.32, 0.62, COLORS.dark)
    for (const z of [-0.32, 0.32]) cylinder('承载驱动轮', -0.35, 0.14, z, 0.16, 0.11, COLORS.rubber, 'x')
    for (const z of [-0.24, 0.24]) box('托盘搬运货叉', 0.55, 0.2, z, 1.1, 0.12, 0.12, COLORS.steel)
    for (const z of [-0.24, 0.24]) box('叉尖导向块', 1.1, 0.2, z, 0.12, 0.12, 0.14, COLORS.yellow)
    box('AGV门架立柱', -0.65, 1, 0, 0.08, 1.2, 0.58, COLORS.dark)
    box('导航激光扫描器', -0.72, 0.7, 0, 0.06, 0.12, 0.34, COLORS.cyan)
    beam('操纵立杆', [-0.78, 0.7, 0], [-0.85, 1.65, 0], 0.04, COLORS.steel)
    box('操纵手柄', -0.87, 1.67, 0, 0.38, 0.06, 0.08, COLORS.dark)
    cylinder('警示灯', -0.62, 1.68, 0, 0.07, 0.16, COLORS.yellow, 'y')
  } else if (type === 'lift' || type === 'lift-continuous') {
    const continuous = type === 'lift-continuous'
    for (const x of [-0.95, 0.95]) for (const z of [-0.8, 0.8]) {
      box('提升机井架立柱', x, 3, z, 0.11, 6, 0.11, COLORS.blue)
      for (let y = 0.4; y < 6; y += 0.75) box('井架横向加强撑', x, y, z, 0.15, 0.06, 0.15, COLORS.steel)
    }
    for (const y of [0.2, 6]) for (const z of [-0.8, 0.8]) box('端部框架横梁', 0, y, z, 2, 0.12, 0.12, COLORS.blue)
    for (const z of [-0.82, 0.82]) for (let x = -0.9; x <= 0.9; x += 0.22) box('防护网竖丝', x, 3, z, 0.025, 5.7, 0.025, COLORS.steel)
    for (const z of [-0.82, 0.82]) for (let y = 0.3; y <= 5.8; y += 0.25) box('防护网横丝', 0, y, z, 1.9, 0.025, 0.025, COLORS.steel)
    if (continuous) {
      for (let y = 0.45; y < 5.7; y += 0.85) {
        box('循環托盘承载架', 0, y, 0, 1.35, 0.1, 1.2, COLORS.orange)
        pallet(0, y + 0.06, 0, false)
      }
      for (const x of [-0.62, 0.62]) box('循环链条', x, 3, 0.74, 0.055, 5.8, 0.045, COLORS.dark)
    } else {
      box('提升载货平台', 0, 1.3, 0, 1.75, 0.16, 1.45, COLORS.orange)
      for (const x of [-0.72, 0.72]) box('载台导向靴', x, 1.42, 0, 0.1, 0.25, 0.18, COLORS.dark)
      for (const z of [-0.58, 0.58]) box('平台滚筒', 0, 1.42, z, 1.55, 0.08, 0.08, COLORS.steel)
      box('提升链条', -0.8, 3.2, 0, 0.035, 5.8, 0.035, COLORS.dark)
    }
    cylinder('顶部提升驱动', 0, 6.18, 0, 0.2, 0.75, COLORS.dark, 'x')
    for (const x of [-1, 1]) box('进出口光电', x * 0.78, 1.25, 0.86, 0.06, 0.2, 0.06, COLORS.cyan)
  } else if (type === 'station' || type === 'station-pack' || type === 'station-inbound') {
    const pack = type === 'station-pack'
    const inbound = type === 'station-inbound'
    box('工作站台面', 0, 1.05, 0, 2.35, 0.14, 1.25, COLORS.steel)
    for (const x of [-1, 1]) for (const z of [-0.5, 0.5]) box('工作台支腿', x, 0.5, z, 0.08, 1, 0.08, COLORS.blue)
    for (const x of [-0.85, 0.85]) cylinder('工位短滚筒', x, 1.18, 0, 0.06, 1.05, COLORS.steel, 'z')
    box('操作终端支架', 0.7, 1.42, -0.4, 0.05, 0.62, 0.05, COLORS.dark)
    box('操作终端外壳', 0.7, 1.72, -0.4, 0.62, 0.42, 0.12, COLORS.dark)
    box('终端显示屏', 0.7, 1.72, -0.33, 0.52, 0.32, 0.018, COLORS.screen)
    box('键盘操作台', 0.62, 1.32, -0.12, 0.55, 0.06, 0.3, COLORS.dark)
    for (const x of [-0.5, 0]) box('周转箱位', x, 1.33, 0.4, 0.42, 0.32, 0.38, COLORS.blue)
    for (let y = 1.3; y < 2.1; y += 0.18) cylinder('工位状态灯', 1.05, y, -0.48, 0.045, 0.08, y > 1.8 ? COLORS.green : COLORS.yellow, 'y')
    if (pack) {
      box('电子秤底座', -0.55, 1.22, -0.35, 0.55, 0.08, 0.48, COLORS.dark)
      box('称重秤盘', -0.55, 1.29, -0.35, 0.48, 0.035, 0.4, COLORS.steel)
      box('热敏标签打印机', -0.78, 1.42, -0.45, 0.36, 0.32, 0.3, COLORS.white)
      box('封箱机龙门', 0, 1.95, 0.4, 0.95, 0.08, 0.08, COLORS.orange)
      for (const x of [-0.43, 0.43]) box('封箱机立柱', x, 1.65, 0.4, 0.07, 0.65, 0.07, COLORS.orange)
    } else if (inbound) {
      for (const x of [-0.85, 0.85]) box('检测门立柱', x, 1.75, 0, 0.06, 1.1, 0.06, COLORS.orange)
      box('检测门横梁', 0, 2.28, 0, 1.8, 0.08, 0.08, COLORS.orange)
      for (const x of [-0.48, 0, 0.48]) box('条码读码器', x, 2.18, 0.08, 0.12, 0.13, 0.12, COLORS.dark)
      box('轮廓检测头', 0, 2.4, 0, 0.25, 0.1, 0.25, COLORS.cyan)
      conveyor(2.4, 1, 'roller')
    }
  } else if (type === 'dock-leveler') {
    box('装卸平台基坑框架', 0, 0.42, 0, 2.1, 0.22, 2.6, COLORS.dark)
    box('防滑钢板台面', 0, 0.56, 0, 1.9, 0.1, 2.35, COLORS.steel)
    box('铰接唇板', 0, 0.61, 1.35, 1.9, 0.08, 0.42, COLORS.yellow)
    for (const x of [-0.68, 0.68]) {
      beam('液压升降缸', [x, 0.2, -0.55], [x, 0.58, 0.35], 0.08, COLORS.dark)
      box('侧向防夹板', x * 1.35, 0.55, 0, 0.08, 0.34, 1.5, COLORS.yellow)
    }
    cabinet(1.35, 0.95, -0.65, 0.35, 0.9, 0.3)
    for (const x of [-1.1, 1.1]) box('月台缓冲块', x, 0.55, 1.58, 0.18, 0.52, 0.18, COLORS.rubber)
  } else if (type === 'dock-shelter') {
    for (const x of [-1.6, 1.6]) box('門封侧框架', x, 1.85, 0, 0.16, 3.7, 0.25, COLORS.dark)
    box('门封顶部横梁', 0, 3.65, 0, 3.3, 0.18, 0.25, COLORS.dark)
    for (const x of [-1.42, 1.42]) box('侧封帘', x, 1.9, 0.2, 0.3, 3.3, 0.06, COLORS.rubber)
    box('顶部封帘', 0, 3.34, 0.2, 2.6, 0.42, 0.06, COLORS.rubber)
    for (const x of [-1.25, 1.25]) box('橡胶防撞块', x, 0.55, 0.35, 0.22, 0.55, 0.2, COLORS.yellow)
    for (const x of [-1.8, 1.8]) cylinder('月台信号灯', x, 1.25, 0.05, 0.07, 0.4, x < 0 ? COLORS.green : COLORS.red, 'y')
  } else if (type === 'fence') {
    const length = 5
    for (const x of [-2.5, -1.25, 0, 1.25, 2.5]) {
      box('安全围栏立柱', x, 1.15, 0, 0.07, 2.3, 0.07, COLORS.yellow)
      box('围栏底脚板', x, 0.1, 0, 0.3, 0.08, 0.24, COLORS.dark)
    }
    for (const y of [0.2, 2.1]) box('围栏边框横梁', 0, y, 0, length, 0.07, 0.07, COLORS.yellow)
    for (let x = -2.4; x < 2.5; x += 0.12) box('防护网竖丝', x, 1.15, 0, 0.018, 1.8, 0.025, COLORS.steel)
    for (let y = 0.3; y < 2; y += 0.12) box('防护网横丝', 0, y, 0, length - 0.12, 0.018, 0.025, COLORS.steel)
    box('安全检修门框', 1.15, 1.15, 0.04, 0.9, 1.9, 0.1, COLORS.dark)
    box('安全门把手', 1.45, 1.15, 0.11, 0.08, 0.2, 0.08, COLORS.green)
    box('门锁联锁开关', 1.65, 1.5, 0.13, 0.12, 0.18, 0.08, COLORS.dark)
  } else if (type === 'cabinet') {
    cabinet(0, 0.95, 0, 0.86, 1.9, 0.55)
    for (const [y, color] of [[2.03, COLORS.green], [2.14, COLORS.yellow], [2.25, COLORS.red]]) cylinder('三色塔灯', 0, y, 0, 0.07, 0.11, color, 'y')
    box('设备铭牌', -0.22, 0.25, 0.29, 0.28, 0.12, 0.012, COLORS.white)
  } else if (type === 'sensor-gate' || type === 'sensor-cube' || type === 'sensor-lightcurtain') {
    const lightCurtain = type === 'sensor-lightcurtain'
    const gateWidth = 1.8
    for (const x of [-gateWidth / 2, gateWidth / 2]) {
      box(lightCurtain ? '光幕发射立柱' : '识别门立柱', x, 1.45, 0, 0.1, 2.9, 0.1, lightCurtain ? COLORS.yellow : COLORS.dark)
      for (let y = 0.35; y < 2.7; y += 0.28) box(lightCurtain ? '红外光束发射窗' : '读码器窗口', x + (x < 0 ? 0.07 : -0.07), y, 0, 0.035, 0.09, 0.08, lightCurtain ? COLORS.red : COLORS.cyan)
    }
    box('识别门横梁', 0, 2.86, 0, gateWidth + 0.1, 0.1, 0.12, COLORS.dark)
    if (type === 'sensor-cube') {
      box('称重检测平台', 0, 0.16, 0, 2, 0.24, 1.6, COLORS.steel)
      box('顶置体积测量头', 0, 2.65, 0, 0.36, 0.16, 0.36, COLORS.cyan)
      for (const x of [-0.7, 0.7]) box('侧向轮廓测距头', x, 1.8, 0.05, 0.12, 0.12, 0.15, COLORS.red)
      box('测量结果屏', 0.72, 2.05, 0.1, 0.42, 0.28, 0.08, COLORS.dark)
      box('显示屏幕', 0.72, 2.05, 0.15, 0.34, 0.2, 0.02, COLORS.screen)
    } else if (lightCurtain) {
      box('安全光幕底座', 0, 0.06, 0, 2.15, 0.12, 0.2, COLORS.dark)
      cylinder('区域安全扫描仪', 0, 0.18, 0.38, 0.13, 0.12, COLORS.cyan, 'y')
    } else {
      for (const x of [-0.55, 0, 0.55]) box('顶部读码器', x, 2.72, 0, 0.16, 0.12, 0.16, COLORS.cyan)
      box('输送线对接底座', 0, 0.1, 0, 2.1, 0.14, 1.3, COLORS.dark)
    }
  } else {
    throw Error(`未知设备模型类型：${type}`)
  }

  return root
}
