import assert from 'node:assert/strict'
import {test} from 'node:test'
import {sampleMotion, CYCLE_SECONDS} from '../src/motion.js'

for (const mode of ['single', 'double']) for (const direction of [-1, 1]) {
    test(`${mode}, direction ${direction}: layer travel and interlocks`, () => {
        for (let t = 0; t < CYCLE_SECONDS; t += .1) {
            const s = sampleMotion(t, mode, direction), next = sampleMotion(t + .01, mode, direction)
            if (mode === 'single') assert.equal(s.lower, 0)
            else assert.ok(Math.abs(s.upper - 2 * s.lower) < 1e-9)
            assert.ok(s.upper * direction >= 0)
            if ([1, 3, 5, 7].includes(s.phase) && next.phase === s.phase) {
                assert.equal(s.x, next.x);
                assert.equal(s.y, next.y)
            }
            if ([0, 4].includes(s.phase)) assert.ok(s.upper === 0)
        }
        assert.equal(sampleMotion(10, mode, direction).upper, direction * (mode === 'double' ? 5 : 2.5))
        assert.ok(sampleMotion(CYCLE_SECONDS, mode, direction).upper === 0)
    })
}
test('position and fork travel remain continuous across phases', () => {
    for (const t of [6, 10, 12, 16, 22, 26, 28, 32]) {
        const a = sampleMotion(t - .0001), b = sampleMotion(t)
        for (const k of ['x', 'y', 'upper', 'lower']) assert.ok(Math.abs(a[k] - b[k]) < .001, `${t}: ${k}`)
    }
})
import {normalizeConfig, occupancy, transferPoints, warehouseLayout} from '../src/config.js'

test('all scene sizes hand off at conveyor height, then send pallet out', () => {
    for (const cranes of [1, 4]) for (const columns of [4, 16]) for (const levels of [2, 6]) {
        const config = normalizeConfig({cranes, columns, levels}), count = occupancy(config)
        assert.equal(count.total, 4 * cranes * columns * levels)
        assert.ok(count.used <= count.total)
        for (let i = 0; i < cranes; i++) for (const mode of ['single', 'double']) for (const direction of [-1, 1]) {
            const route = transferPoints(config, i)
            assert.ok(route.drop.x > (columns - 1) * 2)
            const released = sampleMotion(28, mode, direction, i, route),
                out = sampleMotion(30, mode, direction, i, route)
            assert.equal(released.cargo.y, 2.64)
            assert.equal(released.cargo.z, direction * (mode === 'single' ? 2.5 : 5))
            assert.equal(released.cargo.x, route.drop.x)
            assert.ok(out.cargo.x > released.cargo.x)
            assert.equal(out.x, route.drop.x)
            assert.equal(out.cargo.y, released.cargo.y)
        }
    }
})

test('single-depth and double-depth row numbering, spacing and fork alignment', () => {
    for (const cranes of [1, 2, 4]) for (const rackMode of ['single', 'double']) {
        const config = normalizeConfig({cranes, rackMode}), layout = warehouseLayout(config)
        const perAisle = rackMode === 'double' ? 4 : 2
        assert.equal(layout.rows.length, cranes * perAisle)
        assert.equal(occupancy(config).total, cranes * perAisle * config.columns * config.levels)
        assert.deepEqual(layout.rows.map(r => r.number), Array.from({length: cranes * perAisle}, (_, i) => i + 1))
        for (const aisle of layout.aisles) {
            const rows = layout.rows.filter(r => r.aisle === aisle.index)
            assert.equal(rows.filter(r => r.side === '左').length, perAisle / 2)
            assert.equal(rows.filter(r => r.side === '右').length, perAisle / 2)
            for (const direction of [-1, 1]) {
                const fork = sampleMotion(10, rackMode, direction)
                assert.ok(rows.some(r => r.z === aisle.z + fork.upper), 'extended fork must reach its rack row')
            }
        }
        const sorted = layout.rows.map(r => r.z).sort((a, b) => a - b)
        for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] - sorted[i - 1] >= 2.5, 'rack rows cannot overlap')
    }
    const one = warehouseLayout(normalizeConfig({cranes: 1, rackMode: 'double'}))
    assert.deepEqual(one.rows.map(r => [r.number, r.offset]), [[1, -5], [2, -2.5], [3, 2.5], [4, 5]])
})
