import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {resolve} from 'node:path'
import {handleAiApi} from './ai-api.js'

export default defineConfig({
  plugins: [vue(), {
    name: 'warehouse-ai-api',
    configureServer(server) { server.middlewares.use(handleAiApi) }
  }],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        dxfTwinTest: resolve(import.meta.dirname, 'dxf-twin-test.html')
      }
    }
  }
})
