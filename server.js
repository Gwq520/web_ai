import {createServer} from 'node:http'
import {createReadStream, existsSync, statSync} from 'node:fs'
import {extname, join, normalize} from 'node:path'
import {fileURLToPath} from 'node:url'
import {handleAiApi} from './ai-api.js'

const root = fileURLToPath(new URL('./dist/', import.meta.url))
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'}
createServer((req, res) => {
  if (new URL(req.url, 'http://localhost').pathname.startsWith('/api/ai/')) return handleAiApi(req, res)
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  const file = normalize(join(root, pathname === '/' ? 'index.html' : pathname))
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end('Not found') }
  res.writeHead(200, {'content-type': types[extname(file)] || 'application/octet-stream'})
  createReadStream(file).pipe(res)
}).listen(Number(process.env.PORT || 5174), '0.0.0.0', () => console.log(`Warehouse AI server listening on ${process.env.PORT || 5174}`))
