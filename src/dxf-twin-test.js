import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import './dxf-twin-test.css'

const host = document.querySelector('#dxf-twin-test')
host.innerHTML = `
  <main class="dxf-app">
    <header class="dxf-header">
      <div><span class="dxf-eyebrow">WAREHOUSE DIGITAL TWIN · EDITOR PREVIEW</span><h1>二维布局编辑与三维数字孪生</h1></div>
      <div class="dxf-header-actions"><span class="dxf-fps"><i></i><b id="fps-value">FPS --</b></span><label class="dxf-file-button">导入 DXF<input id="dxf-file" type="file" accept=".dxf"></label></div>
    </header>
    <section class="dxf-toolbar"><div class="dxf-tabs"><button class="active" data-view="2d">二维编辑</button><button data-view="3d">三维孪生</button></div><button id="fit-view" class="dxf-quiet">适配画布</button><button id="toggle-source-geometry" class="dxf-quiet">显示 DXF 原始线框</button><button id="export-simple-map" class="dxf-quiet">导出简化二维图 SVG</button><button id="validate-layout" class="dxf-quiet">校验布局</button><button id="clear-layout" class="dxf-quiet">清空手动设备</button><span id="dxf-status">简图模式：只显示设备轮廓；导入 DXF 后可导出简化二维图。</span></section>
    <section class="dxf-main">
      <aside class="dxf-sidebar">
        <section class="panel-section"><div class="panel-title"><h2>设备库</h2><small>拖到画布放置</small></div><div class="equipment-library">
          <button class="equipment-tool" draggable="true" data-category="stacker"><i class="device-icon stacker" aria-hidden="true"></i><span>堆垛机</span><small>巷道轨道 · 载货台 · 货叉</small></button>
          <button class="equipment-tool" draggable="true" data-category="rack"><i class="device-icon rack" aria-hidden="true"></i><span>货架</span><small>货位阵列 · 横梁 · 立柱</small></button>
          <button class="equipment-tool" draggable="true" data-category="conveyor"><i class="device-icon conveyor" aria-hidden="true"></i><span>输送线</span><small>滚筒 · 侧梁 · 流向</small></button>
          <button class="equipment-tool" draggable="true" data-category="rgv"><i class="device-icon rgv" aria-hidden="true"></i><span>RGV / 地轨</span><small>地轨 · 穿梭台车</small></button>
          <button class="equipment-tool" draggable="true" data-category="agv"><i class="device-icon agv" aria-hidden="true"></i><span>AGV</span><small>车体 · 驱动轮 · 导航方向</small></button>
        </div></section>
        <section class="panel-section"><div class="panel-title"><h2>当前布局</h2><span class="mode-pill" id="edit-mode">选择模式</span></div><div id="category-list" class="dxf-category-list"></div></section>
        <section class="panel-section rack-builder"><div class="panel-title"><h2>标准货架生成</h2></div><div class="form-grid">
          <label>列数<input id="rack-columns" type="number" min="1" max="80" value="8"></label><label>层数<input id="rack-levels" type="number" min="1" max="30" value="6"></label>
          <label>货架宽 mm<input id="rack-width" type="number" min="100" value="24000"></label><label>单列宽 mm<input id="rack-bay-width" type="number" min="100" value="3000"></label>
          <label>层高 mm<input id="rack-level-height" type="number" min="100" value="1500"></label><label>深度 mm<input id="rack-depth" type="number" min="100" value="1100"></label>
        </div><button id="generate-rack" class="primary-action">生成货架并放置</button><p class="helper-text">按标准等宽、等层高生成储位；生成后可点选单个储位调整尺寸。</p></section>
        <section class="panel-section dxf-summary"><div class="panel-title"><h2>DXF 识别结果</h2></div><p id="source-name">未导入底图</p><div id="source-categories" class="dxf-category-list"><div class="dxf-empty">导入后显示识别数量</div></div></section>
      </aside>
      <div class="dxf-view"><canvas id="dxf-2d" aria-label="二维布局画布" tabindex="0"></canvas><div id="dxf-3d" aria-label="三维孪生场景"></div><div id="dxf-empty" class="dxf-empty-view"><b>拖放左侧设备，开始绘制仓储布局</b><span>可直接在空白画布编辑，也可先导入 DXF 作为参考底图</span><button id="create-blank" class="primary-action">使用空白画布</button></div><div class="canvas-hint" id="canvas-hint">滚轮缩放 · 按住空格或中键平移 · 右键设备打开属性</div><div class="dxf-view-label" id="view-label">二维布局 · mm</div></div>
      <aside class="inspector" id="inspector"><div class="inspector-empty"><div>◫</div><b>未选择设备</b><span>在设备库添加设备，或在画布选择已有设备</span></div></aside>
    </section>
    <footer class="dxf-footer"><span id="parse-progress">就绪</span><span id="validation-summary">布局校验尚未运行</span><span>三维视图渲染帧率 FPS</span></footer>
  </main>`

const fileInput = document.querySelector('#dxf-file')
const statusNode = document.querySelector('#dxf-status')
const progressNode = document.querySelector('#parse-progress')
const categoryNode = document.querySelector('#source-categories')
const layoutCategoryNode = document.querySelector('#category-list')
const canvas = document.querySelector('#dxf-2d')
const context = canvas.getContext('2d')
const sceneHost = document.querySelector('#dxf-3d')
const emptyNode = document.querySelector('#dxf-empty')
const fpsNode = document.querySelector('#fps-value')
const viewLabel = document.querySelector('#view-label')
const inspector = document.querySelector('#inspector')
const palette = {stacker: '#ffb454', rack: '#54b5e5', conveyor: '#42d6c2', rgv: '#c393ff', agv: '#e7da62'}
const names = {stacker: '堆垛机', rack: '货架', conveyor: '输送线', rgv: 'RGV / 地轨', agv: 'AGV'}
const iconSvg = {
  stacker: '<path d="M8 8h8v48H8zM48 8h8v48h-8z"/><path d="M12 12h40M12 52h40"/><rect x="23" y="27" width="18" height="14" rx="2"/><path d="M41 34h13M54 34l-4-3m4 3-4 3"/>',
  rack: '<path d="M7 8h50v48H7z"/><path d="M7 24h50M7 40h50M24 8v48M40 8v48"/><path d="m8 23 14-14m-14 30 14-14m-14 30 14-14m4 14 14-14m2 14 14-14" opacity=".68"/><circle cx="10" cy="10" r="2"/><circle cx="54" cy="10" r="2"/><circle cx="10" cy="54" r="2"/><circle cx="54" cy="54" r="2"/>',
  conveyor: '<path d="M8 19h48v26H8z"/><path d="M8 24h48M8 40h48"/><path d="M16 22v20m9-20v20m9-20v20m9-20v20m9-20v20"/><path d="M20 32h23m0 0-5-4m5 4-5 4"/>',
  rgv: '<path d="M7 15h50M7 49h50"/><path d="M11 11v8m8-8v8m8-8v8m8-8v8m8-8v8m8-8v8m-40 26v8m8-8v8m8-8v8m8-8v8m8-8v8m8-8v8"/><rect x="24" y="22" width="22" height="20" rx="3"/><path d="M29 27h12v10H29zM35 25v-4m0 24v-4"/>',
  agv: '<path d="M18 9h28l8 10v27l-8 9H18l-8-9V19z"/><path d="M18 16h28v25H18z"/><path d="M23 22h18v12H23z"/><rect x="7" y="21" width="6" height="10" rx="2"/><rect x="51" y="21" width="6" height="10" rx="2"/><rect x="7" y="35" width="6" height="10" rx="2"/><rect x="51" y="35" width="6" height="10" rx="2"/><path d="M32 30V11m0 0-4 5m4-5 4 5"/>'
}
document.querySelectorAll('.device-icon').forEach(icon => {
  const category = [...icon.classList].find(name => iconSvg[name])
  if (category) icon.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">${iconSvg[category]}</svg>`
})
let result = null
let manualDevices = []
let currentView = '2d'
let renderFrame = 0
let scene = null
let camera = null
let renderer = null
let controls = null
let resizeObserver = null
let nextDeviceId = 1
let placementCategory = null
let selected = null
let view2d = {scale: 0.025, x: 0, y: 0}
let pointerAction = null
let spaceDown = false
let validationState = null
let showSourceGeometry = false

const worker = new Worker(new URL('./dxf-parser.worker.js', import.meta.url), {type: 'module'})
worker.addEventListener('message', event => {
  const message = event.data
  if (message.type === 'progress') {
    const percent = Math.min(99, Math.floor(message.read / message.size * 100))
    progressNode.textContent = `读取并解析 ${percent}% · ${(message.read / 1024 / 1024).toFixed(0)} / ${(message.size / 1024 / 1024).toFixed(0)} MB`
    return
  }
  if (message.type === 'error') {
    statusNode.textContent = message.message
    progressNode.textContent = '解析失败'
    fileInput.disabled = false
    return
  }
  result = message.data
  fileInput.disabled = false
  document.querySelector('#source-name').textContent = `${result.fileName} · ${result.entities.length.toLocaleString()} 个图元`
  emptyNode.hidden = true
  statusNode.textContent = `DXF 已读取 · ${result.devices.length.toLocaleString()} 个候选对象；自动分类待核验，请在画布手动补图后导出。`
  progressNode.textContent = `解析完成 · ${(result.fileSize / 1024 / 1024).toFixed(1)} MB · ${result.elapsedSeconds.toFixed(1)} 秒`
  renderSourceCategories()
  fit2d()
  refreshScene()
  draw2d()
  setView(currentView)
})

fileInput.addEventListener('change', event => {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.dxf')) {
    statusNode.textContent = '请选择 .dxf 文件。'
    return
  }
  fileInput.disabled = true
  statusNode.textContent = `正在解析 ${file.name}。大文件会分块读取，页面仍可响应。`
  categoryNode.innerHTML = '<div class="dxf-empty">正在扫描图层、设备块与二维图元…</div>'
  progressNode.textContent = `准备读取 ${(file.size / 1024 / 1024).toFixed(1)} MB`
  worker.postMessage({file, name: file.name, size: file.size})
})

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)))
document.querySelector('#fit-view').addEventListener('click', () => {
  if (currentView === '2d') fit2d()
  else if (controls) controls.reset()
})
document.querySelector('#validate-layout').addEventListener('click', validateLayout)
document.querySelector('#toggle-source-geometry').addEventListener('click', event => {
  showSourceGeometry = !showSourceGeometry
  event.currentTarget.classList.toggle('active', showSourceGeometry)
  event.currentTarget.textContent = showSourceGeometry ? '隐藏 DXF 原始线框' : '显示 DXF 原始线框'
  statusNode.textContent = showSourceGeometry ? '已显示按图层/块名初筛的原始线框；它们尚未通过人工设备语义确认。' : '已隐藏原始 DXF 线框，当前仅显示识别对象的外框和手动布局。'
  fit2d()
})
document.querySelector('#export-simple-map').addEventListener('click', exportSimpleMap)
document.querySelector('#clear-layout').addEventListener('click', () => {
  if (manualDevices.length === 0) return
  manualDevices = []
  selected = null
  validationState = null
  renderInspector()
  updateLayoutCounts()
  refreshScene()
  draw2d()
  statusNode.textContent = '已清空手动添加的设备，DXF 底图和识别结果保留。'
})
document.querySelector('#create-blank').addEventListener('click', () => {
  emptyNode.hidden = true
  statusNode.textContent = '空白画布已就绪。可从左侧拖入设备或使用标准货架生成器。'
  fit2d()
})
document.querySelector('#generate-rack').addEventListener('click', generateRack)

document.querySelectorAll('.equipment-tool').forEach(tool => {
  tool.addEventListener('dragstart', event => {
    placementCategory = tool.dataset.category
    event.dataTransfer.setData('text/plain', placementCategory)
    event.dataTransfer.effectAllowed = 'copy'
    document.querySelector('#edit-mode').textContent = `拖放${names[placementCategory]}`
  })
  tool.addEventListener('dragend', () => {
    placementCategory = null
    document.querySelector('#edit-mode').textContent = '选择模式'
  })
  tool.addEventListener('click', () => {
    placementCategory = tool.dataset.category
    document.querySelector('#edit-mode').textContent = `点击画布放置${names[placementCategory]}`
    statusNode.textContent = `已选择${names[placementCategory]}，点击画布放置；按 Esc 取消。`
  })
})

canvas.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' })
canvas.addEventListener('drop', event => {
  event.preventDefault()
  const category = event.dataTransfer.getData('text/plain')
  if (names[category]) placeDevice(category, screenToWorld(event.clientX, event.clientY))
})
window.addEventListener('keydown', event => {
  if (event.code === 'Space' && !isInputTarget(event.target)) { spaceDown = true; event.preventDefault() }
  if (event.key === 'Escape') { placementCategory = null; document.querySelector('#edit-mode').textContent = '选择模式' }
  if ((event.key === 'Delete' || event.key === 'Backspace') && selected && !isInputTarget(event.target)) removeSelected()
})
window.addEventListener('keyup', event => { if (event.code === 'Space') spaceDown = false })

function isInputTarget(target) {
  return target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
}

function setView(view) {
  currentView = view
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view))
  canvas.hidden = view !== '2d'
  sceneHost.hidden = view !== '3d'
  document.querySelector('.inspector').classList.toggle('is-3d', view === '3d')
  viewLabel.textContent = view === '2d' ? '二维布局 · mm' : '三维数字孪生 · X/Z'
  if (view === '2d') {
    if (renderFrame) cancelAnimationFrame(renderFrame)
    renderFrame = 0
    fpsNode.textContent = 'FPS --'
    draw2d()
  }
  if (view === '3d' && !renderFrame) animate()
  if (view === '3d' && renderer) renderer.setSize(sceneHost.clientWidth, sceneHost.clientHeight)
}

function renderSourceCategories() {
  if (!result) return
  const counts = result.devices.reduce((all, device) => {
    all[device.category] = (all[device.category] || 0) + 1
    return all
  }, {})
  categoryNode.innerHTML = Object.entries(names).map(([key, name]) => `<div class="dxf-category"><i style="--device-color:${palette[key]}"></i><span>${name}</span><b>${counts[key] || 0}</b></div>`).join('')
}

function updateLayoutCounts() {
  const counts = manualDevices.reduce((all, device) => {
    all[device.category] = (all[device.category] || 0) + 1
    return all
  }, {})
  layoutCategoryNode.innerHTML = Object.entries(names).map(([key, name]) => `<div class="dxf-category"><i style="--device-color:${palette[key]}"></i><span>${name}</span><b>${counts[key] || 0}</b></div>`).join('')
}

function sceneBounds() {
  let bounds = result ? {...result.bounds} : {minX: 0, minY: 0, maxX: 30000, maxY: 20000}
  if (result && !showSourceGeometry && result.devices.length > 0) {
    const visibleDevices = result.devices.filter(isRenderableDetectedDevice)
    if (visibleDevices.length === 0) return bounds
    const firstDeviceBounds = visibleDevices[0].bounds
    bounds = {...firstDeviceBounds}
    for (const device of visibleDevices.slice(1)) {
      bounds.minX = Math.min(bounds.minX, device.bounds.minX)
      bounds.minY = Math.min(bounds.minY, device.bounds.minY)
      bounds.maxX = Math.max(bounds.maxX, device.bounds.maxX)
      bounds.maxY = Math.max(bounds.maxY, device.bounds.maxY)
    }
  }
  if (manualDevices.length === 0) return bounds
  for (const device of manualDevices) {
    bounds.minX = Math.min(bounds.minX, device.x)
    bounds.minY = Math.min(bounds.minY, device.y)
    bounds.maxX = Math.max(bounds.maxX, device.x + device.width)
    bounds.maxY = Math.max(bounds.maxY, device.y + layoutDepth(device))
  }
  return bounds
}

function layoutDepth(device) {
  if (device.category === 'rack' && device.layoutDepth) return device.layoutDepth
  return device.depth
}

function resize2d() {
  const rect = canvas.getBoundingClientRect()
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.max(1, Math.floor(rect.width * ratio))
  canvas.height = Math.max(1, Math.floor(rect.height * ratio))
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  draw2d()
}

function fit2d() {
  const bounds = sceneBounds()
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(bounds.maxX - bounds.minX, 1)
  const height = Math.max(bounds.maxY - bounds.minY, 1)
  view2d.scale = Math.min((rect.width - 100) / width, (rect.height - 100) / height)
  view2d.x = rect.width / 2 - ((bounds.minX + bounds.maxX) / 2) * view2d.scale
  view2d.y = rect.height / 2 + ((bounds.minY + bounds.maxY) / 2) * view2d.scale
  draw2d()
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect()
  return {x: (clientX - rect.left - view2d.x) / view2d.scale, y: -(clientY - rect.top - view2d.y) / view2d.scale}
}

function draw2d() {
  if (!canvas.width || !canvas.height) return
  const ratio = window.devicePixelRatio || 1
  const width = canvas.width / ratio
  const height = canvas.height / ratio
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.fillStyle = '#0a1723'
  context.fillRect(0, 0, width, height)
  context.strokeStyle = '#163244'
  context.lineWidth = 1
  for (let x = 0; x < width; x += 32) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke() }
  for (let y = 0; y < height; y += 32) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke() }
  context.save()
  context.translate(view2d.x, view2d.y)
  context.scale(view2d.scale, -view2d.scale)
  if (result) {
    if (showSourceGeometry) {
      for (const entity of result.entities) {
        context.strokeStyle = palette[entity.category] || '#8297a4'
        context.lineWidth = 1 / view2d.scale
        context.beginPath()
        if (entity.kind === 'line') {
          context.moveTo(entity.points[0][0], entity.points[0][1]); context.lineTo(entity.points[1][0], entity.points[1][1])
        } else if (entity.kind === 'polyline') {
          entity.points.forEach((point, index) => index === 0 ? context.moveTo(point[0], point[1]) : context.lineTo(point[0], point[1]))
          if (entity.closed) context.closePath()
        } else if (entity.kind === 'circle') {
          context.arc(entity.center[0], entity.center[1], entity.radius, 0, Math.PI * 2)
        }
        context.stroke()
      }
    }
    for (const device of result.devices) {
      if (!isRenderableDetectedDevice(device)) continue
      context.strokeStyle = palette[device.category] || '#a9bbc5'
      context.lineWidth = Math.max(1 / view2d.scale, 0.8 / view2d.scale)
      context.strokeRect(device.bounds.minX, device.bounds.minY, device.bounds.maxX - device.bounds.minX, device.bounds.maxY - device.bounds.minY)
    }
  }
  for (const device of manualDevices) drawManualDevice(device)
  context.restore()
}

function isRenderableDetectedDevice(device) {
  const width = device.bounds.maxX - device.bounds.minX
  const height = device.bounds.maxY - device.bounds.minY
  return width <= 250000 && height <= 250000
}

function exportSimpleMap() {
  if (!result && manualDevices.length === 0) {
    statusNode.textContent = '请先导入 DXF 或在画布上放置设备，再导出简图。'
    return
  }
  if (result && manualDevices.length === 0) {
    statusNode.textContent = 'DXF 自动识别结果尚未通过设备语义和几何核验，暂不导出自动简图；请先用左侧设备库手动补齐布局。'
    return
  }
  const detected = []
  const manual = manualDevices.map(device => ({
    name: names[device.category],
    category: device.category,
    minX: device.x,
    minY: device.y,
    maxX: device.x + device.width,
    maxY: device.y + layoutDepth(device)
  }))
  const devices = [...detected, ...manual]
  const minX = Math.min(...devices.map(device => device.minX))
  const minY = Math.min(...devices.map(device => device.minY))
  const maxX = Math.max(...devices.map(device => device.maxX))
  const maxY = Math.max(...devices.map(device => device.maxY))
  const mapWidth = Math.max(maxX - minX, 1)
  const mapHeight = Math.max(maxY - minY, 1)
  const margin = Math.max(mapWidth, mapHeight) * 0.035
  const viewWidth = mapWidth + margin * 2
  const viewHeight = mapHeight + margin * 2
  const width = 1600
  const height = Math.max(1, Math.round(width * viewHeight / viewWidth))
  const svgDevices = devices.map(device => {
    const x = device.minX - minX + margin
    const y = maxY - device.maxY + margin
    const itemWidth = Math.max(device.maxX - device.minX, mapWidth * 0.001)
    const itemHeight = Math.max(device.maxY - device.minY, mapHeight * 0.001)
    const color = palette[device.category] || '#64748b'
    return `<g><rect x="${x}" y="${y}" width="${itemWidth}" height="${itemHeight}" rx="${Math.min(itemWidth, itemHeight) * 0.08}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="${Math.max(mapWidth * 0.0012, 1)}"/><title>${escapeXml(names[device.category] || '设备')} · ${escapeXml(device.name || '')}</title></g>`
  }).join('')
  const counts = devices.reduce((total, device) => {
    total[device.category] = (total[device.category] || 0) + 1
    return total
  }, {})
  const labelSize = Math.max(Math.min(mapWidth, mapHeight) * 0.018, 12)
  const legend = Object.entries(names).filter(([category]) => counts[category]).map(([category, name], index) => {
    const rowHeight = labelSize * 1.8
    const y = margin + labelSize * 2.8 + index * rowHeight
    return `<g transform="translate(${margin},${y})"><rect width="${labelSize}" height="${labelSize * 0.72}" rx="3" fill="${palette[category]}" fill-opacity="0.18" stroke="${palette[category]}"/><text x="${labelSize * 1.4}" y="${labelSize * 0.68}" font-size="${labelSize}" fill="#273746">${escapeXml(name)} ${counts[category]}</text></g>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${viewWidth} ${viewHeight}"><rect width="100%" height="100%" fill="#fff"/><text x="${margin}" y="${margin * 0.8}" font-size="${labelSize * 1.25}" font-weight="600" fill="#172b3a">仓储设备简化二维布局</text>${svgDevices}${legend}</svg>`
  const blob = new Blob([svg], {type: 'image/svg+xml;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${result?.fileName?.replace(/\.dxf$/i, '') || '仓储布局'}-简化二维图.svg`
  link.click()
  URL.revokeObjectURL(url)
  statusNode.textContent = `已导出简化二维图：${devices.length.toLocaleString()} 个设备轮廓；不包含 CAD 标注和原始线条。`
}

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, character => {
    if (character === '<') return '&lt;'
    if (character === '>') return '&gt;'
    if (character === '&') return '&amp;'
    if (character === '"') return '&quot;'
    return '&apos;'
  })
}

function drawManualDevice(device) {
  const selectedDevice = selected?.id === device.id
  context.save()
  context.translate(device.x, device.y)
  context.rotate((device.rotation || 0) * Math.PI / 180)
  const mapDepth = layoutDepth(device)
  const color = palette[device.category]
  context.fillStyle = `${color}18`
  context.strokeStyle = selectedDevice ? '#ffffff' : color
  context.lineWidth = (selectedDevice ? 3 : 1.8) / view2d.scale
  context.fillRect(0, 0, device.width, mapDepth)
  context.strokeRect(0, 0, device.width, mapDepth)
  if (device.category === 'rack') {
    const cellWidth = device.width / device.columns
    const cellHeight = mapDepth / device.levels
    context.lineWidth = 1 / view2d.scale
    context.strokeStyle = '#a6dff5'
    for (let column = 1; column < device.columns; column++) {
      context.beginPath(); context.moveTo(column * cellWidth, 0); context.lineTo(column * cellWidth, device.depth); context.stroke()
    }
    for (let level = 1; level < device.levels; level++) {
      context.beginPath(); context.moveTo(0, level * cellHeight); context.lineTo(device.width, level * cellHeight); context.stroke()
    }
    for (let index = 0; index < device.slots.length; index++) {
      const slotData = device.slots[index]
      const column = index % device.columns
      const level = Math.floor(index / device.columns)
      const slotWidth = Math.min(cellWidth, slotData.width)
      const slotHeight = Math.min(cellHeight, slotData.height)
      context.strokeStyle = slotData.enabled ? '#7da8bb' : '#775f69'
      context.lineWidth = 0.8 / view2d.scale
      context.strokeRect(column * cellWidth, level * cellHeight, slotWidth, slotHeight)
      if (cellWidth * view2d.scale > 14 && cellHeight * view2d.scale > 9) {
        context.strokeStyle = `${color}9c`
        context.lineWidth = 0.55 / view2d.scale
        context.beginPath()
        context.moveTo(column * cellWidth + cellWidth * 0.18, level * cellHeight + cellHeight * 0.18)
        context.lineTo(column * cellWidth + cellWidth * 0.82, level * cellHeight + cellHeight * 0.82)
        context.moveTo(column * cellWidth + cellWidth * 0.82, level * cellHeight + cellHeight * 0.18)
        context.lineTo(column * cellWidth + cellWidth * 0.18, level * cellHeight + cellHeight * 0.82)
        context.stroke()
      }
    }
    const slot = selected?.id === device.id ? selected.slotIndex : -1
      if (slot >= 0) {
      const column = slot % device.columns
      const level = Math.floor(slot / device.columns)
      context.fillStyle = '#f6cf5e77'
      context.fillRect(column * cellWidth, level * cellHeight, cellWidth, cellHeight)
      context.strokeStyle = '#ffe58b'
      context.lineWidth = 3 / view2d.scale
      context.strokeRect(column * cellWidth, level * cellHeight, cellWidth, cellHeight)
    }
  } else if (device.category === 'stacker') {
    const rail = Math.max(device.width * 0.06, 18 / view2d.scale)
    context.fillStyle = '#ffe4bd'
    context.fillRect(device.width * 0.12, 0, rail, mapDepth)
    context.fillRect(device.width * 0.82, 0, rail, mapDepth)
    context.strokeStyle = '#ffe4bd'
    context.lineWidth = 1.2 / view2d.scale
    const sleeperCount = Math.min(18, Math.max(4, Math.floor(mapDepth / Math.max(device.width * 0.55, 1))))
    for (let index = 0; index <= sleeperCount; index++) {
      const y = mapDepth * index / sleeperCount
      context.beginPath(); context.moveTo(device.width * 0.12, y); context.lineTo(device.width * 0.88, y); context.stroke()
    }
    context.fillStyle = '#ffb454'
    context.strokeStyle = '#fff0d1'
    context.lineWidth = 1.4 / view2d.scale
    context.fillRect(device.width * 0.24, mapDepth * 0.42, device.width * 0.52, mapDepth * 0.16)
    context.strokeRect(device.width * 0.24, mapDepth * 0.42, device.width * 0.52, mapDepth * 0.16)
    const reach = device.forkMode === 'double' ? device.doubleForkMax : device.singleForkMax
    context.strokeStyle = '#fff0d1'
    context.lineWidth = Math.max(2 / view2d.scale, device.width * 0.035)
    const forkY = mapDepth * 0.5
    context.beginPath(); context.moveTo(device.width * 0.76, forkY - device.width * 0.055); context.lineTo(device.width * 0.76 + reach, forkY - device.width * 0.055); context.moveTo(device.width * 0.76, forkY + device.width * 0.055); context.lineTo(device.width * 0.76 + reach, forkY + device.width * 0.055); context.stroke()
    context.setLineDash([])
  } else if (device.category === 'conveyor') {
    const y0 = mapDepth * 0.18
    const y1 = mapDepth * 0.82
    context.strokeStyle = '#a9fff0'
    context.lineWidth = Math.max(2 / view2d.scale, mapDepth * 0.045)
    context.beginPath(); context.moveTo(device.width * 0.04, y0); context.lineTo(device.width * 0.96, y0); context.moveTo(device.width * 0.04, y1); context.lineTo(device.width * 0.96, y1); context.stroke()
    const rollerCount = Math.min(32, Math.max(4, Math.floor(device.width / Math.max(mapDepth * 0.45, 1))))
    context.lineWidth = 1 / view2d.scale
    for (let index = 0; index <= rollerCount; index++) {
      const x = device.width * (0.06 + 0.88 * index / rollerCount)
      context.beginPath(); context.moveTo(x, y0); context.lineTo(x, y1); context.stroke()
    }
    context.fillStyle = '#d5fff7'
    context.beginPath(); context.moveTo(device.width * 0.82, mapDepth * 0.38); context.lineTo(device.width * 0.92, mapDepth * 0.5); context.lineTo(device.width * 0.82, mapDepth * 0.62); context.closePath(); context.fill()
  } else if (device.category === 'rgv') {
    context.strokeStyle = '#e8d8ff'
    context.lineWidth = Math.max(2 / view2d.scale, mapDepth * 0.045)
    for (const y of [mapDepth * 0.2, mapDepth * 0.8]) { context.beginPath(); context.moveTo(0, y); context.lineTo(device.width, y); context.stroke() }
    context.lineWidth = 1 / view2d.scale
    const sleeperCount = Math.min(20, Math.max(4, Math.floor(device.width / Math.max(mapDepth * 0.7, 1))))
    for (let index = 0; index <= sleeperCount; index++) {
      const x = device.width * index / sleeperCount
      context.beginPath(); context.moveTo(x, mapDepth * 0.12); context.lineTo(x, mapDepth * 0.88); context.stroke()
    }
    context.fillStyle = '#c393ff'
    context.strokeStyle = '#f3eaff'
    context.lineWidth = 1.4 / view2d.scale
    context.fillRect(device.width * 0.3, mapDepth * 0.24, device.width * 0.4, mapDepth * 0.52)
    context.strokeRect(device.width * 0.3, mapDepth * 0.24, device.width * 0.4, mapDepth * 0.52)
  } else if (device.category === 'agv') {
    const wheelW = device.width * 0.13
    const wheelH = mapDepth * 0.23
    context.fillStyle = '#28303a'
    for (const x of [device.width * 0.08, device.width * 0.79]) for (const y of [mapDepth * 0.2, mapDepth * 0.57]) context.fillRect(x, y, wheelW, wheelH)
    context.fillStyle = '#d5d08b'
    context.strokeStyle = '#fbf5bb'
    context.lineWidth = 1.4 / view2d.scale
    context.beginPath()
    context.roundRect(device.width * 0.2, mapDepth * 0.1, device.width * 0.6, mapDepth * 0.8, Math.min(device.width, mapDepth) * 0.16)
    context.fill(); context.stroke()
    context.fillStyle = '#544f31'
    context.fillRect(device.width * 0.33, mapDepth * 0.28, device.width * 0.34, mapDepth * 0.36)
    context.fillStyle = '#fff4a6'
    context.beginPath(); context.moveTo(device.width * 0.5, mapDepth * 0.04); context.lineTo(device.width * 0.42, mapDepth * 0.18); context.lineTo(device.width * 0.58, mapDepth * 0.18); context.closePath(); context.fill()
  }
  context.restore()
}

function createDevice(category, x, y, overrides = {}) {
  const dimensions = {stacker: [1400, 12000, 12000], rack: [24000, 1100, 9000], conveyor: [6000, 1200, 900], rgv: [3000, 1600, 700], agv: [1400, 1000, 1200]}
  const [width, depth, height] = dimensions[category]
  return {id: `manual-${nextDeviceId++}`, category, name: `${names[category]}-${String(nextDeviceId - 1).padStart(3, '0')}`, x, y, width, depth, height, rotation: 0, forkMode: 'single', singleForkMax: 1200, doubleForkMax: 2400, standard: true, columns: 1, levels: 1, bayWidth: width, levelHeight: 1500, layoutDepth: depth, slots: [], ...overrides}
}

function placeDevice(category, point) {
  emptyNode.hidden = true
  const device = createDevice(category, point.x, point.y)
  if (category === 'rack') applyRackGrid(device, 1, 6, device.width, 1500)
  manualDevices.push(device)
  selected = {id: device.id, slotIndex: category === 'rack' ? 0 : -1}
  placementCategory = null
  document.querySelector('#edit-mode').textContent = '选择模式'
  validationState = null
  renderInspector()
  updateLayoutCounts()
  refreshScene()
  draw2d()
  statusNode.textContent = `已放置${names[category]}，可在右侧编辑尺寸、参数或储位。`
}

function applyRackGrid(device, columns, levels, width, levelHeight) {
  device.columns = columns
  device.levels = levels
  device.width = width
  device.levelHeight = levelHeight
  device.layoutDepth = levels * levelHeight
  device.bayWidth = width / columns
  device.height = levels * levelHeight
  device.slots = Array.from({length: columns * levels}, (_, index) => ({width: device.bayWidth, height: levelHeight, enabled: true, column: index % columns + 1, level: Math.floor(index / columns) + 1}))
}

function generateRack() {
  const columns = numberValue('#rack-columns')
  const levels = numberValue('#rack-levels')
  const width = numberValue('#rack-width')
  const bayWidth = numberValue('#rack-bay-width')
  const levelHeight = numberValue('#rack-level-height')
  const depth = numberValue('#rack-depth')
  if (![columns, levels, width, bayWidth, levelHeight, depth].every(value => Number.isFinite(value) && value > 0) || columns > 80 || levels > 30) {
    statusNode.textContent = '货架参数无效：列数最多 80 列、层数最多 30 层，所有尺寸必须大于 0。'
    return
  }
  if (Math.abs(columns * bayWidth - width) > 1) {
    statusNode.textContent = `货架宽度与列宽不匹配：${columns} 列 × ${bayWidth} mm = ${columns * bayWidth} mm。`
    return
  }
  const bounds = sceneBounds()
  const x = bounds.minX + (bounds.maxX - bounds.minX - width) / 2
  const y = bounds.minY + (bounds.maxY - bounds.minY - depth) / 2
  const rack = createDevice('rack', x, y, {width, depth, standard: true})
  applyRackGrid(rack, columns, levels, width, levelHeight)
  rack.depth = depth
  rack.name = `标准货架-${String(nextDeviceId - 1).padStart(3, '0')}`
  manualDevices.push(rack)
  selected = {id: rack.id, slotIndex: 0}
  emptyNode.hidden = true
  validationState = null
  renderInspector()
  updateLayoutCounts()
  refreshScene()
  draw2d()
  statusNode.textContent = `已生成 ${columns} 列 × ${levels} 层标准货架，共 ${columns * levels} 个储位。`
}

function numberValue(selector) {
  return Number(document.querySelector(selector).value)
}

function getSelectedDevice() {
  if (!selected) return null
  return manualDevices.find(device => device.id === selected.id) || null
}

function renderInspector() {
  const device = getSelectedDevice()
  if (!device) {
    inspector.innerHTML = '<div class="inspector-empty"><div>◫</div><b>未选择设备</b><span>在设备库添加设备，或在画布选择已有设备</span></div>'
    return
  }
  const slotIndex = selected.slotIndex
  const slot = device.category === 'rack' && slotIndex >= 0 ? device.slots[slotIndex] : null
  const baseFields = `<label class="field-full">设备名称<input data-field="name" value="${escapeAttribute(device.name)}"></label><label>X 坐标 mm<input data-field="x" type="number" value="${Math.round(device.x)}"></label><label>Y 坐标 mm<input data-field="y" type="number" value="${Math.round(device.y)}"></label><label>宽度 mm<input data-field="width" type="number" min="100" value="${Math.round(device.width)}"></label><label>深度 mm<input data-field="depth" type="number" min="100" value="${Math.round(device.depth)}"></label><label>旋转角度 °<select data-field="rotation"><option value="0" ${device.rotation === 0 ? 'selected' : ''}>0°</option><option value="90" ${device.rotation === 90 ? 'selected' : ''}>90°</option><option value="180" ${device.rotation === 180 ? 'selected' : ''}>180°</option><option value="270" ${device.rotation === 270 ? 'selected' : ''}>270°</option></select></label>`
  let specificFields = ''
  if (device.category === 'stacker') {
    specificFields = `<div class="inspector-subtitle">堆垛机与货叉</div><label>设备高度 mm<input data-field="height" type="number" min="100" value="${device.height}"></label><label>货叉形式<select data-field="forkMode"><option value="single" ${device.forkMode === 'single' ? 'selected' : ''}>单伸</option><option value="double" ${device.forkMode === 'double' ? 'selected' : ''}>双伸</option></select></label><label>单伸最大长度 mm<input data-field="singleForkMax" type="number" min="0" value="${device.singleForkMax}"></label><label>双伸最大长度 mm<input data-field="doubleForkMax" type="number" min="0" value="${device.doubleForkMax}"></label><p class="helper-text field-full">虚线表示当前货叉形式的最大伸出长度。</p>`
  } else if (device.category === 'rack') {
    specificFields = `<div class="inspector-subtitle">货架网格与储位</div><label>货架类型<select data-field="standard"><option value="true" ${device.standard ? 'selected' : ''}>标准货架</option><option value="false" ${!device.standard ? 'selected' : ''}>非标货架</option></select></label><label>列数<input data-field="columns" type="number" min="1" max="80" value="${device.columns}"></label><label>层数<input data-field="levels" type="number" min="1" max="30" value="${device.levels}"></label>${slot ? `<div class="slot-card field-full"><b>储位 C${slot.column} · L${slot.level}</b><label>储位宽度 mm<input data-slot-field="width" type="number" min="100" value="${Math.round(slot.width)}"></label><label>储位高度 mm<input data-slot-field="height" type="number" min="100" value="${Math.round(slot.height)}"></label><label class="slot-enabled"><input data-slot-field="enabled" type="checkbox" ${slot.enabled ? 'checked' : ''}>储位启用</label><small>储位尺寸可单独覆盖标准值；网格调整会重建储位。</small></div>` : '<p class="helper-text field-full">点击货架网格中的一个格位，即可编辑该储位。</p>'}<button id="apply-rack-grid" class="secondary-action field-full">按列数与层数重建网格</button>`
  } else {
    specificFields = `<div class="inspector-subtitle">设备参数</div><label>设备高度 mm<input data-field="height" type="number" min="100" value="${device.height}"></label>`
  }
  inspector.innerHTML = `<div class="inspector-heading"><div><small>属性编辑</small><h2>${names[device.category]}</h2></div><button id="delete-device" class="delete-action">删除</button></div><div class="inspector-form">${baseFields}${specificFields}</div><div class="inspector-footnote">当前尺寸单位为 mm。布局仅保存在本次测试页面会话中。</div>`
  inspector.querySelectorAll('[data-field]').forEach(field => field.addEventListener('change', () => updateDeviceField(device, field)))
  inspector.querySelectorAll('[data-slot-field]').forEach(field => field.addEventListener('change', () => updateSlotField(device, slotIndex, field)))
  inspector.querySelector('#delete-device').addEventListener('click', removeSelected)
  inspector.querySelector('#apply-rack-grid')?.addEventListener('click', () => rebuildSelectedRack(device))
}

function updateDeviceField(device, field) {
  const key = field.dataset.field
  let value = field.value
  if (field.type === 'number') value = Number(value)
  if (key === 'standard') value = value === 'true'
  if (['x', 'y', 'width', 'depth', 'height', 'singleForkMax', 'doubleForkMax', 'columns', 'levels'].includes(key) && (!Number.isFinite(value) || value < 0)) {
    statusNode.textContent = '数值无效；请使用大于等于 0 的数值。'
    renderInspector()
    return
  }
  if (['width', 'depth', 'height'].includes(key) && value < 100) {
    statusNode.textContent = '宽度、深度和高度至少为 100 mm。'
    renderInspector()
    return
  }
  if (key === 'columns' && (value < 1 || value > 80) || key === 'levels' && (value < 1 || value > 30)) {
    statusNode.textContent = '货架列数范围为 1–80，层数范围为 1–30。'
    renderInspector()
    return
  }
  device[key] = value
  if (key === 'columns' || key === 'levels') {
    renderInspector()
    statusNode.textContent = '网格参数已修改；点击“按列数与层数重建网格”应用。'
  } else {
    validationState = null
    draw2d()
    refreshScene()
  }
}

function updateSlotField(device, slotIndex, field) {
  const value = field.type === 'checkbox' ? field.checked : Number(field.value)
  if (field.type === 'number' && (!Number.isFinite(value) || value < 100)) {
    statusNode.textContent = '储位宽度和高度至少为 100 mm。'
    renderInspector()
    return
  }
  device.slots[slotIndex][field.dataset.slotField] = value
  validationState = null
  draw2d()
  refreshScene()
}

function rebuildSelectedRack(device) {
  const columns = Number(inspector.querySelector('[data-field="columns"]').value)
  const levels = Number(inspector.querySelector('[data-field="levels"]').value)
  if (!Number.isInteger(columns) || !Number.isInteger(levels) || columns < 1 || columns > 80 || levels < 1 || levels > 30) {
    statusNode.textContent = '列数需为 1–80 的整数，层数需为 1–30 的整数。'
    return
  }
  const width = device.width
  const levelHeight = device.levelHeight || 1500
  applyRackGrid(device, columns, levels, width, levelHeight)
  selected.slotIndex = 0
  renderInspector()
  draw2d()
  refreshScene()
  statusNode.textContent = `货架网格已重建：${columns} 列 × ${levels} 层。`
}

function escapeAttribute(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function removeSelected() {
  if (!selected) return
  manualDevices = manualDevices.filter(device => device.id !== selected.id)
  selected = null
  validationState = null
  renderInspector()
  updateLayoutCounts()
  refreshScene()
  draw2d()
  statusNode.textContent = '已删除选中设备。'
}

function validateLayout() {
  const issues = []
  for (let firstIndex = 0; firstIndex < manualDevices.length; firstIndex++) {
    const first = manualDevices[firstIndex]
    if (![first.x, first.y, first.width, first.depth, first.height].every(Number.isFinite) || first.width <= 0 || first.depth <= 0 || first.height <= 0) {
      issues.push(`${first.name}：位置或尺寸无效。`)
    }
    if (first.category === 'rack') {
      if (first.columns * first.levels !== first.slots.length) issues.push(`${first.name}：储位数量与列数/层数不一致。`)
      first.slots.forEach(slot => { if (slot.width < 100 || slot.height < 100) issues.push(`${first.name} C${slot.column}-L${slot.level}：储位尺寸过小。`) })
    }
    for (let secondIndex = firstIndex + 1; secondIndex < manualDevices.length; secondIndex++) {
      const second = manualDevices[secondIndex]
      if (rectanglesOverlap(first, second)) issues.push(`${first.name} 与 ${second.name} 存在平面重叠。`)
    }
    if (first.category === 'stacker') {
      const nearbyRacks = manualDevices.filter(other => other.category === 'rack' && aisleDistance(first, other) <= Math.max(first.singleForkMax, first.doubleForkMax))
      const distinctRows = new Set(nearbyRacks.map(rack => Math.round(rack.y / 1000)))
      if (distinctRows.size > 2) issues.push(`${first.name} 的货叉覆盖到 ${distinctRows.size} 排货架；当前规则建议一台堆垛机最多服务两排。`)
      if (nearbyRacks.length === 0) issues.push(`${first.name}：未找到货叉最大伸出范围内的货架，请检查巷道位置与伸叉长度。`)
    }
  }
  validationState = issues
  document.querySelector('#validation-summary').textContent = issues.length ? `校验发现 ${issues.length} 项需检查` : `校验通过 · ${manualDevices.length} 个手动设备`
  statusNode.textContent = issues.length ? `布局校验发现 ${issues.length} 项：${issues.slice(0, 2).join('；')}` : `布局校验通过：${manualDevices.length} 个设备的尺寸、重叠和堆垛机服务范围均通过基础检查。`
  draw2d()
}

function rectanglesOverlap(first, second) {
  return first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + layoutDepth(second) && first.y + layoutDepth(first) > second.y
}

function aisleDistance(stacker, rack) {
  const dx = Math.max(rack.x - (stacker.x + stacker.width), stacker.x - (rack.x + rack.width), 0)
  const dy = Math.max(rack.y - (stacker.y + layoutDepth(stacker)), stacker.y - (rack.y + layoutDepth(rack)), 0)
  return Math.hypot(dx, dy)
}

function canvasHit(point) {
  for (let deviceIndex = manualDevices.length - 1; deviceIndex >= 0; deviceIndex--) {
    const device = manualDevices[deviceIndex]
    const localX = point.x - device.x
    const localY = point.y - device.y
    if (localX < 0 || localX > device.width || localY < 0 || localY > layoutDepth(device)) continue
    let slotIndex = -1
    if (device.category === 'rack') {
      const column = Math.min(device.columns - 1, Math.floor(localX / (device.width / device.columns)))
      const level = Math.min(device.levels - 1, Math.floor(localY / (layoutDepth(device) / device.levels)))
      slotIndex = level * device.columns + column
    }
    return {device, slotIndex}
  }
  return null
}

canvas.addEventListener('contextmenu', event => {
  const hit = canvasHit(screenToWorld(event.clientX, event.clientY))
  if (!hit) return
  event.preventDefault()
  selected = {id: hit.device.id, slotIndex: hit.slotIndex}
  renderInspector()
  draw2d()
  statusNode.textContent = `已打开${names[hit.device.category]}属性；${hit.slotIndex >= 0 ? '当前选中储位，可调整单格尺寸。' : '可修改设备尺寸和设备参数。'}`
})

canvas.addEventListener('pointerdown', event => {
  if (currentView !== '2d') return
  if (event.button === 1 || spaceDown) {
    pointerAction = {type: 'pan', id: event.pointerId, x: event.clientX, y: event.clientY, originX: view2d.x, originY: view2d.y}
    canvas.setPointerCapture(event.pointerId)
    return
  }
  if (event.button !== 0) return
  const point = screenToWorld(event.clientX, event.clientY)
  if (placementCategory) {
    placeDevice(placementCategory, point)
    return
  }
  const hit = canvasHit(point)
  if (hit) {
    selected = {id: hit.device.id, slotIndex: hit.slotIndex}
    renderInspector()
    pointerAction = {type: 'move', id: event.pointerId, device: hit.device, startX: point.x, startY: point.y, originX: hit.device.x, originY: hit.device.y}
    canvas.setPointerCapture(event.pointerId)
    draw2d()
  } else {
    selected = null
    renderInspector()
    draw2d()
    pointerAction = {type: 'pan', id: event.pointerId, x: event.clientX, y: event.clientY, originX: view2d.x, originY: view2d.y}
    canvas.setPointerCapture(event.pointerId)
  }
})

canvas.addEventListener('pointermove', event => {
  if (!pointerAction || pointerAction.id !== event.pointerId) return
  if (pointerAction.type === 'pan') {
    view2d.x = pointerAction.originX + event.clientX - pointerAction.x
    view2d.y = pointerAction.originY + event.clientY - pointerAction.y
  } else {
    const point = screenToWorld(event.clientX, event.clientY)
    pointerAction.device.x = pointerAction.originX + point.x - pointerAction.startX
    pointerAction.device.y = pointerAction.originY + point.y - pointerAction.startY
  }
  draw2d()
})
canvas.addEventListener('pointerup', () => {
  if (pointerAction?.type === 'move') {
    validationState = null
    refreshScene()
    renderInspector()
  }
  pointerAction = null
})
canvas.addEventListener('wheel', event => {
  event.preventDefault()
  const rect = canvas.getBoundingClientRect()
  const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15
  const next = Math.min(2, Math.max(0.0002, view2d.scale * factor))
  view2d.x = event.clientX - rect.left - (event.clientX - rect.left - view2d.x) * next / view2d.scale
  view2d.y = event.clientY - rect.top - (event.clientY - rect.top - view2d.y) * next / view2d.scale
  view2d.scale = next
  draw2d()
}, {passive: false})

function refreshScene() {
  const bounds = sceneBounds()
  const sceneResult = {bounds, devices: [...(result?.devices || []), ...manualDevices]}
  buildScene(sceneResult)
}

function buildScene(sceneResult) {
  if (renderer) {
    renderer.dispose()
    sceneHost.replaceChildren()
  }
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#0a1723')
  scene.fog = new THREE.Fog('#0a1723', 180, 650)
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000)
  renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  sceneHost.appendChild(renderer.domElement)
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  scene.add(new THREE.HemisphereLight(0xd8f3ff, 0x21374b, 2.2))
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.1)
  keyLight.position.set(-100, 150, -120)
  scene.add(keyLight)
  addGround(sceneResult.bounds)
  for (const device of sceneResult.devices) addDevice(device)
  const centerX = ((sceneResult.bounds.minX + sceneResult.bounds.maxX) / 2) * 0.001
  const centerZ = -((sceneResult.bounds.minY + sceneResult.bounds.maxY) / 2) * 0.001
  camera.position.set(centerX + 35, 45, centerZ + 60)
  controls.target.set(centerX, 0, centerZ)
  controls.update()
  renderer.setSize(sceneHost.clientWidth || 1, sceneHost.clientHeight || 1)
  if (currentView === '3d' && !renderFrame) animate()
}

function addGround(bounds) {
  const width = Math.max((bounds.maxX - bounds.minX) * 0.001, 10)
  const depth = Math.max((bounds.maxY - bounds.minY) * 0.001, 10)
  const x = ((bounds.minX + bounds.maxX) / 2) * 0.001
  const z = -((bounds.minY + bounds.maxY) / 2) * 0.001
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({color: '#142737', roughness: 0.9}))
  ground.rotation.x = -Math.PI / 2
  ground.position.set(x, -0.04, z)
  scene.add(ground)
  const grid = new THREE.GridHelper(Math.ceil(Math.max(width, depth) / 5) * 5, Math.min(180, Math.ceil(Math.max(width, depth) / 5)), '#406476', '#203c4c')
  grid.position.set(x, -0.02, z)
  scene.add(grid)
}

function addDevice(device) {
  const width = Math.max((device.width || device.bounds.maxX - device.bounds.minX) * 0.001, device.category === 'rack' ? 2 : 0.7)
  const depth = Math.max((device.depth || device.bounds.maxY - device.bounds.minY) * 0.001, device.category === 'rack' ? 0.65 : 0.7)
  const heights = {stacker: 8, rack: 8, conveyor: 0.9, rgv: 0.7, agv: 1.2}
  const height = device.height ? device.height * 0.001 : heights[device.category] || 1
  const x = device.x !== undefined ? (device.x + device.width / 2) * 0.001 : ((device.bounds.minX + device.bounds.maxX) / 2) * 0.001
  const z = device.y !== undefined ? -(device.y + device.depth / 2) * 0.001 : -((device.bounds.minY + device.bounds.maxY) / 2) * 0.001
  const material = new THREE.MeshStandardMaterial({color: palette[device.category] || '#9aabb4', roughness: 0.55, metalness: 0.24})
  if (device.category === 'rack' && device.slots?.length) {
    const rackGroup = new THREE.Group()
    const uprightMaterial = new THREE.MeshStandardMaterial({color: '#a3c4d1', metalness: 0.35, roughness: 0.5})
    const beamMaterial = new THREE.MeshStandardMaterial({color: palette.rack, metalness: 0.25, roughness: 0.55})
    const postWidth = Math.max(0.06, width * 0.009)
    for (let column = 0; column <= device.columns; column++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(postWidth, height, depth), uprightMaterial)
      post.position.set(-width / 2 + width * column / device.columns, height / 2, 0)
      rackGroup.add(post)
    }
    for (let level = 0; level <= device.levels; level++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(width, Math.max(0.05, height * 0.012), depth), beamMaterial)
      beam.position.set(0, height * level / device.levels, 0)
      rackGroup.add(beam)
    }
    rackGroup.position.set(x, 0, z)
    rackGroup.rotation.y = -(device.rotation || 0) * Math.PI / 180
    rackGroup.traverse(child => { child.castShadow = true; child.receiveShadow = true })
    scene.add(rackGroup)
    return
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  body.position.set(x, height / 2, z)
  body.rotation.y = -(device.rotation || 0) * Math.PI / 180
  body.castShadow = true
  body.receiveShadow = true
  body.userData.deviceName = device.name
  scene.add(body)
  if (device.category === 'stacker') {
    const mast = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.12, width * 0.08), height * 0.92, Math.max(0.12, depth * 0.12)), new THREE.MeshStandardMaterial({color: '#fff0d1'}))
    mast.position.set(x, height * 0.5, z)
    mast.rotation.y = -(device.rotation || 0) * Math.PI / 180
    scene.add(mast)
  }
}

let fpsFrames = 0
let fpsStarted = performance.now()
function animate(now = performance.now()) {
  renderFrame = requestAnimationFrame(animate)
  if (currentView === '3d' && renderer && scene) {
    controls?.update()
    renderer.render(scene, camera)
  } else {
    return
  }
  fpsFrames++
  const elapsed = now - fpsStarted
  if (elapsed >= 500) {
    fpsNode.textContent = `FPS ${Math.round(fpsFrames * 1000 / elapsed)}`
    fpsFrames = 0
    fpsStarted = now
  }
}

resizeObserver = new ResizeObserver(() => {
  resize2d()
  if (renderer && sceneHost.clientWidth && sceneHost.clientHeight) {
    camera.aspect = sceneHost.clientWidth / sceneHost.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(sceneHost.clientWidth, sceneHost.clientHeight)
  }
})
resizeObserver.observe(document.querySelector('.dxf-view'))
updateLayoutCounts()
renderInspector()
setView(currentView)
fit2d()
window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(renderFrame)
  resizeObserver?.disconnect()
  worker.terminate()
  renderer?.dispose()
})
