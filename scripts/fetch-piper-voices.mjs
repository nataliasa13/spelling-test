#!/usr/bin/env node
/**
 * Downloads Piper voice models + WASM into public/ for offline, consistent TTS.
 * Run: npm run voices:fetch
 */
import { cp, mkdir, readdir, stat } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const publicDir = join(root, 'public')

const HF_BASE = 'https://huggingface.co/diffusionstudio/piper-voices/resolve/main'
const PIPER_WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize'

const VOICES = [
  'en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx',
  'es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx',
]

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function download(url, dest) {
  await mkdir(dirname(dest), { recursive: true })
  if (await exists(dest)) {
    console.log(`skip (exists): ${dest}`)
    return
  }
  console.log(`fetch: ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  await pipeline(res.body, createWriteStream(dest))
}

async function main() {
  for (const rel of VOICES) {
    const base = join(publicDir, 'piper-voices', rel)
    await download(`${HF_BASE}/${rel}`, base)
    await download(`${HF_BASE}/${rel}.json`, `${base}.json`)
  }

  const wasmOnnxDir = join(publicDir, 'piper-wasm', 'onnx')
  await mkdir(wasmOnnxDir, { recursive: true })
  const ortSrc = join(root, 'node_modules', 'onnxruntime-web', 'dist')
  const ortFiles = await readdir(ortSrc)
  for (const file of ortFiles) {
    if (!file.startsWith('ort-wasm')) continue
    if (!file.endsWith('.wasm') && !file.endsWith('.mjs')) continue
    const src = join(ortSrc, file)
    const dest = join(wasmOnnxDir, file)
    if (!(await exists(dest))) {
      console.log(`copy: ${file}`)
      await cp(src, dest)
    }
  }

  const piperWasmDir = join(publicDir, 'piper-wasm')
  await download(`${PIPER_WASM_BASE}.wasm`, join(piperWasmDir, 'piper_phonemize.wasm'))
  await download(`${PIPER_WASM_BASE}.data`, join(piperWasmDir, 'piper_phonemize.data'))

  console.log('\nDone. TTS is fully offline via public/piper-voices/ + public/piper-wasm/.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
