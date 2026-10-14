#!/usr/bin/env node
/**
 * edge-tts-browser hardcodes xml:lang='en-US' in SSML, which makes es-ES voices sound Anglo.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const target = join(root, 'node_modules/edge-tts-browser/models/TTS.js')
const marker = '__spellingsEdgeSsmlLocale'

async function main() {
  let src = await readFile(target, 'utf8')
  if (src.includes(marker)) return

  if (!src.includes("xml:lang='en-US'")) {
    console.warn('patch-edge-tts-ssml: pattern not found, skipping')
    return
  }

  const helper = `
  static localeFromVoice(voice) {
    if (!voice || typeof voice !== "string") return "en-US";
    const m = voice.match(/^([a-z]{2}-[A-Z]{2})/);
    return m ? m[1] : "en-US";
  }
`
  if (!src.includes('localeFromVoice')) {
    src = src.replace('export default class TTS {', `export default class TTS {${helper}`)
  }

  src = src.replace(
    "xml:lang='en-US'",
    "xml:lang='${TTS.localeFromVoice(this.voice)}' /* __spellingsEdgeSsmlLocale */",
  )

  await writeFile(target, src)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
