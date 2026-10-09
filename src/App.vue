<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import * as echarts from 'echarts'
import { createWarehouse } from './warehouse'
const sceneHost=ref(),trendHost=ref(),occupancyHost=ref(),selected=ref(0),running=ref(true),now=ref(''),view=ref('透视视角')
const forkMode=ref('double'),forkDirection=ref(1)
const xray=ref(false),speed=ref(1),telemetry=ref([{x:'0.0',height:'0.0'},{x:'0.0',height:'0.0'},{x:'0.0',height:'0.0'}]);const currentPosition=computed(()=>telemetry.value[selected.value]);const focusDevice=()=>{view.value='设备特写';twin?.focus(selected.value)}
let twin,timer,charts=[],observer
const devices=[{name:'SC-01',aisle:'01',task:'入库 · A01-08-03',load:'850 kg'},{name:'SC-02',aisle:'02',task:'出库 · B02-04-02',load:'620 kg'},{name:'SC-03',aisle:'03',task:'移库 · C03-06-05',load:'740 kg'}]
watch(running,v=>twin?.setRunning(v))
watch(xray,v=>twin?.setXray(v))
watch(speed,v=>twin?.setSpeed(v))
watch(forkMode,v=>twin?.setForkMode(v))
watch(forkDirection,v=>twin?.setForkDirection(v))
watch(selected,i=>{twin?.highlight(i);if(view.value==='设备特写')twin?.focus(i)})
const changeView=()=>{if(view.value==='俯视视角')twin?.top();else if(view.value==='设备特写')focusDevice();else twin?.reset()}
onMounted(()=>{
 timer=setInterval(()=>now.value=new Date().toLocaleString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'}),1000);now.value=new Date().toLocaleString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'})
 try{twin=createWarehouse(sceneHost.value,i=>selected.value=i,data=>telemetry.value=data);twin.highlight(selected.value)}catch(e){sceneHost.value.textContent='三维场景初始化失败，请使用支持 WebGL 的浏览器。';console.error(e)}
 const trend=echarts.init(trendHost.value),occupancy=echarts.init(occupancyHost.value);charts=[trend,occupancy]
 trend.setOption({color:['#35e1ce','#5797ff'],tooltip:{trigger:'axis'},legend:{data:['入库','出库'],textStyle:{color:'#89a7bc'},top:0},grid:{left:32,right:10,bottom:25,top:35},xAxis:{type:'category',data:['08:00','10:00','12:00','14:00','16:00','18:00'],axisLine:{lineStyle:{color:'#284254'}},axisLabel:{color:'#7b95a8'}},yAxis:{type:'value',splitLine:{lineStyle:{color:'#172e40'}},axisLabel:{color:'#7b95a8'}},series:[{name:'入库',type:'line',smooth:true,data:[62,98,75,128,114,146],areaStyle:{opacity:.12}},{name:'出库',type:'line',smooth:true,data:[45,75,92,106,88,120]}]})
 occupancy.setOption({color:['#37decb','#203d50'],tooltip:{trigger:'item'},series:[{type:'pie',radius:['68%','84%'],center:['50%','50%'],label:{show:false},data:[{value:187,name:'已占用'},{value:33,name:'空闲'}]}],graphic:[{type:'text',left:'center',top:'39%',style:{text:'85.0%',fill:'#e0f8ff',font:'bold 28px sans-serif'}},{type:'text',left:'center',top:'61%',style:{text:'货位利用率',fill:'#86a3b5',font:'12px sans-serif'}}]})
 observer=new ResizeObserver(()=>charts.forEach(c=>c.resize()));observer.observe(trendHost.value);observer.observe(occupancyHost.value)
})
onBeforeUnmount(()=>{clearInterval(timer);twin?.dispose();observer?.disconnect();charts.forEach(c=>c.dispose())})
</script>
<template>
 <div class="dashboard">
  <header><div class="brand"><span class="brand-icon">▦</span><div>WAREHOUSE <b>OS</b><small>智能仓储管理中心</small></div></div><div class="title"><h1>智能仓储数字孪生平台</h1><span>INTELLIGENT WAREHOUSE · DIGITAL TWIN</span></div><div class="header-status"><span class="dot"></span> 模拟数据 <time>{{now}}</time></div></header>
  <div class="overview"><div v-for="(k,i) in ['今日入库 / 托盘','今日出库 / 托盘','当前库存 / 托盘','设备可用率']" :key="k" class="metric"><span class="metric-icon">{{['↙','↗','▤','◉'][i]}}</span><div><small>{{k}}</small><strong>{{['1,286','1,048','187','100'][i]}}<em v-if="i===3">%</em></strong></div><span class="metric-note">{{['↑ 12.8%','↑ 8.2%','220 个货位','3 / 3 在线'][i]}}</span></div></div>
  <main>
   <aside><section class="panel"><h2>仓库总览 <span>OVERVIEW</span></h2><div ref="occupancyHost" class="donut"></div><div class="capacity"><div><small>已占用</small><b>187 <em>位</em></b></div><div><small>可用货位</small><b class="cyan">33 <em>位</em></b></div></div><div class="info-row"><span>仓库类型</span><b>托盘式自动化立体仓库</b></div><div class="info-row"><span>货架规模</span><b>4 排 × 11 列 × 5 层</b></div></section>
    <section class="panel trend"><h2>出入库趋势 <span>今日 / 模拟</span></h2><div ref="trendHost" class="chart"></div></section>
    <section class="panel"><h2>系统状态 <span>SYSTEM</span></h2><div v-for="s in ['WMS 仓储管理','WCS 设备调度','数字孪生引擎']" class="info-row"><span>{{s}}</span><b class="cyan"><i class="dot"></i>演示运行中</b></div><div class="notice">实时设备接口尚未接入 · 当前为本地仿真</div></section>
   </aside>
   <section class="scene-panel"><div class="scene-heading"><div><span class="eyebrow">LIVE DIGITAL TWIN</span><h2>立体仓库 · 全景监控</h2></div><el-select v-model="view" @change="changeView" style="width:125px"><el-option label="透视视角" value="透视视角"/><el-option label="俯视视角" value="俯视视角"/><el-option label="设备特写" value="设备特写"/></el-select></div><div ref="sceneHost" class="scene"></div><div class="scene-tools"><el-button :type="xray?'primary':'default'" @click="xray=!xray">{{xray?'关闭透视':'货架透视'}}</el-button><el-button @click="focusDevice">聚焦 {{devices[selected].name}}</el-button><el-select v-model="speed" aria-label="仿真速度" style="width:95px"><el-option v-for="s in [0.5,1,2]" :key="s" :label="s+'× 速度'" :value="s"/></el-select></div><div class="fork-controls"><span>货叉机构演示</span><el-radio-group v-model="forkMode" size="small"><el-radio-button value="single">单伸</el-radio-button><el-radio-button value="double">双伸</el-radio-button></el-radio-group><el-radio-group v-model="forkDirection" size="small"><el-radio-button :value="-1">左伸</el-radio-button><el-radio-button :value="1">右伸</el-radio-button></el-radio-group><small>切换后从归中状态重新定位</small></div><div class="scene-legend"><span><i style="background:#f4c864"></i>双立柱堆垛机</span><span><i style="background:#418aa2"></i>托盘货架</span><span><i style="background:#b3976c"></i>库存托盘</span></div><div class="scene-bottom"><span><i class="dot"></i>{{running?'仿真运行中':'仿真已暂停'}}<small>拖动旋转 · 滚轮缩放 · 点击堆垛机查看详情</small></span><el-button @click="running=!running" :type="running?'default':'primary'">{{running?'暂停仿真':'继续仿真'}}</el-button><el-button @click="view='透视视角';twin?.reset()">复位视角</el-button></div></section>
   <aside><section class="panel"><h2>堆垛机监控 <span>03 UNITS</span></h2><button v-for="(d,i) in devices" :key="d.name" class="device" :class="{active:selected===i}" @click="selected=i"><div><b>{{d.name}}</b><span class="cyan">● {{running?'运行中':'已暂停'}}</span></div><small>双立柱托盘堆垛机 · {{d.aisle}} 号巷道</small><div class="device-track"><span :class="{moving:running}"></span></div><small>{{telemetry[i].phase || '定位取货'}}</small></button></section>
    <section class="panel"><h2>设备详情 <span>{{devices[selected].name}}</span></h2><div class="equipment-sketch" aria-label="双立柱堆垛机结构示意"><span class="beam"></span><span class="column one"></span><span class="column two"></span><span class="platform"></span><span class="base"></span><span class="motor"></span></div><div class="position-readout"><div><small>行走位置 / m</small><b>{{currentPosition.x}}</b></div><div><small>提升高度 / m</small><b>{{currentPosition.height}}</b></div></div><el-button class="focus-button" @click="focusDevice">查看设备特写 ↗</el-button><div class="fork-readout"><div class="phase-label">{{currentPosition.phase || '定位取货'}}</div><div><span>上层 / Z</span><b>{{currentPosition.upper || '0.00'}} m</b></div><div><span>下层 / Z</span><b>{{currentPosition.lower || '0.00'}} m</b></div><small>{{forkMode==='single'?'单伸：上层运动，下层锁止':'双伸：上下层同步同向伸缩'}}</small></div><div class="info-row"><span>设备结构</span><b>双立柱 · 托盘式</b></div><div class="info-row"><span>当前载荷（模拟）</span><b>{{devices[selected].load}}</b></div><div class="info-row"><span>额定载荷</span><b>1,500 kg</b></div><div class="info-row"><span>安全保护</span><b class="cyan">正常</b></div><div class="notice">参考图结构建模，尺寸及额定参数为演示设定</div></section>
   </aside>
  </main>
  <section class="tasks panel"><h2>作业任务队列 <span>模拟调度 · {{running?'运行中':'已暂停'}}</span></h2><el-table :data="[{id:'TASK-2026-001',type:'入库',device:'SC-01',from:'入库输送线',to:'A01-08-03',status:'执行中'},{id:'TASK-2026-002',type:'出库',device:'SC-02',from:'B02-04-02',to:'出库输送线',status:'执行中'},{id:'TASK-2026-003',type:'移库',device:'SC-03',from:'C03-02-01',to:'C03-06-05',status:'执行中'}]" size="small"><el-table-column prop="id" label="任务编号"/><el-table-column prop="type" label="作业类型"/><el-table-column prop="device" label="执行设备"/><el-table-column prop="from" label="起始位置"/><el-table-column prop="to" label="目标位置"/><el-table-column label="状态"><template #default><el-tag size="small" :type="running?'success':'info'">{{running?'执行中':'已暂停'}}</el-tag></template></el-table-column></el-table></section>
  <footer><span>WAREHOUSE OS / DIGITAL TWIN CONSOLE</span><span>本地演示 · Three.js + ECharts + Vue + Element Plus</span></footer>
 </div>
</template>
