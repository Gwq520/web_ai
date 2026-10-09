<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  DEFAULT_CONFIG,
  normalizeConfig,
  occupancy,
  warehouseLayout
} from './config'
import { createWarehouse } from './warehouse'
const dashboardHost = ref(),
  sceneOnly = ref(false),
  fullscreen = ref(false)
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else if (dashboardHost.value?.requestFullscreen)
      await dashboardHost.value.requestFullscreen()
    else ElMessage.info('当前浏览器不支持全屏，请使用浏览器全屏功能')
  } catch {
    ElMessage.info('全屏请求未成功，请使用浏览器全屏功能')
  }
}
const syncFullscreen = () =>
  (fullscreen.value = Boolean(document.fullscreenElement))
const sceneHost = ref(),
  trendHost = ref(),
  occupancyHost = ref(),
  selected = ref(0),
  running = ref(true),
  now = ref(''),
  view = ref('透视视角')
const config = ref({ ...DEFAULT_CONFIG }),
  draft = ref({ ...DEFAULT_CONFIG }),
  configOpen = ref(false)
try {
  const saved = localStorage.getItem('warehouse-scene')
  if (saved) config.value = normalizeConfig(JSON.parse(saved))
} catch {}
draft.value = { ...config.value }
const capacity = computed(() => occupancy(config.value))
const layout = computed(() => warehouseLayout(config.value)),
  draftLayout = computed(() => warehouseLayout(normalizeConfig(draft.value)))
const alarms = ref([]),
  pendingAlarms = ref([]),
  alarmOpen = ref(false)
const activeAlarms = computed(() => alarms.value.filter((a) => !a.resolved)),
  hasFaults = computed(
    () => activeAlarms.value.length > 0 || pendingAlarms.value.length > 0
  )
const deviceAlarm = (i) => activeAlarms.value.find((a) => a.index === i)
const selectedAlarm = computed(() => deviceAlarm(selected.value))
const forkMode = computed({
    get: () => config.value.rackMode,
    set: (v) => {
      if (hasFaults.value) return
      config.value = { ...config.value, rackMode: v }
      persistConfig()
      initScene()
      updateOccupancy()
    }
  }),
  forkDirection = ref(1)
const xray = ref(false),
  speed = ref(1),
  telemetry = ref([
    { x: '0.0', height: '0.0' },
    { x: '0.0', height: '0.0' },
    { x: '0.0', height: '0.0' }
  ])
const currentPosition = computed(() => telemetry.value[selected.value] ?? {})
const focusDevice = () => {
  view.value = '设备特写'
  twin?.focus(selected.value)
}
let twin,
  timer,
  charts = [],
  observer
const devices = computed(() =>
  Array.from({ length: config.value.cranes }, (_, i) => ({
    name: 'SC-' + String(i + 1).padStart(2, '0'),
    aisle: String(i + 1).padStart(2, '0'),
    load: ['850 kg', '620 kg', '740 kg', '680 kg'][i]
  }))
)
const tasks = computed(() =>
  devices.value.map((d, i) => ({
    id: 'TASK-' + String(i + 1).padStart(3, '0'),
    type: '出库',
    device: d.name,
    from: `${layout.value.rows.find((r) => r.aisle === i && r.offset === forkDirection.value * (forkMode.value === 'double' ? 5 : 2.5))?.number}排货架`,
    to: `${d.aisle}号巷道出库输送线`,
    alarm: Boolean(deviceAlarm(i)),
    status: deviceAlarm(i)
      ? '报警停机'
      : (telemetry.value[i]?.phase ?? '定位取货')
  }))
)
function initScene() {
  twin?.dispose()
  twin = null
  selected.value = 0
  view.value = '透视视角'
  telemetry.value = []
  try {
    twin = createWarehouse(
      sceneHost.value,
      (i) => (selected.value = i),
      (data) => (telemetry.value = data),
      config.value,
      handleAlarm
    )
    twin.setForkMode(forkMode.value)
    twin.setForkDirection(forkDirection.value)
    twin.setSpeed(speed.value)
    twin.setRunning(running.value)
    twin.setXray(xray.value)
    twin.highlight(0)
  } catch (e) {
    sceneHost.value.textContent =
      '三维场景初始化失败，请使用支持 WebGL 的浏览器。'
    console.error(e)
  }
}
function updateOccupancy() {
  const c = capacity.value
  charts[1]?.setOption({
    series: [
      {
        data: [
          { value: c.used, name: '已占用' },
          { value: c.total - c.used, name: '空闲' }
        ]
      }
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '39%',
        style: {
          text: ((100 * c.used) / c.total).toFixed(1) + '%',
          fill: '#e0f8ff',
          font: 'bold 28px sans-serif'
        }
      },
      {
        type: 'text',
        left: 'center',
        top: '61%',
        style: { text: '货位利用率', fill: '#86a3b5', font: '12px sans-serif' }
      }
    ]
  })
}
function persistConfig() {
  try {
    localStorage.setItem('warehouse-scene', JSON.stringify(config.value))
  } catch {}
}
function generateScene() {
  if (hasFaults.value) return
  config.value = normalizeConfig(draft.value)
  draft.value = { ...config.value }
  persistConfig()
  initScene()
  updateOccupancy()
  configOpen.value = false
}
function handleAlarm(event) {
  if (deviceAlarm(event.index)) return
  pendingAlarms.value = pendingAlarms.value.filter((i) => i !== event.index)
  const d = devices.value[event.index]
  alarms.value.unshift({
    ...event,
    id: Date.now() + '-' + event.index,
    device: d.name,
    aisle: d.aisle,
    time: new Date().toLocaleString('zh-CN', {
      hour12: false,
      timeZone: 'Asia/Shanghai'
    }),
    acknowledged: false,
    resolved: false
  })
  ElMessage.error(d.name + ' · ' + event.message)
}
function simulateAlarm() {
  if (twin?.simulatePickupAlarm(selected.value)) {
    pendingAlarms.value.push(selected.value)
    running.value = true
    ElMessage.info(
      devices.value[selected.value].name +
        ' 已安排取货报警，进入伸叉取货阶段后触发'
    )
  }
}
function cancelDemo() {
  twin?.resetAlarm(selected.value)
  pendingAlarms.value = pendingAlarms.value.filter((i) => i !== selected.value)
}
function locateAlarm(alarm) {
  selected.value = alarm.index
  view.value = '设备全貌'
  twin?.fullFocus(alarm.index)
  alarmOpen.value = false
}
function resetAlarm(alarm) {
  twin?.resetAlarm(alarm.index)
  alarm.resolved = true
  alarm.resolvedAt = new Date().toLocaleString('zh-CN', {
    hour12: false,
    timeZone: 'Asia/Shanghai'
  })
  ElMessage.success(alarm.device + ' 演示故障已复位')
}
function openConfig() {
  draft.value = { ...config.value }
  configOpen.value = true
}
watch(running, (v) => twin?.setRunning(v))
watch(xray, (v) => twin?.setXray(v))
watch(speed, (v) => twin?.setSpeed(v))
watch(forkDirection, (v) => twin?.setForkDirection(v))
watch(selected, (i) => {
  twin?.highlight(i)
  if (view.value === '设备特写') twin?.focus(i)
  else if (view.value === '设备全貌') twin?.fullFocus(i)
})
function resetView() {
  view.value = '透视视角'
  twin?.reset()
}
const changeView = () => {
  if (view.value === '俯视视角') twin?.top()
  else if (view.value === '设备特写') focusDevice()
  else if (view.value === '设备全貌') twin?.fullFocus(selected.value)
  else twin?.reset()
}
onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreen)
  timer = setInterval(
    () =>
      (now.value = new Date().toLocaleString('zh-CN', {
        hour12: false,
        timeZone: 'Asia/Shanghai'
      })),
    1000
  )
  now.value = new Date().toLocaleString('zh-CN', {
    hour12: false,
    timeZone: 'Asia/Shanghai'
  })
  initScene()
  const trend = echarts.init(trendHost.value),
    occupancy = echarts.init(occupancyHost.value)
  charts = [trend, occupancy]
  trend.setOption({
    color: ['#35e1ce', '#5797ff'],
    tooltip: { trigger: 'axis' },
    legend: { data: ['入库', '出库'], textStyle: { color: '#89a7bc' }, top: 0 },
    grid: { left: 32, right: 10, bottom: 25, top: 35 },
    xAxis: {
      type: 'category',
      data: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
      axisLine: { lineStyle: { color: '#284254' } },
      axisLabel: { color: '#7b95a8' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#172e40' } },
      axisLabel: { color: '#7b95a8' }
    },
    series: [
      {
        name: '入库',
        type: 'line',
        smooth: true,
        data: [62, 98, 75, 128, 114, 146],
        areaStyle: { opacity: 0.12 }
      },
      {
        name: '出库',
        type: 'line',
        smooth: true,
        data: [45, 75, 92, 106, 88, 120]
      }
    ]
  })
  occupancy.setOption({
    color: ['#37decb', '#203d50'],
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['68%', '84%'],
        center: ['50%', '50%'],
        label: { show: false },
        data: [
          { value: capacity.value.used, name: '已占用' },
          { value: capacity.value.total - capacity.value.used, name: '空闲' }
        ]
      }
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '39%',
        style: {
          text:
            ((100 * capacity.value.used) / capacity.value.total).toFixed(1) +
            '%',
          fill: '#e0f8ff',
          font: 'bold 28px sans-serif'
        }
      },
      {
        type: 'text',
        left: 'center',
        top: '61%',
        style: { text: '货位利用率', fill: '#86a3b5', font: '12px sans-serif' }
      }
    ]
  })
  observer = new ResizeObserver(() => charts.forEach((c) => c.resize()))
  observer.observe(trendHost.value)
  observer.observe(occupancyHost.value)
})
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreen)
  clearInterval(timer)
  twin?.dispose()
  observer?.disconnect()
  charts.forEach((c) => c.dispose())
})
</script>
<template>
  <div
    ref="dashboardHost"
    class="dashboard"
    :class="{ 'scene-only': sceneOnly }"
  >
    <header>
      <div class="brand">
        <span class="brand-icon">▦</span>
        <div>WAREHOUSE <b>OS</b><small>智能仓储管理中心</small></div>
      </div>
      <div class="title">
        <h1>智能仓储数字孪生平台</h1>
        <span>INTELLIGENT WAREHOUSE · DIGITAL TWIN</span>
      </div>
      <div class="header-actions">
        <el-button
          class="alarm-entry"
          :type="activeAlarms.length ? 'danger' : 'default'"
          @click="alarmOpen = true"
          >报警 {{ activeAlarms.length }}</el-button
        >
        <div class="header-status">
          <span class="dot"></span> 模拟数据 <time>{{ now }}</time>
        </div>
        <el-button
          @click="toggleFullscreen"
          :aria-label="fullscreen ? '退出全屏' : '全屏看板'"
          >{{ fullscreen ? '退出全屏' : '全屏' }}</el-button
        >
      </div>
    </header>
    <div class="overview">
      <div
        v-for="(k, i) in [
          '今日入库 / 托盘',
          '今日出库 / 托盘',
          '当前库存 / 托盘',
          '设备可用率'
        ]"
        :key="k"
        class="metric"
      >
        <span class="metric-icon">{{ ['↙', '↗', '▤', '◉'][i] }}</span>
        <div>
          <small>{{ k }}</small
          ><strong
            >{{
              [
                '1,286',
                '1,048',
                capacity.used,
                (
                  ((config.cranes - activeAlarms.length) / config.cranes) *
                  100
                ).toFixed(0)
              ][i]
            }}<em v-if="i === 3">%</em></strong
          >
        </div>
        <span class="metric-note">{{
          [
            '↑ 12.8%',
            '↑ 8.2%',
            capacity.total + ' 个货位',
            config.cranes -
              activeAlarms.length +
              ' / ' +
              config.cranes +
              ' 可用'
          ][i]
        }}</span>
      </div>
    </div>
    <main>
      <aside>
        <section class="panel">
          <h2>仓库总览 <span>OVERVIEW</span></h2>
          <div ref="occupancyHost" class="donut"></div>
          <div class="capacity">
            <div>
              <small>已占用</small><b>{{ capacity.used }} <em>位</em></b>
            </div>
            <div>
              <small>可用货位</small
              ><b class="cyan"
                >{{ capacity.total - capacity.used }} <em>位</em></b
              >
            </div>
          </div>
          <div class="info-row">
            <span>货架深度</span
            ><b>{{
              forkMode === 'double' ? '双伸 · 每侧两排' : '单伸 · 每侧一排'
            }}</b>
          </div>
          <div class="info-row">
            <span>仓库类型</span><b>托盘式自动化立体仓库</b>
          </div>
          <div class="info-row">
            <span>货架规模</span
            ><b
              >{{ layout.rows.length }} 排 × {{ config.columns }} 列 ×
              {{ config.levels }} 层</b
            >
          </div>
        </section>
        <section class="panel trend">
          <h2>出入库趋势 <span>今日 / 模拟</span></h2>
          <div ref="trendHost" class="chart"></div>
        </section>
        <section class="panel">
          <h2>系统状态 <span>SYSTEM</span></h2>
          <div
            v-for="s in ['WMS 仓储管理', 'WCS 设备调度', '数字孪生引擎']"
            class="info-row"
          >
            <span>{{ s }}</span
            ><b class="cyan"><i class="dot"></i>演示运行中</b>
          </div>
          <div class="notice">实时设备接口尚未接入 · 当前为本地仿真</div>
        </section>
      </aside>
      <section class="scene-panel">
        <div class="scene-heading">
          <div>
            <span class="eyebrow">LIVE DIGITAL TWIN</span>
            <h2>立体仓库 · 全景监控</h2>
          </div>
          <el-select v-model="view" @change="changeView" style="width: 125px"
            ><el-option label="透视视角" value="透视视角" /><el-option
              label="俯视视角"
              value="俯视视角" /><el-option
              label="设备特写"
              value="设备特写" /><el-option label="设备全貌" value="设备全貌"
          /></el-select>
        </div>
        <div ref="sceneHost" class="scene"></div>
        <div class="scene-tools">
          <el-button
            :type="sceneOnly ? 'primary' : 'default'"
            @click="sceneOnly = !sceneOnly"
            >{{ sceneOnly ? '完整看板' : '专注场景' }}</el-button
          ><el-button type="primary" :disabled="hasFaults" @click="openConfig"
            >配置 / 生成</el-button
          ><el-button
            :type="xray ? 'primary' : 'default'"
            @click="xray = !xray"
            >{{ xray ? '关闭透视' : '货架透视' }}</el-button
          ><el-button @click="focusDevice"
            >聚焦 {{ devices[selected].name }}</el-button
          ><el-select v-model="speed" aria-label="仿真速度" style="width: 95px"
            ><el-option
              v-for="s in [0.5, 1, 2]"
              :key="s"
              :label="s + '× 速度'"
              :value="s"
          /></el-select>
        </div>
        <div class="fork-controls">
          <span>货叉机构演示</span
          ><el-radio-group :disabled="hasFaults" v-model="forkMode" size="small"
            ><el-radio-button value="single">单伸</el-radio-button
            ><el-radio-button value="double"
              >双伸</el-radio-button
            ></el-radio-group
          ><el-radio-group
            :disabled="hasFaults"
            v-model="forkDirection"
            size="small"
            ><el-radio-button :value="-1">左伸</el-radio-button
            ><el-radio-button :value="1">右伸</el-radio-button></el-radio-group
          ><small>切换单／双伸同步重建货架</small>
        </div>
        <div v-if="activeAlarms.length" class="scene-alarm-banner" role="alert">
          <strong>⚠ {{ activeAlarms.length }} 台设备报警停机</strong
          ><button
            v-for="a in activeAlarms"
            :key="a.id"
            @click="locateAlarm(a)"
          >
            {{ a.device }} · {{ a.aisle }} 巷道 · {{ a.message }} ↗
          </button>
        </div>
        <div class="scene-legend">
          <span><i style="background: #f4c864"></i>双立柱堆垛机</span
          ><span><i style="background: #418aa2"></i>托盘货架</span
          ><span><i style="background: #b3976c"></i>库存托盘</span>
        </div>
        <div class="scene-bottom">
          <span
            ><i class="dot"></i>{{ running ? '仿真运行中' : '仿真已暂停'
            }}<small>拖动旋转 · 滚轮缩放 · 点击堆垛机查看详情</small></span
          ><el-button
            @click="running = !running"
            :type="running ? 'default' : 'primary'"
            >{{ running ? '暂停仿真' : '继续仿真' }}</el-button
          ><el-button
            @click="resetView"
            >复位视角</el-button
          >
        </div>
      </section>
      <aside>
        <section class="panel">
          <h2>
            堆垛机监控 <span>{{ config.cranes }} UNITS</span>
          </h2>
          <button
            v-for="(d, i) in devices"
            :key="d.name"
            class="device"
            :class="{
              active: selected === i,
              'device-alarm': !!deviceAlarm(i)
            }"
            @click="selected = i"
          >
            <div>
              <b>{{ d.name }}</b
              ><span :class="deviceAlarm(i) ? 'danger-text' : 'cyan'">{{
                deviceAlarm(i)
                  ? '⚠ 报警停机'
                  : running
                    ? '● 运行中'
                    : '● 已暂停'
              }}</span>
            </div>
            <small>双立柱托盘堆垛机 · {{ d.aisle }} 号巷道</small>
            <div class="device-track">
              <span :class="{ moving: running && !deviceAlarm(i) }"></span>
            </div>
            <small>{{
              deviceAlarm(i)
                ? deviceAlarm(i).message
                : pendingAlarms.includes(i)
                  ? '等待取货报警演示'
                  : telemetry[i]?.phase || '定位取货'
            }}</small>
          </button>
        </section>
        <section class="panel">
          <h2>
            设备详情 <span>{{ devices[selected].name }}</span>
          </h2>
          <div class="equipment-sketch" aria-label="双立柱堆垛机结构示意">
            <span class="beam"></span><span class="column one"></span
            ><span class="column two"></span><span class="platform"></span
            ><span class="base"></span><span class="motor"></span>
          </div>
          <div v-if="selectedAlarm" class="device-alarm-detail">
            <strong
              >⚠ {{ devices[selected].name }} ·
              {{ selectedAlarm.code }}</strong
            >
            <p>{{ selectedAlarm.message }} / {{ selectedAlarm.phase }}</p>
            <small>{{ selectedAlarm.time }}</small>
            <div>
              <el-button
                size="small"
                :disabled="selectedAlarm.acknowledged"
                @click="selectedAlarm.acknowledged = true"
                >{{
                  selectedAlarm.acknowledged ? '已确认' : '确认报警'
                }}</el-button
              ><el-button
                size="small"
                type="danger"
                @click="resetAlarm(selectedAlarm)"
                >演示故障复位</el-button
              >
            </div>
          </div>
          <el-button
            class="simulate-alarm"
            type="danger"
            plain
            :disabled="!!selectedAlarm || pendingAlarms.includes(selected)"
            @click="simulateAlarm"
            >{{
              pendingAlarms.includes(selected)
                ? '等待取货阶段触发'
                : '模拟取货报警 · ' + devices[selected].name
            }}</el-button
          ><el-button
            v-if="pendingAlarms.includes(selected)"
            class="focus-button"
            @click="cancelDemo"
            >取消报警演示</el-button
          >
          <div class="position-readout">
            <div>
              <small>行走位置 / m</small><b>{{ currentPosition.x }}</b>
            </div>
            <div>
              <small>提升高度 / m</small><b>{{ currentPosition.height }}</b>
            </div>
          </div>
          <el-button class="focus-button" @click="focusDevice"
            >查看设备特写 ↗</el-button
          >
          <div class="fork-readout">
            <div class="phase-label">
              {{ currentPosition.phase || '定位取货' }}
            </div>
            <div>
              <span>上层 / Z</span
              ><b>{{ currentPosition.upper || '0.00' }} m</b>
            </div>
            <div>
              <span>下层 / Z</span
              ><b>{{ currentPosition.lower || '0.00' }} m</b>
            </div>
            <small>{{
              forkMode === 'single'
                ? '单伸：上层运动，下层锁止'
                : '双伸：上下层同步同向伸缩'
            }}</small>
          </div>
          <div class="info-row">
            <span>设备结构</span><b>双立柱 · 托盘式</b>
          </div>
          <div class="info-row">
            <span>当前载荷（模拟）</span><b>{{ devices[selected].load }}</b>
          </div>
          <div class="info-row"><span>额定载荷</span><b>1,500 kg</b></div>
          <div class="info-row">
            <span>安全保护</span
            ><b :class="selectedAlarm ? 'danger-text' : 'cyan'">{{
              selectedAlarm ? '报警停机' : '正常'
            }}</b>
          </div>
          <div class="notice">参考图结构建模，尺寸及额定参数为演示设定</div>
        </section>
      </aside>
    </main>
    <section class="tasks panel">
      <h2>
        作业任务队列 <span>模拟调度 · {{ running ? '运行中' : '已暂停' }}</span>
      </h2>
      <el-table :data="tasks" height="100%" size="small"
        ><el-table-column prop="id" label="任务编号" /><el-table-column
          prop="type"
          label="作业类型"
        /><el-table-column prop="device" label="执行设备" /><el-table-column
          prop="from"
          label="起始位置"
        /><el-table-column prop="to" label="目标位置" /><el-table-column
          label="状态"
          ><template #default="scope"
            ><el-tag
              size="small"
              :type="scope.row.alarm ? 'danger' : running ? 'success' : 'info'"
              >{{
                scope.row.alarm
                  ? '报警停机'
                  : running
                    ? scope.row.status
                    : '已暂停'
              }}</el-tag
            ></template
          ></el-table-column
        ></el-table
      >
    </section>
    <el-dialog
      v-model="configOpen"
      title="生成仓储场景"
      width="min(480px, 94vw)"
      ><el-form label-position="top"
        ><el-form-item label="堆垛机数量 / 巷道数量"
          ><el-select
            v-model="draft.cranes"
            aria-label="堆垛机数量"
            style="width: 100%"
            ><el-option
              v-for="n in 4"
              :key="n"
              :label="n + ' 台堆垛机 / ' + n + ' 条巷道'"
              :value="n" /></el-select></el-form-item
        ><el-form-item label="货架深度布局"
          ><el-radio-group v-model="draft.rackMode"
            ><el-radio-button value="single">单伸 · 每侧 1 排</el-radio-button
            ><el-radio-button value="double"
              >双伸 · 每侧 2 排</el-radio-button
            ></el-radio-group
          ></el-form-item
        ><el-form-item label="每排货架列数"
          ><el-input-number
            v-model="draft.columns"
            :min="4"
            :max="16"
            aria-label="货架列数" /></el-form-item
        ><el-form-item label="货架层数"
          ><el-input-number
            v-model="draft.levels"
            :min="2"
            :max="6"
            aria-label="货架层数" /></el-form-item
      ></el-form>
      <div class="config-summary">
        生成 {{ draftLayout.rows.length }} 排货架 ·
        {{
          draftLayout.rows.length * draft.columns * draft.levels
        }}
        个货位<br />每条巷道独立配置两侧货架及输送线，放货后托盘沿滚筒线送出。
        <div
          v-for="a in draftLayout.aisles"
          :key="a.index"
          class="aisle-layout"
        >
          <span>{{
            draftLayout.rows
              .filter((r) => r.aisle === a.index && r.side === '左')
              .map((r) => r.number + '排')
              .join(' / ')
          }}</span
          ><b>{{ a.index + 1 }} 巷道 · 堆垛机</b
          ><span>{{
            draftLayout.rows
              .filter((r) => r.aisle === a.index && r.side === '右')
              .map((r) => r.number + '排')
              .join(' / ')
          }}</span>
        </div>
      </div>
      <template #footer
        ><el-button @click="configOpen = false">取消</el-button
        ><el-button type="primary" @click="generateScene"
          >生成场景</el-button
        ></template
      ></el-dialog
    >
    <el-drawer
      v-model="alarmOpen"
      title="设备报警中心 · 模拟"
      size="min(520px, 100vw)"
      ><div class="alarm-summary">
        当前 {{ activeAlarms.length }} 台设备报警 · 确认报警不会恢复运行
      </div>
      <el-empty
        v-if="!alarms.length"
        description="暂无报警，可在设备详情中模拟取货报警"
      />
      <article
        v-for="a in alarms"
        :key="a.id"
        class="alarm-record"
        :class="{ resolved: a.resolved }"
      >
        <div>
          <strong>{{ a.device }} · {{ a.aisle }} 号巷道</strong
          ><el-tag :type="a.resolved ? 'success' : 'danger'">{{
            a.resolved
              ? '已复位'
              : a.acknowledged
                ? '已确认 / 未复位'
                : '待确认'
          }}</el-tag>
        </div>
        <p>{{ a.code }} · {{ a.message }}</p>
        <small>{{ a.phase }} · {{ a.time }}</small>
        <div class="alarm-actions" v-if="!a.resolved">
          <el-button @click="locateAlarm(a)">定位设备</el-button
          ><el-button :disabled="a.acknowledged" @click="a.acknowledged = true"
            >确认报警</el-button
          ><el-button type="danger" @click="resetAlarm(a)"
            >演示故障复位</el-button
          >
        </div>
        <small v-else>复位时间 {{ a.resolvedAt }}</small>
      </article>
      <p class="notice">
        仅为本地故障演示，未连接真实 PLC /
        WCS。真实设备复位需由设备控制系统执行。
      </p></el-drawer
    >
    <footer>
      <span>WAREHOUSE OS / DIGITAL TWIN CONSOLE</span
      ><span>本地演示 · Three.js + ECharts + Vue + Element Plus</span>
    </footer>
  </div>
</template>
