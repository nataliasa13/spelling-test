#!/usr/bin/env node
/**
 * Patches @mintplex-labs/piper-tts-web: multi-speaker id + WASM threads without COOP/COEP.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const target = join(
  root,
  'node_modules/@mintplex-labs/piper-tts-web/dist/piper-tts-web.js',
)

const patches = [
  {
    marker: '__spellingsPiperSpeakerId',
    from: 'const speakerId = 0;',
    to:
      'const speakerId = typeof globalThis !== "undefined" && globalThis.__spellingsPiperSpeakerId != null ? globalThis.__spellingsPiperSpeakerId : 0;',
  },
  {
    marker: '__spellingsPiperWasmThreads',
    from: 'ort.env.wasm.numThreads = navigator.hardwareConcurrency;',
    to:
      'ort.env.wasm.numThreads = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated ? navigator.hardwareConcurrency : 1; /* __spellingsPiperWasmThreads */',
  },
  {
    marker: '__spellingsPiperLengthScale',
    from: 'const lengthScale = __privateGet(this, _modelConfig).inference.length_scale;',
    to:
      'const lengthScale = typeof globalThis !== "undefined" && globalThis.__spellingsPiperLengthScale != null ? globalThis.__spellingsPiperLengthScale : __privateGet(this, _modelConfig).inference.length_scale; /* __spellingsPiperLengthScale */',
  },
  {
    marker: '__spellingsPiperNoiseScale',
    from: 'const noiseScale = __privateGet(this, _modelConfig).inference.noise_scale;',
    to:
      'const noiseScale = typeof globalThis !== "undefined" && globalThis.__spellingsPiperNoiseScale != null ? globalThis.__spellingsPiperNoiseScale : __privateGet(this, _modelConfig).inference.noise_scale; /* __spellingsPiperNoiseScale */',
  },
  {
    marker: '__spellingsPiperVoiceReload',
    from: `    if (_TtsSession._instance) {
      logger == null ? void 0 : logger("Reusing session for TTS!");
      _TtsSession._instance.voiceId = voiceId ?? _TtsSession._instance.voiceId;
      __privateSet(_TtsSession._instance, _progressCallback, progress ?? __privateGet(_TtsSession._instance, _progressCallback));
      return _TtsSession._instance;
    }`,
    to: `    if (_TtsSession._instance) {
      const __spellingsRequestedVoice = voiceId ?? _TtsSession._instance.voiceId;
      if (_TtsSession._instance.voiceId === __spellingsRequestedVoice) {
        logger == null ? void 0 : logger("Reusing session for TTS!");
        _TtsSession._instance.voiceId = __spellingsRequestedVoice;
        __privateSet(_TtsSession._instance, _progressCallback, progress ?? __privateGet(_TtsSession._instance, _progressCallback));
        return _TtsSession._instance;
      }
      _TtsSession._instance = null; /* __spellingsPiperVoiceReload */
    }`,
  },
]

async function main() {
  let src = await readFile(target, 'utf8')
  let changed = false

  for (const { marker, from, to } of patches) {
    if (src.includes(marker)) continue
    if (!src.includes(from)) {
      console.warn(`patch-piper-speaker: pattern not found (${marker}), skip`)
      continue
    }
    src = src.replace(from, to)
    changed = true
  }

  if (changed) {
    await writeFile(target, src)
    console.log('patch-piper-speaker: applied')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
