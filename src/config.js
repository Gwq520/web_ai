export const DEFAULT_CONFIG = {cranes: 3, columns: 11, levels: 5, rackMode: 'double'}

export function normalizeConfig(value = {}) {
    const clamp = (v, min, max, fallback) => Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Math.round(Number(v)))) : fallback
    return {
        cranes: clamp(value.cranes, 1, 4, 3),
        columns: clamp(value.columns, 4, 16, 11),
        levels: clamp(value.levels, 2, 6, 5),
        rackMode: value.rackMode === 'single' ? 'single' : 'double'
    }
}

export function warehouseLayout(config) {
    const double = config.rackMode !== 'single', pitch = double ? 14 : 9
    const aisles = Array.from({length: config.cranes}, (_, index) => ({
        index,
        z: (index - (config.cranes - 1) / 2) * pitch
    }))
    const offsets = double ? [-5, -2.5, 2.5, 5] : [-2.5, 2.5]
    const rows = aisles.flatMap(aisle => offsets.map((offset, j) => ({
        number: aisle.index * offsets.length + j + 1,
        aisle: aisle.index,
        z: aisle.z + offset,
        offset,
        side: offset < 0 ? '左' : '右',
        depth: Math.abs(offset) === 5 ? '远位' : '近位'
    })))
    return {aisles, rows, halfDepth: Math.max(...rows.map(r => Math.abs(r.z))) + 1.25}
}

export function occupancy(config) {
    let used = 0
    const rows = warehouseLayout(config).rows
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < config.columns; c++) for (let l = 0; l < config.levels; l++) if ((c + l + r) % 7 !== 0 && !(r === 0 && l === 0 && (c === 1 || c === 2))) used++
    return {used, total: rows.length * config.columns * config.levels}
}

export function transferPoints(config, index = 0) {
    return {
        pickup: {x: (Math.min(3 + index, config.columns - 1) - (config.columns - 1) / 2) * 4, y: 3.48},
        drop: {x: (config.columns - 1) * 2 + 6, y: 2}
    }
}
