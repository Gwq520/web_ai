const categories = [
  ['stacker', /堆垛机|巷道机|stacker/i],
  ['rack', /货架|货位|缓存架|料架|rack/i],
  ['conveyor', /输送|辊筒|皮带|链条|conveyor/i],
  ['rgv', /\bRGV\b|地轨|轨道车|搬运小车/i],
  ['agv', /\bAGV\b|无人叉车|举升AGV/i]
]
const supported = new Set(['LINE', 'LWPOLYLINE', 'POLYLINE', 'CIRCLE', 'ARC'])
let startedAt = 0
let fileName = ''
let fileSize = 0
let section = ''
let block = null
let entity = null
let currentPolyline = null
let totalRead = 0
let pairCode = null
let entities = []
let devices = []
let blocks = new Map()
let blockInserts = []
let layerBounds = new Map()

self.addEventListener('message', async event => {
  const {file, name, size} = event.data
  resetParser()
  startedAt = performance.now()
  fileName = name
  fileSize = size
  try {
    await parseFile(file)
    finalize()
    const bounds = calculateBounds()
    if (!entities.length && !devices.length) throw new Error('文件已读取，但没有在支持的 DXF 图层或块名中找到可显示的仓储设备图元。')
    self.postMessage({type: 'done', data: {fileName, fileSize, elapsedSeconds: (performance.now() - startedAt) / 1000, entities, devices, bounds}})
  } catch (error) {
    self.postMessage({type: 'error', message: error?.message || 'DXF 解析失败。'})
  }
})

async function parseFile(file) {
  const reader = file.stream().getReader()
  const decoder = new TextDecoder('utf-8')
  let pending = ''
  let valueLine = false
  while (true) {
    const {done, value} = await reader.read()
    if (done) break
    totalRead += value.byteLength
    pending += decoder.decode(value, {stream: true})
    let newline = pending.indexOf('\n')
    while (newline !== -1) {
      const line = pending.slice(0, newline).replace(/\r$/, '').trim()
      pending = pending.slice(newline + 1)
      if (!valueLine) {
        pairCode = Number.parseInt(line, 10)
        valueLine = true
      } else {
        consumePair(pairCode, line)
        valueLine = false
      }
      newline = pending.indexOf('\n')
    }
    if (totalRead % (8 * 1024 * 1024) < value.byteLength) {
      self.postMessage({type: 'progress', read: totalRead, size: fileSize})
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
  pending += decoder.decode()
  for (const line of pending.split(/\r?\n/)) {
    if (!valueLine) { pairCode = Number.parseInt(line.trim(), 10); valueLine = true }
    else { consumePair(pairCode, line.trim()); valueLine = false }
  }
}

function resetParser() {
  section = ''
  block = null
  entity = null
  currentPolyline = null
  totalRead = 0
  pairCode = null
  entities = []
  devices = []
  blocks = new Map()
  blockInserts = []
  layerBounds = new Map()
}

function consumePair(code, value) {
  if (code === 0 && value === 'SECTION') { section = 'PENDING'; return }
  if (section === 'PENDING') {
    if (code === 2) section = value
    return
  }
  if (code === 0 && value === 'ENDSEC') { commitEntity(); section = ''; block = null; return }
  if (section === 'BLOCKS') {
    if (code === 0 && value === 'BLOCK') { commitEntity(); block = {name: '', baseX: 0, baseY: 0, shapes: [], inserts: [], bounds: emptyBounds(), resolved: false}; entity = null; return }
    if (code === 0 && value === 'ENDBLK') { commitEntity(); if (block?.name) blocks.set(block.name, block); block = null; entity = null; return }
    if (block && !entity) {
      if (code === 2) block.name = value
      if (code === 10) block.baseX = number(value)
      if (code === 20) block.baseY = number(value)
    }
  }
  if (code === 0) {
    commitEntity()
    if (value === 'VERTEX' && currentPolyline) { entity = createEntity('VERTEX'); return }
    if (!supported.has(value) && value !== 'INSERT' && value !== 'SEQEND') { entity = null; return }
    if (value === 'SEQEND') {
      if (currentPolyline) {
        const polylineShape = toShape(currentPolyline)
        storeBlockShapeOrEntity(polylineShape, currentPolyline.layer)
      }
      currentPolyline = null
      entity = null
      return
    }
    entity = createEntity(value)
    if (value === 'POLYLINE') currentPolyline = entity
    return
  }
  if (entity) assignEntity(code, value)
}

function createEntity(type) {
  if (type === 'LINE') return {type, layer: '0', x: null, y: null, x2: null, y2: null}
  if (type === 'LWPOLYLINE' || type === 'POLYLINE') return {type, layer: '0', points: [], closed: false, current: null}
  if (type === 'VERTEX') return {type, layer: '0', current: null}
  if (type === 'CIRCLE' || type === 'ARC') return {type, layer: '0', x: 0, y: 0, radius: 0}
  return {type, layer: '0', blockName: '', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0}
}

function assignEntity(code, value) {
  if (code === 8) entity.layer = value
  if (entity.type === 'LINE') {
    if (code === 10) entity.x = number(value)
    if (code === 20) entity.y = number(value)
    if (code === 11) entity.x2 = number(value)
    if (code === 21) entity.y2 = number(value)
  } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE' || entity.type === 'VERTEX') {
    if (code === 70) entity.closed = (Number.parseInt(value, 10) & 1) === 1
    if (code === 10) {
      entity.current = [number(value), 0]
      if (entity.type !== 'VERTEX') entity.points.push(entity.current)
    }
    if (code === 20 && entity.current) entity.current[1] = number(value)
  } else if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
    if (code === 10) entity.x = number(value)
    if (code === 20) entity.y = number(value)
    if (code === 40) entity.radius = Math.abs(number(value))
  } else {
    if (code === 2) entity.blockName = value
    if (code === 10) entity.x = number(value)
    if (code === 20) entity.y = number(value)
    if (code === 41) entity.scaleX = number(value)
    if (code === 42) entity.scaleY = number(value)
    if (code === 50) entity.rotation = number(value) * Math.PI / 180
  }
}

function commitEntity() {
  if (!entity) return
  if (entity.type === 'VERTEX' && currentPolyline) {
    if (entity.current) currentPolyline.points.push(entity.current)
    entity = null
    return
  }
  if (entity.type === 'POLYLINE' && currentPolyline === entity) {
    entity = null
    return
  }
  if (section === 'BLOCKS' && block) {
    if (entity.type === 'INSERT') block.inserts.push(entity)
    else {
      const shape = toShape(entity)
      storeBlockShapeOrEntity(shape, entity.layer)
    }
  } else if (section === 'ENTITIES') {
    if (entity.type === 'INSERT') {
      blockInserts.push(entity)
    } else {
      const category = getLayerCategory(entity.layer)
      const shape = toShape(entity)
    if (category && shape) {
      entities.push({...shape, category})
      includeLayerBounds(entity.layer, shape)
    }
    }
  }
  entity = null
}

function storeBlockShapeOrEntity(shape, layer) {
  if (!shape) return
  if (section === 'BLOCKS' && block) {
    expandBounds(block.bounds, shape.points || [shape.center], shape.radius || 0)
    if (getCategory(block.name)) block.shapes.push(shape)
  } else if (section === 'ENTITIES') {
    const category = getLayerCategory(layer)
    if (category) {
      entities.push({...shape, category})
      includeLayerBounds(layer, shape)
    }
  }
}

function toShape(source) {
  if (source.type === 'LINE' && source.x !== null && source.x2 !== null) return {kind: 'line', layer: source.layer, points: [[source.x, source.y], [source.x2, source.y2]]}
  if ((source.type === 'LWPOLYLINE' || source.type === 'POLYLINE') && source.points.length > 1) return {kind: 'polyline', layer: source.layer, points: source.points, closed: source.closed}
  if ((source.type === 'CIRCLE' || source.type === 'ARC') && source.radius > 0 && source.radius < 50000) return {kind: 'circle', layer: source.layer, center: [source.x, source.y], radius: source.radius}
  return null
}

function finalize() {
  for (const definition of blocks.values()) resolveBlock(definition, new Set(), 0)
  const visibleInsertLimit = 20000
  for (const insert of blockInserts) {
    if (devices.length >= visibleInsertLimit) break
    const definition = blocks.get(insert.blockName)
    const excludedView = /主视图|正视图|侧视图|立面|剖面|剖视/.test(String(insert.blockName || ''))
    let category = ''
    if (!excludedView) category = getBlockCategory(insert.blockName) || getLayerCategory(insert.layer)
    if (!category) continue
    if (!definition || !validBounds(definition.bounds)) {
      if (category === 'rgv') {
        const halfSize = 1500
        const bounds = {minX: insert.x - halfSize, minY: insert.y - halfSize, maxX: insert.x + halfSize, maxY: insert.y + halfSize}
        devices.push({name: insert.blockName || insert.layer, layer: insert.layer, category, bounds})
      }
      continue
    }
    const deviceBounds = transformBounds(definition.bounds, definition, insert)
    const label = insert.blockName || insert.layer
    const device = {name: label, layer: insert.layer, category, bounds: deviceBounds}
    devices.push(device)
    if (definition.shapes.length && category !== 'unclassified') {
      for (const shape of definition.shapes) {
        const transformed = transformShape(shape, definition, insert)
        entities.push({...transformed, category})
      }
    } else {
      entities.push({kind: 'polyline', category, points: [[deviceBounds.minX, deviceBounds.minY], [deviceBounds.maxX, deviceBounds.minY], [deviceBounds.maxX, deviceBounds.maxY], [deviceBounds.minX, deviceBounds.maxY]], closed: true})
    }
  }
  entities = entities.filter(item => item.points ? item.points.every(point => point.every(Number.isFinite)) : item.center.every(Number.isFinite))
}

function resolveBlock(definition, ancestors, depth) {
  if (definition.resolved || depth > 16 || ancestors.has(definition.name)) return
  const nextAncestors = new Set(ancestors)
  nextAncestors.add(definition.name)
  for (const insert of definition.inserts) {
    const child = blocks.get(insert.blockName)
    if (!child) continue
    resolveBlock(child, nextAncestors, depth + 1)
    if (!validBounds(child.bounds)) continue
    const corners = [[child.bounds.minX, child.bounds.minY], [child.bounds.minX, child.bounds.maxY], [child.bounds.maxX, child.bounds.minY], [child.bounds.maxX, child.bounds.maxY]]
    const transformedBounds = emptyBounds()
    expandBounds(transformedBounds, corners.map(point => transformPoint(point[0], point[1], child, insert)))
    expandBounds(definition.bounds, [[transformedBounds.minX, transformedBounds.minY], [transformedBounds.maxX, transformedBounds.maxY]])
    if (!getCategory(definition.name)) continue
    const childShapes = child.shapes.length ? child.shapes : [{kind: 'polyline', points: corners, closed: true}]
    for (const shape of childShapes) definition.shapes.push(transformShape(shape, child, insert))
  }
  definition.resolved = true
}

function includeLayerBounds(layer, shape) {
  let bounds = layerBounds.get(layer)
  if (!bounds) {
    bounds = emptyBounds()
    layerBounds.set(layer, bounds)
  }
  expandBounds(bounds, shape.points || [shape.center], shape.radius || 0)
}

function transformShape(shape, definition, insert) {
  const points = shape.points?.map(point => transformPoint(point[0], point[1], definition, insert))
  if (shape.kind === 'circle') {
    const center = transformPoint(shape.center[0], shape.center[1], definition, insert)
    return {...shape, center, radius: shape.radius * Math.max(Math.abs(insert.scaleX), Math.abs(insert.scaleY))}
  }
  return {...shape, points}
}

function transformBounds(bounds, definition, insert) {
  const corners = [[bounds.minX, bounds.minY], [bounds.minX, bounds.maxY], [bounds.maxX, bounds.minY], [bounds.maxX, bounds.maxY]]
  const points = corners.map(point => transformPoint(point[0], point[1], definition, insert))
  const output = emptyBounds()
  expandBounds(output, points)
  return output
}

function transformPoint(x, y, definition, insert) {
  const dx = (x - definition.baseX) * insert.scaleX
  const dy = (y - definition.baseY) * insert.scaleY
  const cosine = Math.cos(insert.rotation)
  const sine = Math.sin(insert.rotation)
  return [insert.x + dx * cosine - dy * sine, insert.y + dx * sine + dy * cosine]
}

function calculateBounds() {
  const bounds = emptyBounds()
  for (const entity of entities) {
    if (entity.points) expandBounds(bounds, entity.points, entity.radius || 0)
    else expandBounds(bounds, [entity.center], entity.radius || 0)
  }
  for (const device of devices) expandBounds(bounds, [[device.bounds.minX, device.bounds.minY], [device.bounds.maxX, device.bounds.maxY]])
  if (!validBounds(bounds)) return {minX: -500, minY: -500, maxX: 500, maxY: 500}
  return bounds
}

function getCategory(value) {
  const name = String(value || '')
  for (const [category, pattern] of categories) if (pattern.test(name)) return category
  return ''
}

function getBlockCategory(value) {
  const name = String(value || '')
  if (/主视图|正视图|侧视图|立面|剖面|剖视/.test(name)) return ''
  return getCategory(name)
}

function getLayerCategory(value) {
  const name = String(value || '')
  if (/布局|方案|底图|提资/.test(name)) return ''
  return getCategory(name)
}

function emptyBounds() { return {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity} }
function validBounds(bounds) { return Number.isFinite(bounds.minX) && Number.isFinite(bounds.minY) && Number.isFinite(bounds.maxX) && Number.isFinite(bounds.maxY) }
function expandBounds(bounds, points, padding = 0) {
  for (const [x, y] of points) {
    bounds.minX = Math.min(bounds.minX, x - padding)
    bounds.minY = Math.min(bounds.minY, y - padding)
    bounds.maxX = Math.max(bounds.maxX, x + padding)
    bounds.maxY = Math.max(bounds.maxY, y + padding)
  }
}
function number(value) { const parsed = Number.parseFloat(value); return Number.isFinite(parsed) ? parsed : 0 }
