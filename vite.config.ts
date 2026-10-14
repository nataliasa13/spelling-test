import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const ortDist = path.join(rootDir, 'node_modules/onnxruntime-web/dist')

/** Sirve ONNX/Piper en dev sin que Vite trate los .wasm como imports de código. */
function offlinePiperAssets(): Plugin {
  return {
    name: 'offline-piper-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? ''
        if (!pathname.startsWith('/piper-wasm/')) return next()

        const rel = pathname.replace(/^\/piper-wasm\//, '')
        const fromPublic = path.join(rootDir, 'public/piper-wasm', rel)
        const fromOrt =
          rel.startsWith('onnx/') && rel.slice(5).startsWith('ort-wasm')
            ? path.join(ortDist, path.basename(rel))
            : null

        const filePath = fs.existsSync(fromPublic)
          ? fromPublic
          : fromOrt && fs.existsSync(fromOrt)
            ? fromOrt
            : null

        if (!filePath) return next()

        const ext = path.extname(filePath)
        const type =
          ext === '.wasm'
            ? 'application/wasm'
            : ext === '.mjs'
              ? 'application/javascript'
              : ext === '.data'
                ? 'application/octet-stream'
                : 'application/octet-stream'

        res.setHeader('Content-Type', type)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // En GitHub Pages el sitio cuelga de /<repo>/; el workflow define BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), offlinePiperAssets()],
})
