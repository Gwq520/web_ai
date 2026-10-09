// Kinematic demonstration: upper travel is relative to the lower sliding layer.
export const STAGES = ['定位取货', '伸叉取货', '顶升托盘', '收叉取货', '定位输送线', '伸叉到输送线', '落放至输送线', '收叉 / 输送出库']
const durations = [6, 4, 2, 4, 6, 4, 2, 4]
export const CYCLE_SECONDS = durations.reduce((a, b) => a + b, 0)
const smooth = t => t * t * (3 - 2 * t)

export function sampleMotion(seconds, mode = 'double', direction = 1, index = 0, route = null) {
    const t = ((seconds % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS
    let phase = 0, start = 0
    while (phase < 7 && t >= start + durations[phase]) start += durations[phase++]
    const progress = (t - start) / durations[phase], p = smooth(progress)
    const pickup = route?.pickup ?? {x: -8 + index * 4, y: 4}, drop = route?.drop ?? {x: 26, y: 2}
    const reach = mode === 'double' ? 5 : 2.5
    let x = pickup.x, y = pickup.y, extension = 0
    if (phase === 0) {
        x = drop.x + (pickup.x - drop.x) * p;
        y = drop.y + (pickup.y - drop.y) * p
    }
    if (phase === 1) extension = p
    if (phase === 2) {
        extension = 1;
        y += .22 * p
    }
    if (phase === 3) {
        extension = 1 - p;
        y += .22
    }
    if (phase === 4) {
        x = pickup.x + (drop.x - pickup.x) * p;
        y = pickup.y + .22 + (drop.y - pickup.y) * p
    }
    if (phase >= 5) {
        x = drop.x;
        y = drop.y + .22
    }
    if (phase === 5) extension = p
    if (phase === 6) {
        extension = 1;
        y -= .22 * p
    }
    if (phase === 7) {
        extension = 1 - p;
        y = drop.y
    }
    const lower = mode === 'double' ? direction * 2.5 * extension : 0
    const upperRelative = direction * 2.5 * extension
    const upper = lower + upperRelative
    const carried = phase >= 2 && phase <= 6
    // Before pickup / after release, the pallet remains at the transfer location.
    const cargo = phase < 2 ? {x: pickup.x, y: pickup.y + .64, z: direction * reach} : phase < 7 ? {
        x,
        y: y + .64,
        z: upper
    } : {x: drop.x + 6 * p, y: drop.y + .64, z: direction * reach}
    return {
        phase,
        label: STAGES[phase],
        progress,
        x,
        y,
        lower,
        upperRelative,
        upper,
        cargo,
        carried,
        extension,
        mode,
        direction
    }
}
