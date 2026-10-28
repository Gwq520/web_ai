import {createServer} from 'node:http'

const json = (res, status, value) => {
  res.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'})
  res.end(JSON.stringify(value))
}

async function body(req) {
  let value = ''
  for await (const chunk of req) {
    value += chunk
    if (value.length > 1_000_000) throw Object.assign(Error('请求内容过大'), {status: 413})
  }
  try { return JSON.parse(value || '{}') } catch { throw Object.assign(Error('请求格式无效'), {status: 400}) }
}

function cleanSvg(raw) {
  let svg = String(raw || '').trim().replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```$/, '').replace(/^<\?xml[^>]*>\s*/i, '')
  if (svg.length > 300_000 || !/^<svg\b/i.test(svg) || /<\s*(?:script|foreignObject|iframe|image|style|animate|set)\b|<!DOCTYPE|<!ENTITY|on[a-z]+\s*=|(?:href|src)\s*=|url\s*\(/i.test(svg)) {
    throw Error('AI 返回的 SVG 含不支持内容，请补充描述后重新生成')
  }
  const allowed = new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon'])
  for (const tag of svg.matchAll(/<\/?([\w:-]+)/g)) if (!allowed.has(tag[1].toLowerCase())) throw Error(`SVG 包含不支持的元素：${tag[1]}`)
  if (!/<\/svg\s*>$/i.test(svg)) throw Error('AI 返回的 SVG 不完整，请重试')
  return svg
}

async function openAiSvg(input, token) {
  const apiKey = token || process.env.OPENAI_API_KEY
  if (!apiKey) throw Object.assign(Error('请在 AI 生成窗口打开「配置 Token」，填写 OpenAI API Key 后保存'), {status: 503})
  const prompt = String(input.prompt || '').trim()
  if (!prompt || prompt.length > 2000) throw Object.assign(Error('请填写 1–2000 字的设备描述'), {status: 400})
  const constraints = `生成适合仓储数字孪生俯视平面图的二维设备 SVG，描述：${prompt}\n修改意见：${String(input.feedback || '无').slice(0, 1000)}\n${input.previousSvg ? `上一版 SVG：\n${String(input.previousSvg).slice(0, 12000)}\n请按意见修改。` : ''}`
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: {'authorization': `Bearer ${apiKey}`, 'content-type': 'application/json'},
    body: JSON.stringify({model: String(input.model || process.env.OPENAI_MODEL || 'gpt-4.1-mini').slice(0, 80), instructions: '你是工业设备 SVG 绘图器。只输出一个完整、自包含的 SVG，不要 Markdown 或说明文字。使用 viewBox="0 0 400 240"，背景透明，图形居中，使用清晰工程制图风格，仅使用 svg、g、path、rect、circle、ellipse、line、polyline、polygon 元素；禁止文字、脚本、外链、滤镜和渐变。', input: constraints, max_output_tokens: 4000})
  })
  const data = await response.json()
  if (!response.ok) throw Object.assign(Error(data.error?.message || `OpenAI 请求失败 (${response.status})`), {status: 502})
  const text = data.output_text || data.output?.flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text
  return cleanSvg(text)
}

async function claudeCompatibleSvg(input, token) {
  const apiKey = token || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw Object.assign(Error('请在 AI 生成窗口配置 Claude 兼容服务的 API Key'), {status: 503})
  const prompt = String(input.prompt || '').trim()
  if (!prompt || prompt.length > 2000) throw Object.assign(Error('请填写 1–2000 字的设备描述'), {status: 400})
  const endpoint = String(input.baseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.apikey.fun').trim().replace(/\/+$/, '')
  let target
  try { target = new URL(endpoint) } catch { throw Object.assign(Error('Claude 兼容服务请求地址无效'), {status: 400}) }
  const allowedHosts = new Set(['api.apikey.fun', 'api.apikey.fan', 'api.anthropic.com'])
  if (target.protocol !== 'https:' || !allowedHosts.has(target.hostname) || (target.pathname && target.pathname !== '/' && target.pathname !== '/v1')) {
    throw Object.assign(Error('请求地址仅支持 APIKEY.FUN、APIKEY.FAN 或 Anthropic 的 HTTPS API 根地址'), {status: 400})
  }
  const url = `${target.origin}/v1/messages`
  const system = '你是工业设备 SVG 绘图器。只输出一个完整、自包含的 SVG，不要 Markdown 或说明文字。使用 viewBox="0 0 400 240"，背景透明，图形居中，使用清晰工程制图风格，仅使用 svg、g、path、rect、circle、ellipse、line、polyline、polygon 元素；禁止文字、脚本、外链、滤镜和渐变。'
  const constraints = `生成适合仓储数字孪生俯视平面图的二维设备 SVG，描述：${prompt}\n修改意见：${String(input.feedback || '无').slice(0, 1000)}\n${input.previousSvg ? `上一版 SVG：\n${String(input.previousSvg).slice(0, 12000)}\n请按意见修改。` : ''}`
  const response = await fetch(url, {
    method: 'POST', redirect: 'error',
    headers: {'authorization': `Bearer ${apiKey}`, 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
    body: JSON.stringify({model: String(input.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5').slice(0, 100), max_tokens: 4000, system, messages: [{role: 'user', content: constraints}]})
  })
  const data = await response.json()
  if (!response.ok) throw Object.assign(Error(data.error?.message || data.message || `Claude 兼容服务请求失败 (${response.status})`), {status: 502})
  return cleanSvg(data.content?.filter(part => part.type === 'text').map(part => part.text).join('\n'))
}

async function meshy(path, {token, ...options} = {}) {
  const apiKey = token || process.env.MESHY_API_KEY
  if (!apiKey) throw Object.assign(Error('请在 AI 生成窗口打开「配置 Token」，填写 Meshy API Key 后保存'), {status: 503})
  const response = await fetch(`https://api.meshy.ai/openapi/v2/text-to-3d${path}`, {
    ...options, headers: {'authorization': `Bearer ${apiKey}`, ...(options.body ? {'content-type': 'application/json'} : {}), ...options.headers}
  })
  if (!response.ok) {
    const message = (await response.text()).slice(0, 1500)
    throw Object.assign(Error(`Meshy 请求失败 (${response.status})：${message}`), {status: response.status === 402 ? 402 : 502})
  }
  return response
}

export async function handleAiApi(req, res, next) {
  const pathname = new URL(req.url, 'http://localhost').pathname
  if (!pathname.startsWith('/api/ai/')) return next?.()
  try {
    const remote = req.socket.remoteAddress || ''
    if (!remote.startsWith('127.') && !remote.startsWith('::1') && !remote.startsWith('::ffff:127.')) throw Object.assign(Error('AI 生成接口目前只接受本机请求'), {status: 403})
    if (req.method === 'POST' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw Object.assign(Error('请求来源校验失败'), {status: 403})
    const openAiToken = String(req.headers['x-openai-api-key'] || '').slice(0, 500)
    const anthropicToken = String(req.headers['x-anthropic-api-key'] || '').slice(0, 500)
    const meshyToken = String(req.headers['x-meshy-api-key'] || '').slice(0, 500)
    if (req.method === 'GET' && pathname === '/api/ai/status') return json(res, 200, {openai: Boolean(openAiToken || process.env.OPENAI_API_KEY), anthropic: Boolean(anthropicToken || process.env.ANTHROPIC_API_KEY), meshy: Boolean(meshyToken || process.env.MESHY_API_KEY)})
    if (req.method === 'POST' && pathname === '/api/ai/svg') {
      const input = await body(req)
      const svg = input.provider === 'openai' ? await openAiSvg(input, openAiToken) : await claudeCompatibleSvg(input, anthropicToken)
      return json(res, 200, {svg})
    }
    if (req.method === 'POST' && pathname === '/api/ai/3d/tasks') {
      const input = await body(req), prompt = String(input.prompt || '').trim()
      if (!prompt || prompt.length > 800) throw Object.assign(Error('三维描述需为 1–800 字'), {status: 400})
      const model = input.model === 'meshy-t2.5' ? 'meshy-t2.5' : 'meshy-7.1'
      const smart = model === 'meshy-t2.5'
      const upstream = await meshy('', {token: meshyToken, method: 'POST', body: JSON.stringify({mode: 'preview', prompt, model_type: smart ? 'smart-topology' : 'standard', ai_model: model, target_formats: ['glb'], should_remesh: !smart, target_polycount: smart ? 12000 : 30000})})
      return json(res, 202, await upstream.json())
    }
    const taskMatch = pathname.match(/^\/api\/ai\/3d\/tasks\/([\w-]+)(\/refine|\/model)?$/)
    if (taskMatch && req.method === 'GET' && !taskMatch[2]) {
      const upstream = await meshy(`/${taskMatch[1]}`, {token: meshyToken})
      return json(res, 200, await upstream.json())
    }
    if (taskMatch && req.method === 'POST' && taskMatch[2] === '/refine') {
      const upstream = await meshy('', {token: meshyToken, method: 'POST', body: JSON.stringify({mode: 'refine', preview_task_id: taskMatch[1], enable_pbr: true, target_formats: ['glb']})})
      return json(res, 202, await upstream.json())
    }
    if (taskMatch && req.method === 'GET' && taskMatch[2] === '/model') {
      const upstream = await meshy(`/${taskMatch[1]}`, {token: meshyToken}), task = await upstream.json()
      if (task.status !== 'SUCCEEDED' || !task.model_urls?.glb) throw Object.assign(Error('三维模型尚未完成'), {status: 409})
      const file = await fetch(task.model_urls.glb)
      if (!file.ok) throw Error('生成的 GLB 下载失败')
      res.writeHead(200, {'content-type': 'model/gltf-binary', 'cache-control': 'no-store'})
      return res.end(Buffer.from(await file.arrayBuffer()))
    }
    return json(res, 404, {error: '未找到 AI 接口'})
  } catch (error) {
    if (res.headersSent) return res.end()
    return json(res, error.status || 500, {error: error.message || 'AI 请求失败'})
  }
}

export function createAiServer() { return createServer(handleAiApi) }
