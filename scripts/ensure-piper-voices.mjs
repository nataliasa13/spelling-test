#!/usr/bin/env node
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const required = [
  'public/piper-voices/en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx',
  'public/piper-voices/en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx.json',
  'public/piper-voices/es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx',
  'public/piper-voices/es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx.json',
  'public/piper-wasm/piper_phonemize.wasm',
  'public/piper-wasm/piper_phonemize.data',
  'public/piper-wasm/onnx/ort-wasm-simd-threaded.wasm',
]

async function main() {
  const missing = []
  for (const rel of required) {
    try {
      await access(join(root, rel))
    } catch {
      missing.push(rel)
    }
  }
  if (missing.length === 0) return
  console.error('Missing Piper assets for offline TTS:')
  missing.forEach((p) => console.error(`  - ${p}`))
  console.error('\nRun: npm run voices:fetch')
  process.exit(1)
}

main()
