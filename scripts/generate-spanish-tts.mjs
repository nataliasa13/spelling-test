#!/usr/bin/env node
/**
 * Genera MP3 (Elvira) en public/tts/es/ para hosting estático. Requiere red en build.
 */
import { access, copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EdgeTTS } from 'edge-tts-universal'
import { spanishTtsFileKey } from './spanishTtsKey.mjs'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const weekPath = join(root, 'data/week.json')
const outDir = join(root, 'public/tts/es')
const manifestPath = join(outDir, 'manifest.json')
const publicWeekPath = join(root, 'public/week.json')

const VOICE = 'es-ES-ElviraNeural'
const MANIFEST_VERSION = 1

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function normalizeWord(word) {
  return String(word ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFC')
}

async function synthesizeMp3(text) {
  const tts = new EdgeTTS(text, VOICE, { rate: '-6%', pitch: '+0Hz', volume: '+0%' })
  const timeoutMs = 45_000
  const result = await Promise.race([
    tts.synthesize(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TTS timeout (¿sin internet?)')), timeoutMs),
    ),
  ])
  return Buffer.from(await result.audio.arrayBuffer())
}

async function main() {
  if (!(await fileExists(weekPath))) {
    console.log('generate-spanish-tts: no data/week.json — skip (copia data/week.example.json)')
    return
  }

  const week = JSON.parse(await readFile(weekPath, 'utf8'))
  const words = [...new Set((week.spanish ?? []).map(normalizeWord).filter(Boolean))]
  if (words.length === 0) {
    console.log('generate-spanish-tts: sin palabras en castellano — skip')
    await copyFile(weekPath, publicWeekPath).catch(() => {})
    return
  }

  await mkdir(outDir, { recursive: true })
  await copyFile(weekPath, publicWeekPath)

  let manifest = { version: MANIFEST_VERSION, voice: VOICE, byWord: {} }
  if (await fileExists(manifestPath)) {
    try {
      manifest = { ...manifest, ...(JSON.parse(await readFile(manifestPath, 'utf8'))) }
      manifest.byWord = manifest.byWord ?? {}
    } catch {
      manifest.byWord = {}
    }
  }

  for (const norm of words) {
    const base = spanishTtsFileKey(norm)
    const filename = `${base}.mp3`
    const outPath = join(outDir, filename)
    manifest.byWord[norm] = filename

    if (await fileExists(outPath) && (await stat(outPath)).size > 200) continue

    process.stdout.write(`TTS es: ${norm}… `)
    try {
      const mp3 = await synthesizeMp3(norm)
      if (mp3.length < 200) throw new Error('audio vacío')
      await writeFile(outPath, mp3)
      console.log('ok')
    } catch (err) {
      console.log('falló')
      console.error(err)
      process.exitCode = 1
    }
    await new Promise((r) => setTimeout(r, 120))
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`generate-spanish-tts: ${words.length} palabras → public/tts/es/`)
}

main()
